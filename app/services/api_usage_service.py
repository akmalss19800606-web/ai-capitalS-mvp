"""
Сервис мониторинга использования API.
Фаза 4, Сессия 2 — EXCH-GW-001.4.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from sqlalchemy import func, case, extract
from sqlalchemy.orm import Session

from app.db.models.api_gateway import ApiUsageLog

logger = logging.getLogger(__name__)


def log_request(
    db: Session,
    user_id: int | None,
    api_key_id: int | None,
    method: str,
    path: str,
    status_code: int,
    response_time_ms: float | None,
    ip_address: str | None,
    user_agent: str | None = None,
) -> None:
    """Записать запрос в лог."""
    entry = ApiUsageLog(
        user_id=user_id,
        api_key_id=api_key_id,
        method=method,
        path=path,
        status_code=status_code,
        response_time_ms=response_time_ms,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    db.commit()


def get_usage_summary(db: Session, user_id: int | None = None) -> Dict[str, Any]:
    """Агрегированная статистика использования API (EXCH-GW-001.4)."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    base_q = db.query(ApiUsageLog)
    if user_id:
        base_q = base_q.filter(ApiUsageLog.user_id == user_id)

    # Общее количество
    total = base_q.count()

    # Сегодня
    today_count = base_q.filter(ApiUsageLog.created_at >= today_start).count()

    # На этой неделе
    week_count = base_q.filter(ApiUsageLog.created_at >= week_start).count()

    # Средний response time
    avg_rt = base_q.with_entities(
        func.avg(ApiUsageLog.response_time_ms)
    ).scalar() or 0.0

    # Процент ошибок (4xx + 5xx)
    error_count = base_q.filter(ApiUsageLog.status_code >= 400).count()
    error_rate = (error_count / total * 100) if total > 0 else 0.0

    # Топ-10 эндпоинтов
    top_endpoints_q = (
        base_q.with_entities(
            ApiUsageLog.path,
            ApiUsageLog.method,
            func.count().label("count"),
        )
        .group_by(ApiUsageLog.path, ApiUsageLog.method)
        .order_by(func.count().desc())
        .limit(10)
        .all()
    )
    top_endpoints = [
        {"path": r.path, "method": r.method, "count": r.count}
        for r in top_endpoints_q
    ]

    # По методу
    method_q = (
        base_q.with_entities(
            ApiUsageLog.method,
            func.count().label("count"),
        )
        .group_by(ApiUsageLog.method)
        .all()
    )
    by_method = {r.method: r.count for r in method_q}

    # По часам (последние 24 часа)
    last_24h = now - timedelta(hours=24)
    hours_q = (
        base_q.filter(ApiUsageLog.created_at >= last_24h)
        .with_entities(
            extract("hour", ApiUsageLog.created_at).label("hour"),
            func.count().label("count"),
        )
        .group_by(extract("hour", ApiUsageLog.created_at))
        .order_by(extract("hour", ApiUsageLog.created_at))
        .all()
    )
    by_hour = [{"hour": int(r.hour), "count": r.count} for r in hours_q]

    return {
        "total_requests": total,
        "requests_today": today_count,
        "requests_this_week": week_count,
        "avg_response_time_ms": round(avg_rt, 2),
        "error_rate_pct": round(error_rate, 2),
        "top_endpoints": top_endpoints,
        "requests_by_method": by_method,
        "requests_by_hour": by_hour,
    }


def list_recent_logs(
    db: Session,
    user_id: int | None = None,
    limit: int = 100,
) -> List[ApiUsageLog]:
    """Последние записи лога."""
    q = db.query(ApiUsageLog)
    if user_id:
        q = q.filter(ApiUsageLog.user_id == user_id)
    return q.order_by(ApiUsageLog.created_at.desc()).limit(limit).all()
