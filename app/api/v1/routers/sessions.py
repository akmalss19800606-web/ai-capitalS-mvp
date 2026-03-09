"""
Роутер управления сессиями пользователей.
Фаза 3, Сессия 3 — COLLAB-AUTH-001.4.

Эндпоинты:
  GET   /auth/sessions         — список активных сессий
  POST  /auth/sessions/{id}/logout — принудительное завершение сессии
  POST  /auth/sessions/logout-all  — завершить все сессии кроме текущей
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services import session_service

router = APIRouter(prefix="/auth/sessions", tags=["sessions"])


# ── Schemas ──

class SessionItem(BaseModel):
    id: int
    ip_address: str
    device_info: str
    last_activity: str
    created_at: str
    expires_at: str
    is_current: bool

class SessionListResponse(BaseModel):
    sessions: List[SessionItem]
    total: int


# ── Endpoints ──

@router.get("", response_model=SessionListResponse)
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить список активных сессий текущего пользователя."""
    sessions = session_service.get_user_sessions(db, current_user.id)
    return SessionListResponse(
        sessions=[SessionItem(**s) for s in sessions],
        total=len(sessions),
    )


@router.post("/{session_id}/logout")
def force_logout(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Принудительно завершить конкретную сессию."""
    ok = session_service.force_logout_session(db, session_id, current_user.id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сессия не найдена или уже завершена.",
        )
    return {"message": "Сессия завершена"}


@router.post("/logout-all")
def logout_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Завершить все сессии кроме текущей."""
    count = session_service.force_logout_all(db, current_user.id)
    return {"message": f"Завершено {count} сессий", "terminated": count}
