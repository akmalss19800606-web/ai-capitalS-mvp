"""
Сервис данных ИПЦ (индекс потребительских цен) — интеграция с World Bank API.

Загрузка данных инфляции Узбекистана: FP.CPI.TOTL.ZG (Inflation, consumer prices, annual %).
Кэширование в БД (CPIRecord).

API: https://api.worldbank.org/v2/country/UZB/indicator/FP.CPI.TOTL.ZG?format=json
"""

import logging
from datetime import date
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.db.models.cpi_data import CPIRecord

logger = logging.getLogger(__name__)

WORLDBANK_BASE_URL = "https://api.worldbank.org/v2/country/UZB/indicator"
CPI_INDICATOR = "FP.CPI.TOTL.ZG"
DEFAULT_TIMEOUT = 15.0
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


def _parse_wb_date(date_str: str) -> date:
    """
    Парсинг даты из World Bank API.

    World Bank возвращает год в виде строки "2024".
    Преобразуем в date(2024, 1, 1).
    """
    try:
        year = int(date_str.strip())
        return date(year, 1, 1)
    except (ValueError, TypeError):
        return date.today()


async def fetch_cpi_from_worldbank(per_page: int = 30) -> list[dict]:
    """
    Загрузка данных ИПЦ с World Bank API.

    Запрашивает индикатор FP.CPI.TOTL.ZG (инфляция, потребительские цены, %)
    для Узбекистана.

    Args:
        per_page: Количество записей на страницу.

    Returns:
        Список словарей с полями: value, date, period_date.
    """
    url = f"{WORLDBANK_BASE_URL}/{CPI_INDICATOR}"
    params = {"format": "json", "per_page": per_page}
    results = []

    try:
        async with httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT, headers=HEADERS, follow_redirects=True
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

        data = response.json()

        # Ответ World Bank: [metadata, data_array]
        if not isinstance(data, list) or len(data) < 2:
            logger.warning("Неожиданный формат ответа World Bank для ИПЦ")
            return []

        records = data[1]
        if not records:
            return []

        for item in records:
            value = item.get("value")
            if value is None:
                continue

            results.append({
                "value": float(value),
                "date": item.get("date", ""),
                "period_date": _parse_wb_date(item.get("date", "")),
            })

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при загрузке ИПЦ: %s", e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения к World Bank API (ИПЦ): %s", e)
    except Exception as e:
        logger.error("Непредвиденная ошибка при загрузке ИПЦ: %s", e)

    return results


async def sync_cpi_data(db: Session) -> int:
    """
    Синхронизация данных ИПЦ в БД.

    Загружает данные с World Bank и сохраняет в таблицу cpi_records
    с помощью upsert (обновление существующих записей).

    Args:
        db: Сессия SQLAlchemy.

    Returns:
        Количество сохранённых/обновлённых записей.
    """
    records = await fetch_cpi_from_worldbank()
    if not records:
        return 0

    count = 0
    for rec in records:
        period = rec["period_date"]

        # Upsert: ищем по (source, region, period_date)
        existing = db.query(CPIRecord).filter(
            CPIRecord.source == "worldbank",
            CPIRecord.region == "Узбекистан",
            CPIRecord.period_date == period,
        ).first()

        if existing:
            existing.value = rec["value"]
            existing.category = "Общий ИПЦ"
        else:
            new_record = CPIRecord(
                region="Узбекистан",
                category="Общий ИПЦ",
                value=rec["value"],
                period_date=period,
                source="worldbank",
            )
            db.add(new_record)

        count += 1

    db.commit()
    logger.info("Синхронизировано %d записей ИПЦ с World Bank", count)
    return count


def get_cpi_data(db: Session, limit: int = 30) -> list[CPIRecord]:
    """
    Получить записи ИПЦ из БД, отсортированные по дате (новые первые).

    Args:
        db: Сессия SQLAlchemy.
        limit: Максимальное количество записей.

    Returns:
        Список объектов CPIRecord.
    """
    return (
        db.query(CPIRecord)
        .filter(CPIRecord.source == "worldbank")
        .order_by(CPIRecord.period_date.desc())
        .limit(limit)
        .all()
    )


def get_current_cpi(db: Session) -> Optional[dict]:
    """
    Получить последнее значение ИПЦ.

    Находит самую свежую запись ИПЦ в БД.

    Args:
        db: Сессия SQLAlchemy.

    Returns:
        Словарь {value, period_date, year, source} или None.
    """
    latest = (
        db.query(CPIRecord)
        .filter(
            CPIRecord.source == "worldbank",
            CPIRecord.value.isnot(None),
        )
        .order_by(CPIRecord.period_date.desc())
        .first()
    )

    if not latest:
        return None

    return {
        "value": latest.value,
        "period_date": latest.period_date.isoformat() if latest.period_date else None,
        "year": latest.period_date.year if latest.period_date else None,
        "source": latest.source,
        "region": latest.region,
        "category": latest.category,
    }


def get_cpi_trend(db: Session, years: int = 10) -> list[dict]:
    """
    Получить тренд ИПЦ за N лет для графика.

    Возвращает список значений ИПЦ за указанное количество лет,
    отсортированный по дате (от старых к новым).

    Args:
        db: Сессия SQLAlchemy.
        years: Количество лет для тренда.

    Returns:
        Список словарей [{year: 2024, value: 10.8}, ...].
    """
    records = (
        db.query(CPIRecord)
        .filter(
            CPIRecord.source == "worldbank",
            CPIRecord.value.isnot(None),
        )
        .order_by(CPIRecord.period_date.desc())
        .limit(years)
        .all()
    )

    # Возвращаем в хронологическом порядке (от старых к новым)
    trend = []
    for rec in reversed(records):
        trend.append({
            "year": rec.period_date.year if rec.period_date else None,
            "value": round(rec.value, 2) if rec.value else None,
        })

    return trend
