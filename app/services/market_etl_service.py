"""
ETL Pipeline для регулярного обновления рыночных данных.
Фаза 4, Сессия 3 — EXCH-ADAPT-001.2.

Процесс:
  1. Extract — вытягивает данные из внешних API
  2. Transform — нормализует формат, вычисляет производные метрики
  3. Load — сохраняет в кэш (market_data_cache)
"""
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from app.db.models.market_adapters import MarketDataSource, MarketDataCache
from app.services.market_data_adapter_service import (
    fetch_quote, fetch_macro, _cache_data, get_source,
)

# Стандартный набор символов и индикаторов
DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA", "META", "JPM"]
DEFAULT_MACRO_INDICATORS = ["GDP", "CPI", "INFLATION", "UNEMPLOYMENT", "FED_RATE"]


def run_etl_job(db: Session, source_id: int, symbols: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Запускает ETL pipeline для указанного источника данных.
    Возвращает статистику выполнения.
    """
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

    # Определяем список символов
    target_symbols = symbols or (source.config or {}).get("symbols", DEFAULT_SYMBOLS)
    provider = source.provider

    # ─── EXTRACT + TRANSFORM + LOAD ──────────────────────────

    # 1. Котировки (для quote-capable провайдеров)
    if provider in ("alpha_vantage", "yahoo_finance", "demo"):
        for sym in target_symbols:
            try:
                result = fetch_quote(db, source_id, sym)
                if result and result.get("price"):
                    records_cached += 1
                symbols_processed += 1
            except Exception as e:
                errors.append(f"Котировка {sym}: {str(e)}")

    # 2. Макроэкономика (для macro-capable провайдеров)
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

    # Обновляем время синхронизации
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

    results = []
    for source in sources:
        result = run_etl_job(db, source.id)
        results.append(result)

    return results


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
