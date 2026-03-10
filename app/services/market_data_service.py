"""
Единый сервис рыночных данных: адаптеры, ETL, котировки.

Объединяет функциональность:
  - Адаптеры (Alpha Vantage, Yahoo Finance, World Bank)
  - ETL pipeline для регулярного обновления
  - Простой API котировок для AI-роутера

Интерфейс:
  - fetch_quote(db, source_id, symbol) — котировка через адаптер
  - fetch_macro(db, source_id, indicator, country) — макроданные
  - get_stock_price(symbol) — упрощённый async API
  - get_market_overview(symbols) — обзор рынка
  - run_etl_job(db, source_id) — ETL pipeline
  - run_etl_all_sources(db, user_id) — ETL для всех источников
"""
import asyncio
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

import httpx
from sqlalchemy.orm import Session

from app.db.models.market_adapters import MarketDataSource, MarketDataCache

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"

# ─── Демо-данные для fallback ─────────────────────────────────
DEMO_QUOTES = {
    "AAPL": {"price": 263.75, "change": "-0.97", "change_percent": "-0.37%", "volume": "38020971"},
    "MSFT": {"price": 415.20, "change": "+3.50", "change_percent": "+0.85%", "volume": "22100000"},
    "GOOGL": {"price": 172.45, "change": "+2.10", "change_percent": "+1.24%", "volume": "18500000"},
    "TSLA": {"price": 248.30, "change": "-5.20", "change_percent": "-2.05%", "volume": "55000000"},
    "AMZN": {"price": 198.60, "change": "+1.80", "change_percent": "+0.91%", "volume": "31000000"},
    "NVDA": {"price": 875.40, "change": "+12.30", "change_percent": "+1.43%", "volume": "42000000"},
    "META": {"price": 505.15, "change": "+5.60", "change_percent": "+1.12%", "volume": "15600000"},
    "JPM": {"price": 198.90, "change": "+1.20", "change_percent": "+0.61%", "volume": "9500000"},
}

DEMO_MACRO = {
    "GDP": {"value": 25462.7, "unit": "млрд USD", "period": "2024-Q4", "country": "US"},
    "CPI": {"value": 314.69, "unit": "индекс", "period": "2025-01", "country": "US"},
    "INFLATION": {"value": 2.9, "unit": "%", "period": "2025-01", "country": "US"},
    "UNEMPLOYMENT": {"value": 4.1, "unit": "%", "period": "2025-01", "country": "US"},
    "FED_RATE": {"value": 4.50, "unit": "%", "period": "2025-03", "country": "US"},
}

# Стандартный набор символов и индикаторов (для ETL)
DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA", "META", "JPM"]
DEFAULT_MACRO_INDICATORS = ["GDP", "CPI", "INFLATION", "UNEMPLOYMENT", "FED_RATE"]


# ═══════════════════════════════════════════════════════════════
# CRUD для источников данных
# ═══════════════════════════════════════════════════════════════

def create_source(db: Session, user_id: int, **kwargs) -> MarketDataSource:
    source = MarketDataSource(user_id=user_id, **kwargs)
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def list_sources(db: Session, user_id: int) -> List[MarketDataSource]:
    return db.query(MarketDataSource).filter(
        MarketDataSource.user_id == user_id
    ).order_by(MarketDataSource.created_at.desc()).all()


def get_source(db: Session, source_id: int) -> Optional[MarketDataSource]:
    return db.query(MarketDataSource).filter(MarketDataSource.id == source_id).first()


def update_source(db: Session, source_id: int, **kwargs) -> Optional[MarketDataSource]:
    source = get_source(db, source_id)
    if not source:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(source, k, v)
    db.commit()
    db.refresh(source)
    return source


def delete_source(db: Session, source_id: int):
    source = get_source(db, source_id)
    if source:
        db.delete(source)
        db.commit()


# ═══════════════════════════════════════════════════════════════
# АДАПТЕР: Котировки (через DB-источники)
# ═══════════════════════════════════════════════════════════════

