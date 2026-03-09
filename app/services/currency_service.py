"""
Сервис курсов валют — интеграция с ЦБ Узбекистана (cbu.uz).
Этап 0, Сессия 0.2 — Валюта UZS.

API: https://cbu.uz/ru/arkhiv-kursov-valyut/json/
Формат: JSON, без авторизации.
"""
import logging
from datetime import date, datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.db.models.currency_rate import CurrencyRate

logger = logging.getLogger(__name__)

CBU_API_URL = "https://cbu.uz/ru/arkhiv-kursov-valyut/json/"

# Ключевые валюты для отображения
KEY_CURRENCIES = ["USD", "EUR", "RUB", "GBP", "JPY", "CNY", "KRW", "CHF", "KZT", "TRY"]


def fetch_rates_from_cbu(target_date: Optional[date] = None) -> list[dict]:
    """
    Получить курсы валют с cbu.uz.
    Если target_date не указан — берёт текущие курсы.
    Возвращает список словарей с полями: Ccy, CcyNm_RU, CcyNm_UZ, Nominal, Rate, Diff, Date.
    """
    if target_date:
        url = f"{CBU_API_URL}{target_date.strftime('%Y-%m-%d')}/"
    else:
        url = CBU_API_URL

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Ошибка загрузки курсов с cbu.uz: {e}")
        return []
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при загрузке курсов: {e}")
        return []


def sync_rates_to_db(db: Session, target_date: Optional[date] = None) -> int:
    """
    Загрузить курсы с cbu.uz и сохранить в БД.
    Возвращает количество сохранённых/обновлённых записей.
    """
    raw_rates = fetch_rates_from_cbu(target_date)
    if not raw_rates:
        return 0

    count = 0
    for item in raw_rates:
        code = item.get("Ccy", "").strip()
        if not code:
            continue

        rate_date_str = item.get("Date", "")
        try:
            rate_date = datetime.strptime(rate_date_str, "%d.%m.%Y").date()
        except ValueError:
            rate_date = target_date or date.today()

        # Upsert: обновить если уже есть
        existing = db.query(CurrencyRate).filter(
            CurrencyRate.code == code,
            CurrencyRate.rate_date == rate_date,
        ).first()

        rate_value = float(item.get("Rate", "0").replace(",", "."))
        diff_value = float(item.get("Diff", "0").replace(",", "."))
        nominal = int(item.get("Nominal", "1"))

        if existing:
            existing.rate = rate_value
            existing.diff = diff_value
            existing.nominal = nominal
            existing.ccy_name_ru = item.get("CcyNm_RU", "")
            existing.ccy_name_uz = item.get("CcyNm_UZ", "")
        else:
            new_rate = CurrencyRate(
                code=code,
                ccy_name_ru=item.get("CcyNm_RU", ""),
                ccy_name_uz=item.get("CcyNm_UZ", ""),
                nominal=nominal,
                rate=rate_value,
                diff=diff_value,
                rate_date=rate_date,
            )
            db.add(new_rate)

        count += 1

    db.commit()
    logger.info(f"Синхронизировано {count} курсов валют за {target_date or 'сегодня'}")
    return count


def get_latest_rates(db: Session, codes: Optional[list[str]] = None) -> list[CurrencyRate]:
    """
    Получить последние курсы из БД.
    Если codes указаны — фильтрует по ним.
    """
    # Находим самую свежую дату в БД
    latest_date = db.query(CurrencyRate.rate_date).order_by(
        CurrencyRate.rate_date.desc()
    ).first()

    if not latest_date:
        return []

    query = db.query(CurrencyRate).filter(
        CurrencyRate.rate_date == latest_date[0]
    )

    if codes:
        query = query.filter(CurrencyRate.code.in_(codes))

    return query.order_by(CurrencyRate.code).all()


def get_rate_for_currency(db: Session, code: str) -> Optional[CurrencyRate]:
    """Получить последний курс конкретной валюты."""
    return db.query(CurrencyRate).filter(
        CurrencyRate.code == code.upper()
    ).order_by(CurrencyRate.rate_date.desc()).first()


def convert_to_uzs(db: Session, amount: float, from_currency: str) -> Optional[dict]:
    """
    Конвертировать сумму в UZS.
    Возвращает dict с result, rate, rate_date.
    """
    if from_currency.upper() == "UZS":
        return {"result": amount, "rate": 1.0, "rate_date": date.today()}

    rate_obj = get_rate_for_currency(db, from_currency)
    if not rate_obj:
        return None

    # rate — курс за nominal единиц валюты
    rate_per_unit = rate_obj.rate / rate_obj.nominal
    result = amount * rate_per_unit

    return {
        "result": round(result, 2),
        "rate": rate_per_unit,
        "rate_date": rate_obj.rate_date,
    }


def convert_from_uzs(db: Session, amount_uzs: float, to_currency: str) -> Optional[dict]:
    """Конвертировать сумму из UZS в другую валюту."""
    if to_currency.upper() == "UZS":
        return {"result": amount_uzs, "rate": 1.0, "rate_date": date.today()}

    rate_obj = get_rate_for_currency(db, to_currency)
    if not rate_obj:
        return None

    rate_per_unit = rate_obj.rate / rate_obj.nominal
    result = amount_uzs / rate_per_unit

    return {
        "result": round(result, 2),
        "rate": rate_per_unit,
        "rate_date": rate_obj.rate_date,
    }


def format_uzs(amount: float) -> str:
    """
    Форматирование суммы в UZS.
    Пример: 1250000.5 -> '1 250 000,50 UZS'
    """
    # Разделяем целую и дробную часть
    integer_part = int(amount)
    decimal_part = round(amount - integer_part, 2)

    # Форматируем с пробелами как разделитель тысяч
    formatted_int = f"{integer_part:,}".replace(",", " ")

    # Дробная часть с запятой (узбекский/русский стандарт)
    decimal_str = f"{decimal_part:.2f}"[1:]  # .50 -> ,50
    decimal_str = decimal_str.replace(".", ",")

    return f"{formatted_int}{decimal_str} UZS"
