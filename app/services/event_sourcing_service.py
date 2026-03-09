"""
Сервис Event Sourcing (9.2.2).
Иммутабельная история изменений через событийную модель.

Принципы:
- События НИКОГДА не удаляются и не обновляются
- Текущее состояние агрегата = проекция всех событий
- Каждое событие фиксирует previous_state и new_state
- Correlation ID связывает события одной бизнес-операции
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.models.architectural_principles import SystemEvent


def generate_correlation_id() -> str:
    """Генерация уникального correlation ID для связи событий."""
    return f"corr-{uuid.uuid4().hex[:12]}"


def emit_event(
    db: Session,
    user_id: int,
    aggregate_type: str,
    aggregate_id: int,
    event_type: str,
    event_data: Optional[Dict[str, Any]] = None,
    previous_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None,
    correlation_id: Optional[str] = None,
    causation_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> SystemEvent:
    """
    Запись нового события.
    Автоматически определяет версию агрегата.
    """
    # Определяем следующую версию агрегата
    max_version = db.query(func.max(SystemEvent.version)).filter(
        SystemEvent.aggregate_type == aggregate_type,
        SystemEvent.aggregate_id == aggregate_id,
    ).scalar() or 0

    event = SystemEvent(
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        event_type=event_type,
        event_data=event_data,
        previous_state=previous_state,
        new_state=new_state,
        user_id=user_id,
        correlation_id=correlation_id or generate_correlation_id(),
        causation_id=causation_id,
        metadata_=metadata,
        version=max_version + 1,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_aggregate_events(
    db: Session,
    aggregate_type: str,
    aggregate_id: int,
    limit: int = 100,
    offset: int = 0,
) -> List[SystemEvent]:
    """Получить все события агрегата в хронологическом порядке."""
    return (
        db.query(SystemEvent)
        .filter(
            SystemEvent.aggregate_type == aggregate_type,
            SystemEvent.aggregate_id == aggregate_id,
        )
        .order_by(SystemEvent.version.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_aggregate_state(
    db: Session,
    aggregate_type: str,
    aggregate_id: int,
) -> Dict[str, Any]:
    """
    Проекция текущего состояния агрегата из его событий.
    Берём new_state последнего события.
    """
    last_event = (
        db.query(SystemEvent)
        .filter(
            SystemEvent.aggregate_type == aggregate_type,
            SystemEvent.aggregate_id == aggregate_id,
        )
        .order_by(desc(SystemEvent.version))
        .first()
    )

    if not last_event:
        return {
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "current_state": None,
            "version": 0,
            "event_count": 0,
            "last_event_at": None,
        }

    event_count = (
        db.query(func.count(SystemEvent.id))
        .filter(
            SystemEvent.aggregate_type == aggregate_type,
            SystemEvent.aggregate_id == aggregate_id,
        )
        .scalar()
    )

    return {
        "aggregate_type": aggregate_type,
        "aggregate_id": aggregate_id,
        "current_state": last_event.new_state,
        "version": last_event.version,
        "event_count": event_count,
        "last_event_at": last_event.created_at,
    }


def get_events_timeline(
    db: Session,
    user_id: Optional[int] = None,
    aggregate_type: Optional[str] = None,
    event_type: Optional[str] = None,
    correlation_id: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """Получить временну́ю шкалу событий с фильтрами."""
    q = db.query(SystemEvent)

    if user_id is not None:
        q = q.filter(SystemEvent.user_id == user_id)
    if aggregate_type:
        q = q.filter(SystemEvent.aggregate_type == aggregate_type)
    if event_type:
        q = q.filter(SystemEvent.event_type == event_type)
    if correlation_id:
        q = q.filter(SystemEvent.correlation_id == correlation_id)

    total = q.count()
    events = q.order_by(desc(SystemEvent.created_at)).limit(limit).all()

    return {"total_events": total, "events": events}


def get_event_stats(db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Статистика по событиям."""
    q = db.query(SystemEvent)
    if user_id is not None:
        q = q.filter(SystemEvent.user_id == user_id)

    total = q.count()

    # По типам агрегатов
    by_aggregate = {}
    rows = (
        db.query(SystemEvent.aggregate_type, func.count(SystemEvent.id))
        .group_by(SystemEvent.aggregate_type)
    )
    if user_id is not None:
        rows = rows.filter(SystemEvent.user_id == user_id)
    for atype, cnt in rows.all():
        by_aggregate[atype] = cnt

    # По типам событий
    by_event_type = {}
    rows2 = (
        db.query(SystemEvent.event_type, func.count(SystemEvent.id))
        .group_by(SystemEvent.event_type)
    )
    if user_id is not None:
        rows2 = rows2.filter(SystemEvent.user_id == user_id)
    for etype, cnt in rows2.all():
        by_event_type[etype] = cnt

    # Последние 24 часа
    since = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    today_count = q.filter(SystemEvent.created_at >= since).count()

    return {
        "total_events": total,
        "events_today": today_count,
        "by_aggregate_type": by_aggregate,
        "by_event_type": by_event_type,
    }