def fetch_quote(db: Session, source_id: int, symbol: str) -> Dict[str, Any]:
    """Получить текущую котировку символа."""
    symbol = symbol.upper()
    source = get_source(db, source_id) if source_id else None
    provider = source.provider if source else "demo"
    api_key = source.api_key if source else ALPHA_VANTAGE_KEY

    cached = _get_cached(db, source_id, symbol, "quote", ttl_minutes=5)
    if cached:
        return cached

    result = None
    if provider == "alpha_vantage":
        result = _alpha_vantage_quote(symbol, api_key)
    elif provider == "yahoo_finance":
        result = _yahoo_finance_quote(symbol)
    else:
        result = _demo_quote(symbol)

    if result and source_id:
        _cache_data(db, source_id, symbol, "quote", result, ttl_minutes=5)

    return result or _demo_quote(symbol)


def fetch_macro(db: Session, source_id: int, indicator: str, country: str = "US") -> Dict[str, Any]:
    """Получить макроэкономический индикатор."""
    indicator = indicator.upper()

    cached = _get_cached(db, source_id, f"{indicator}_{country}", "macro", ttl_minutes=60)
    if cached:
        return cached

    source = get_source(db, source_id) if source_id else None
    provider = source.provider if source else "demo"

    result = None
    if provider == "world_bank":
        result = _world_bank_macro(indicator, country)
    elif provider == "alpha_vantage":
        result = _alpha_vantage_macro(indicator, source.api_key if source else ALPHA_VANTAGE_KEY)
    else:
        result = _demo_macro(indicator, country)

    if result and source_id:
        _cache_data(db, source_id, f"{indicator}_{country}", "macro", result, ttl_minutes=60)

    return result or _demo_macro(indicator, country)


def list_cached_data(db: Session, source_id: int, data_type: Optional[str] = None, limit: int = 50) -> List[MarketDataCache]:
    """Список кэшированных записей."""
    q = db.query(MarketDataCache).filter(MarketDataCache.source_id == source_id)
    if data_type:
        q = q.filter(MarketDataCache.data_type == data_type)
    return q.order_by(MarketDataCache.fetched_at.desc()).limit(limit).all()


# ═══════════════════════════════════════════════════════════════
# Простой async API (для AI-роутера)
# ═══════════════════════════════════════════════════════════════

async def get_stock_price(symbol: str) -> dict:
    """Упрощённый async API для получения котировки."""
    try:
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": ALPHA_VANTAGE_KEY,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(ALPHA_VANTAGE_URL, params=params, timeout=10)
        data = response.json()

        if "Note" in data or "Information" in data:
            d = DEMO_QUOTES.get(symbol.upper())
            if d:
                return {
                    "symbol": symbol.upper(),
                    "price": d["price"],
                    "change": d["change"],
                    "change_percent": d["change_percent"],
                    "volume": d["volume"],
                    "note": "Demo data (API limit reached)",
                }
            return {"symbol": symbol, "price": None, "error": "API limit reached or symbol not found"}

        quote = data.get("Global Quote", {})
        if not quote:
            return {"symbol": symbol, "price": None, "error": "Symbol not found"}

        return {
            "symbol": symbol,
            "price": float(quote.get("05. price", 0)),
            "change": quote.get("09. change", "0"),
            "change_percent": quote.get("10. change percent", "0%"),
            "volume": quote.get("06. volume", "0"),
        }
    except Exception as e:
        return {"symbol": symbol, "price": None, "error": str(e)}


async def get_market_overview(symbols: list) -> list:
    """Обзор рынка: котировки нескольких символов параллельно."""
    tasks = [get_stock_price(s) for s in symbols]
    return await asyncio.gather(*tasks)


# ═══════════════════════════════════════════════════════════════
# Внутренние адаптеры
# ═══════════════════════════════════════════════════════════════

async def _alpha_vantage_quote(symbol: str, api_key: str) -> Optional[Dict]:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(ALPHA_VANTAGE_URL, params={
                "function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": api_key
            }, timeout=10)
        data = r.json()
        if "Note" in data or "Information" in data:
            return _demo_quote(symbol)
        quote = data.get("Global Quote", {})
        if not quote:
            return _demo_quote(symbol)
        return {
            "symbol": symbol,
            "price": float(quote.get("05. price", 0)),
            "change": quote.get("09. change", "0"),
            "change_percent": quote.get("10. change percent", "0%"),
            "volume": quote.get("06. volume", "0"),
            "source": "alpha_vantage",
        }
    except Exception:
        return _demo_quote(symbol)


