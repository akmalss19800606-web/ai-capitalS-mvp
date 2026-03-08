"""
Роутер: Уведомления.
Фаза 3, Сессия 4 — COLLAB-TEAM-001.5.

Эндпоинты:
  GET    /notifications          — список уведомлений
  POST   /notifications/read     — пометить как прочитанные
  POST   /notifications/read-all — пометить все как прочитанные
  DELETE /notifications/{id}     — удалить уведомление
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.schemas.collaboration import NotificationResponse, NotificationMarkRead
from app.services.notification_service import (
    list_notifications, mark_as_read, mark_all_read, delete_notification,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def api_list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить уведомления текущего пользователя."""
    result = list_notifications(db, current_user.id, unread_only=unread_only, limit=limit, offset=offset)
    return {
        "items": [
            {
                "id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "body": n.body,
                "notification_type": n.notification_type,
                "entity_type": n.entity_type,
                "entity_id": n.entity_id,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in result["items"]
        ],
        "total": result["total"],
        "unread_count": result["unread_count"],
    }


@router.post("/read")
def api_mark_read(
    req: NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Пометить указанные уведомления как прочитанные."""
    count = mark_as_read(db, current_user.id, req.notification_ids)
    return {"marked": count}


@router.post("/read-all")
def api_mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Пометить все уведомления как прочитанные."""
    count = mark_all_read(db, current_user.id)
    return {"marked": count}


@router.delete("/{notification_id}")
def api_delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить уведомление."""
    delete_notification(db, current_user.id, notification_id)
    return {"ok": True}
