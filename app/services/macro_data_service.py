"""
Сервис макроэкономических данных — интеграция с World Bank API.

Загрузка ключевых индикаторов Узбекистана: ВВП, инфляция,
промышленность, население. Кэширование в БД (MacroIndicator).

API: https://api.worldbank.org/v2/country/UZB/indicator/{code}?format=json
Формат: JSON, без авторизации. Ответ: [meta, data[]]
"""

import logging
from datetime import date
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.db.models.macro_data import MacroIndicator

logger = logging.getLogger(__name__)

WORLDBANK_BASE_URL = "https://api.worldbank.org/v2/country/UZB/indicator"
DEFAULT_TIMEOUT = 15.0
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

# Ключевые макроэкономические индикаторы Узбекистана
INDICATORS = {
    "NY.GDP.MKTP.CD": {"name": "ВВП (текущий, USD)", "unit": "USD"},
    "NY.GDP.MKTP.KD.ZG": {"name": "Рост ВВП", "unit": "%"},
    "FP.CPI.TOTL.ZG": {"name": "Инфляция (потребительские цены)", "unit": "%"},
    "NV.IND.TOTL.ZS": {"name": "Промышленность (% ВВП)", "unit": "%"},
    "SP.POP.TOTL": {"name": "Население", "unit": "человек"},
}


async def fetch_indicator(
    indicator_code: str, per_page: int = 20, use_cache: bool = True
) -> list[dict]:
    """
    Загрузка индикатора с World Bank API (REDIS-001: Redis кэширование, TTL 24h).

    Сначала проверяет Redis-кэш, при промахе — запрос к API.

    Args:
        indicator_code: Код индикатора World Bank (напр. NY.GDP.MKTP.CD).
        per_page: Количество записей на страницу.
        use_cache: Использовать Redis кэш (True по умолчанию).

    Returns:
        Список словарей с полями: indicator_code, indicator_name, value, date, unit.
    """
    from app.services.redis_cache_service import RedisCacheService

    # 1. Проверяем Redis кэш
    if use_cache:
        cached = await RedisCacheService.get_macro_data(indicator_code)
        if cached is not None:
            logger.info("Макроданные %s: из Redis кэша", indicator_code)
            return cached

    # 2. Запрос к API
    url = f"{WORLDBANK_BASE_URL}/{indicator_code}"
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
            logger.warning("Неожиданный формат ответа World Bank для %s", indicator_code)
            return []

        records = data[1]
        if not records:
            return []

        meta = INDICATORS.get(indicator_code, {"name": indicator_code, "unit": ""})

        for item in records:
            value = item.get("value")
            if value is None:
                continue

            results.append({
                "indicator_code": indicator_code,
                "indicator_name": meta["name"],
                "value": float(value),
                "date": item.get("date", ""),
                "unit": meta["unit"],
            })

    except httpx.HTTPStatusError as e:
        logger.error("Ошибка HTTP при загрузке индикатора %s: %s", indicator_code, e)
    except httpx.RequestError as e:
        logger.error("Ошибка подключения к World Bank API: %s", e)
    except Exception as e:
        logger.error("Непредвиденная ошибка при загрузке индикатора %s: %s", indicator_code, e)

    # 3. Сохраняем в Redis кэш (TTL 24h)
    if results and use_cache:
        await RedisCacheService.set_macro_data(indicator_code, results)
        logger.info("Макроданные %s: %d записей закэшировано в Redis", indicator_code, len(results))

    return results


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


async def sync_macro_indicators(db: Session) -> int:
    """
    Синхронизация всех макроиндикаторов с World Bank API.

    Загружает данные по всем индикаторам из INDICATORS и сохраняет
    в таблицу macro_indicators с помощью upsert (обновление существующих записей).

    Args:
        db: Сессия SQLAlchemy.

    Returns:
        Количество сохранённых/обновлённых записей.
    """
    count = 0

    for code in INDICATORS:
        records = await fetch_indicator(code)
        if not records:
            continue

        for rec in records:
            period = _parse_wb_date(rec["date"])

            # Upsert: ищем по (source, indicator_code, period_date)
            existing = db.query(MacroIndicator).filter(
                MacroIndicator.source == "worldbank",
                MacroIndicator.indicator_code == code,
                MacroIndicator.period_date == period,
            ).first()

            if existing:
                existing.value = rec["value"]
                existing.indicator_name = rec["indicator_name"]
                existing.unit = rec["unit"]
            else:
                new_record = MacroIndicator(
                    source="worldbank",
                    indicator_code=code,
                    indicator_name=rec["indicator_name"],
                    value=rec["value"],
                    unit=rec["unit"],
                    period_date=period,
                )
                db.add(new_record)

            count += 1

    db.commit()
    logger.info("Синхронизировано %d макроиндикаторов с World Bank", count)
    return count


def get_indicators(
    db: Session,
    indicator_code: Optional[str] = None,
    limit: int = 50,
) -> list[MacroIndicator]:
    """
    Получить макроиндикаторы из БД.

    Args:
        db: Сессия SQLAlchemy.
        indicator_code: Код индикатора для фильтрации (опционально).
        limit: Максимальное количество записей.

    Returns:
        Список объектов MacroIndicator.
    """
    query = db.query(MacroIndicator).filter(MacroIndicator.source == "worldbank")

    if indicator_code:
        query = query.filter(MacroIndicator.indicator_code == indicator_code)

    return query.order_by(MacroIndicator.period_date.desc()).limit(limit).all()


def get_summary(db: Session) -> dict:
    """
    Получить последние значения всех ключевых индикаторов.

    Для каждого индикатора из INDICATORS находит самую свежую запись в БД.

    Args:
        db: Сессия SQLAlchemy.

    Returns:
        Словарь вида {gdp: {value, date, unit}, inflation: {...}, ...}.
    """
    # Маппинг кодов индикаторов на ключи ответа
    code_to_key = {
        "NY.GDP.MKTP.CD": "gdp",
        "NY.GDP.MKTP.KD.ZG": "gdp_growth",
        "FP.CPI.TOTL.ZG": "inflation",
        "NV.IND.TOTL.ZS": "industry",
        "SP.POP.TOTL": "population",
    }

    summary = {}
    for code, key in code_to_key.items():
        latest = db.query(MacroIndicator).filter(
            MacroIndicator.source == "worldbank",
            MacroIndicator.indicator_code == code,
            MacroIndicator.value.isnot(None),
        ).order_by(MacroIndicator.period_date.desc()).first()

        if latest:
            summary[key] = {
                "value": latest.value,
                "date": latest.period_date.isoformat() if latest.period_date else None,
                "unit": latest.unit,
                "indicator_name": latest.indicator_name,
            }
        else:
            summary[key] = None

    return summary