def _yahoo_finance_quote(symbol: str) -> Optional[Dict]:
    """Yahoo Finance (MVP fallback на демо)."""
    return _demo_quote(symbol, source="yahoo_finance")


async def _world_bank_macro(indicator: str, country: str) -> Optional[Dict]:
    """World Bank API для макроэкономических индикаторов."""
    indicator_map = {
        "GDP": "NY.GDP.MKTP.CD",
        "CPI": "FP.CPI.TOTL",
        "INFLATION": "FP.CPI.TOTL.ZG",
        "UNEMPLOYMENT": "SL.UEM.TOTL.ZS",
    }
    wb_id = indicator_map.get(indicator)
    if not wb_id:
        return _demo_macro(indicator, country)
    try:
        url = f"https://api.worldbank.org/v2/country/{country}/indicator/{wb_id}?format=json&per_page=5&date=2020:2025"
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=10)
        data = r.json()
        if len(data) < 2 or not data[1]:
            return _demo_macro(indicator, country)
        records = [{"year": d["date"], "value": d["value"]} for d in data[1] if d["value"] is not None]
        latest = records[0] if records else None
        return {
            "indicator": indicator,
            "country": country,
            "value": latest["value"] if latest else None,
            "period": latest["year"] if latest else None,
            "unit": "varies",
            "source": "world_bank",
            "data": records[:5],
        }
    except Exception:
        return _demo_macro(indicator, country)


async def _alpha_vantage_macro(indicator: str, api_key: str) -> Optional[Dict]:
    """Alpha Vantage economic indicators."""
    func_map = {
        "GDP": "REAL_GDP",
        "CPI": "CPI",
        "INFLATION": "INFLATION",
        "UNEMPLOYMENT": "UNEMPLOYMENT",
        "FED_RATE": "FEDERAL_FUNDS_RATE",
    }
    av_func = func_map.get(indicator)
    if not av_func:
        return _demo_macro(indicator, "US")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(ALPHA_VANTAGE_URL, params={
                "function": av_func, "apikey": api_key
            }, timeout=10)
        data = r.json()
        if "Note" in data or "Information" in data:
            return _demo_macro(indicator, "US")
        records = data.get("data", [])[:5]
        latest = records[0] if records else {}
        return {
            "indicator": indicator,
            "country": "US",
            "value": float(latest.get("value", 0)) if latest.get("value") != "." else None,
            "period": latest.get("date", ""),
            "unit": data.get("unit", ""),
            "source": "alpha_vantage",
            "data": [{"year": r.get("date"), "value": r.get("value")} for r in records],
        }
    except Exception:
        return _demo_macro(indicator, "US")


def _demo_quote(symbol: str, source: str = "demo") -> Dict:
    d = DEMO_QUOTES.get(symbol, {"price": 100.00, "change": "+0.50", "change_percent": "+0.50%", "volume": "1000000"})
    return {"symbol": symbol, "source": source, **d}


def _demo_macro(indicator: str, country: str) -> Dict:
    d = DEMO_MACRO.get(indicator, {"value": 0, "unit": "N/A", "period": "N/A", "country": country})
    return {"indicator": indicator, "source": "demo", **d}


# ═══════════════════════════════════════════════════════════════
# Кэширование (DB)
# ═══════════════════════════════════════════════════════════════

def _get_cached(db: Session, source_id: Optional[int], symbol: str, data_type: str, ttl_minutes: int = 5) -> Optional[Dict]:
    if not source_id:
        return None
    now = datetime.now(timezone.utc)
    entry = db.query(MarketDataCache).filter(
        MarketDataCache.source_id == source_id,
        MarketDataCache.symbol == symbol,
        MarketDataCache.data_type == data_type,
    ).order_by(MarketDataCache.fetched_at.desc()).first()
    if entry and entry.fetched_at and (now - entry.fetched_at.replace(tzinfo=timezone.utc)) < timedelta(minutes=ttl_minutes):
        return entry.data
    return None


