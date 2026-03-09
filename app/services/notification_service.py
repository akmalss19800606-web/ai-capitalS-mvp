"""
Сервис уведомлений — in-app notifications.
Фаза 3, Сессия 4 — COLLAB-TEAM-001.5.
"""
import logging
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.collaboration import Notification

logger = logging.getLogger(__name__)


def list_notifications(
    db: Session,
    user_id: int,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Получить уведомления пользователя."""
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)

    total = q.count()
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )
    items = q.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "unread_count": unread_count,
    }


def mark_as_read(db: Session, user_id: int, notification_ids: List[int]) -> int:
    """Пометить уведомления как прочитанные. Возвращает количество обновлённых."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.id.in_(notification_ids),
        )
        .update({"is_read": True}, synchronize_session="fetch")
    )
    db.commit()
    return count


def mark_all_read(db: Session, user_id: int) -> int:
    """Пометить все уведомления пользователя как прочитанные."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({"is_read": True}, synchronize_session="fetch")
    )
    db.commit()
    return count


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    body: Optional[str] = None,
    notification_type: str = "info",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
) -> Notification:
    """Создать уведомление."""
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def delete_notification(db: Session, user_id: int, notification_id: int) -> None:
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
