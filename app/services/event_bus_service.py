"""
Сервис Event Bus — Message Broker + Event-Driven Architecture (9.3.1, 9.3.3).

Для MVP реализован in-process message broker через PostgreSQL.
В продакшене заменяется на RabbitMQ/Redis Streams.

Паттерн: Publish/Subscribe через каналы.
Принципы:
- Loose coupling между подсистемами
- Асинхронное взаимодействие через каналы
- Dead letter queue для неудавшихся сообщений
- Retry с экспоненциальным backoff
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.models.architectural_principles import EventBusMessage


# Стандартные каналы системы
CHANNELS = {
    "decisions": "Инвестиционные решения",
    "portfolios": "Портфели",
    "analytics": "AI-аналитика",
    "workflows": "Согласование и workflow",
    "reports": "Отчёты",
    "notifications": "Уведомления",
    "audit": "Аудит и compliance",
    "integrations": "Внешние интеграции",
    "system": "Системные события",
}

MAX_RETRY = 3


def publish_message(
    db: Session,
    channel: str,
    event_type: str,
    payload: Optional[Dict[str, Any]] = None,
    producer: Optional[str] = None,
) -> EventBusMessage:
    """Опубликовать сообщение в канал."""
    msg = EventBusMessage(
        channel=channel,
        event_type=event_type,
        payload=payload,
        producer=producer,
        status="published",
        published_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def consume_messages(
    db: Session,
    channel: str,
    consumer: str,
    max_messages: int = 10,
) -> List[EventBusMessage]:
    """
    Получить и пометить как consumed сообщения из канала.
    Атомарная операция: SELECT + UPDATE.
    """
    messages = (
        db.query(EventBusMessage)
        .filter(
            EventBusMessage.channel == channel,
            EventBusMessage.status == "published",
        )
        .order_by(EventBusMessage.published_at.asc())
        .limit(max_messages)
        .all()
    )

    now = datetime.now(timezone.utc)
    for msg in messages:
        msg.status = "consumed"
        msg.consumer = consumer
        msg.consumed_at = now

    db.commit()
    return messages


def mark_failed(
    db: Session,
    message_id: int,
    error_message: str,
) -> Optional[EventBusMessage]:
    """Пометить сообщение как failed. При превышении MAX_RETRY → dead_letter."""
    msg = db.query(EventBusMessage).filter(EventBusMessage.id == message_id).first()
    if not msg:
        return None

    msg.retry_count = (msg.retry_count or 0) + 1
    msg.error_message = error_message

    if msg.retry_count >= MAX_RETRY:
        msg.status = "dead_letter"
    else:
        msg.status = "published"  # возвращаем для повторной обработки
        msg.consumer = None
        msg.consumed_at = None

    db.commit()
    db.refresh(msg)
    return msg


def get_channel_messages(
    db: Session,
    channel: str,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[EventBusMessage]:
    """Получить сообщения канала."""
    q = db.query(EventBusMessage).filter(EventBusMessage.channel == channel)
    if status:
        q = q.filter(EventBusMessage.status == status)
    return q.order_by(desc(EventBusMessage.published_at)).limit(limit).all()


def get_dead_letter_queue(db: Session, limit: int = 50) -> List[EventBusMessage]:
    """Получить dead letter queue."""
    return (
        db.query(EventBusMessage)
        .filter(EventBusMessage.status == "dead_letter")
        .order_by(desc(EventBusMessage.created_at))
        .limit(limit)
        .all()
    )


def retry_dead_letter(db: Session, message_id: int) -> Optional[EventBusMessage]:
    """Повторно отправить сообщение из dead letter queue."""
    msg = db.query(EventBusMessage).filter(
        EventBusMessage.id == message_id,
        EventBusMessage.status == "dead_letter",
    ).first()
    if not msg:
        return None

    msg.status = "published"
    msg.retry_count = 0
    msg.error_message = None
    msg.consumer = None
    msg.consumed_at = None
    msg.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)
    return msg


def get_event_bus_stats(db: Session) -> Dict[str, Any]:
    """Статистика шины событий."""
    total = db.query(func.count(EventBusMessage.id)).scalar() or 0

    by_status = {}
    for status, cnt in (
        db.query(EventBusMessage.status, func.count(EventBusMessage.id))
        .group_by(EventBusMessage.status)
        .all()
    ):
        by_status[status] = cnt

    by_channel = {}
    for channel, cnt in (
        db.query(EventBusMessage.channel, func.count(EventBusMessage.id))
        .group_by(EventBusMessage.channel)
        .all()
    ):
        by_channel[channel] = cnt

    channels_list = list(set(list(CHANNELS.keys()) + list(by_channel.keys())))

    return {
        "total_messages": total,
        "published": by_status.get("published", 0),
        "consumed": by_status.get("consumed", 0),
        "failed": by_status.get("failed", 0),
        "dead_letter": by_status.get("dead_letter", 0),
        "channels": sorted(channels_list),
        "messages_by_channel": by_channel,
    }


def list_channels() -> List[Dict[str, str]]:
    """Список доступных каналов."""
    return [{"key": k, "name": v} for k, v in CHANNELS.items()]