def _cache_data(db: Session, source_id: int, symbol: str, data_type: str, data: Dict, ttl_minutes: int = 5):
    now = datetime.now(timezone.utc)
    entry = MarketDataCache(
        source_id=source_id,
        symbol=symbol,
        data_type=data_type,
        data=data,
        fetched_at=now,
        expires_at=now + timedelta(minutes=ttl_minutes),
    )
    db.add(entry)
    db.commit()


# ═══════════════════════════════════════════════════════════════
# ETL Pipeline
# ═══════════════════════════════════════════════════════════════

def run_etl_job(db: Session, source_id: int, symbols: Optional[List[str]] = None) -> Dict[str, Any]:
    """Запускает ETL pipeline для указанного источника данных."""
    start_time = time.time()
    started_at = datetime.now(timezone.utc)
    errors: List[str] = []
    records_cached = 0
    symbols_processed = 0

    source = get_source(db, source_id)
    if not source:
        return {
            "source_id": source_id,
            "provider": "unknown",
            "symbols_processed": 0,
            "records_cached": 0,
            "errors": ["Источник данных не найден"],
            "duration_seconds": 0,
            "started_at": started_at.isoformat(),
            "completed_at": started_at.isoformat(),
        }

    target_symbols = symbols or (source.config or {}).get("symbols", DEFAULT_SYMBOLS)
    provider = source.provider

    if provider in ("alpha_vantage", "yahoo_finance", "demo"):
        for sym in target_symbols:
            try:
                result = fetch_quote(db, source_id, sym)
                if result and result.get("price"):
                    records_cached += 1
                symbols_processed += 1
            except Exception as e:
                errors.append(f"Котировка {sym}: {str(e)}")

    if provider in ("world_bank", "alpha_vantage", "demo"):
        indicators = (source.config or {}).get("indicators", DEFAULT_MACRO_INDICATORS)
        country = (source.config or {}).get("country", "US")
        for ind in indicators:
            try:
                result = fetch_macro(db, source_id, ind, country)
                if result and result.get("value") is not None:
                    records_cached += 1
                symbols_processed += 1
            except Exception as e:
                errors.append(f"Макро {ind}: {str(e)}")

    source.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    completed_at = datetime.now(timezone.utc)
    duration = time.time() - start_time

    return {
        "source_id": source_id,
        "provider": provider,
        "symbols_processed": symbols_processed,
        "records_cached": records_cached,
        "errors": errors,
        "duration_seconds": round(duration, 2),
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
    }


def run_etl_all_sources(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Запускает ETL для всех активных источников пользователя."""
    sources = db.query(MarketDataSource).filter(
        MarketDataSource.user_id == user_id,
        MarketDataSource.is_active == True,
    ).all()
    return [run_etl_job(db, source.id) for source in sources]


def get_etl_status(db: Session, user_id: int) -> Dict[str, Any]:
    """Статус ETL: последняя синхронизация по каждому источнику."""
    sources = db.query(MarketDataSource).filter(
        MarketDataSource.user_id == user_id,
    ).all()

    statuses = []
    for s in sources:
        cache_count = db.query(MarketDataCache).filter(
            MarketDataCache.source_id == s.id
        ).count()
        statuses.append({
            "source_id": s.id,
            "name": s.name,
            "provider": s.provider,
            "is_active": s.is_active,
            "last_sync_at": s.last_sync_at.isoformat() if s.last_sync_at else None,
            "sync_interval_minutes": s.sync_interval_minutes,
            "cached_records": cache_count,
        })

    return {
        "total_sources": len(sources),
        "active_sources": sum(1 for s in sources if s.is_active),
        "sources": statuses,
    }


def cleanup_expired_cache(db: Session, source_id: Optional[int] = None) -> int:
    """Удаляет просроченные записи кэша."""
    now = datetime.now(timezone.utc)
    q = db.query(MarketDataCache).filter(
        MarketDataCache.expires_at != None,
        MarketDataCache.expires_at < now,
    )
    if source_id:
        q = q.filter(MarketDataCache.source_id == source_id)
    count = q.count()
    q.delete(synchronize_session=False)
    db.commit()
    return count
