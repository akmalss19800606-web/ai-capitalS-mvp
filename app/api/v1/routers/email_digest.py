"""
Роутер Email-дайджестов — управление подпиской и ручная отправка.

Эндпоинты:
  POST /api/v1/email/send-digest — ручная отправка дайджеста (admin)
  POST /api/v1/email/test — тестовое письмо
  GET  /api/v1/email/settings — настройки email текущего пользователя
  PUT  /api/v1/email/settings — обновить настройки email
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services.email_service import (
    send_email,
    send_daily_digest,
    send_welcome_email,
)

router = APIRouter(prefix="/email", tags=["email"])


# ─── Схемы ───────────────────────────────────────────────────────────

class EmailSettingsResponse(BaseModel):
    digest_enabled: bool = False
    digest_frequency: str = "daily"  # daily | weekly | off
    notify_decision_status: bool = True
    notify_portfolio_alerts: bool = True
    notify_ai_insights: bool = False

class EmailSettingsUpdate(BaseModel):
    digest_enabled: Optional[bool] = None
    digest_frequency: Optional[str] = None
    notify_decision_status: Optional[bool] = None
    notify_portfolio_alerts: Optional[bool] = None
    notify_ai_insights: Optional[bool] = None

class SendTestRequest(BaseModel):
    to_email: Optional[str] = None

class SendDigestRequest(BaseModel):
    user_id: Optional[int] = None  # None = текущий пользователь


# ─── Эндпоинты ───────────────────────────────────────────────────────

@router.get("/settings", response_model=EmailSettingsResponse)
async def get_email_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить настройки email-уведомлений."""
    # В MVP настройки хранятся в JSON-поле preferences
    # Если preferences не содержит email — возвращаем дефолты
    prefs = {}
    if hasattr(current_user, "preferences") and current_user.preferences:
        prefs = current_user.preferences if isinstance(current_user.preferences, dict) else {}

    email_prefs = prefs.get("email", {})
    return EmailSettingsResponse(
        digest_enabled=email_prefs.get("digest_enabled", False),
        digest_frequency=email_prefs.get("digest_frequency", "daily"),
        notify_decision_status=email_prefs.get("notify_decision_status", True),
        notify_portfolio_alerts=email_prefs.get("notify_portfolio_alerts", True),
        notify_ai_insights=email_prefs.get("notify_ai_insights", False),
    )


@router.put("/settings", response_model=EmailSettingsResponse)
async def update_email_settings(
    data: EmailSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Обновить настройки email-уведомлений."""
    prefs = {}
    if hasattr(current_user, "preferences") and current_user.preferences:
        prefs = current_user.preferences if isinstance(current_user.preferences, dict) else {}

    email_prefs = prefs.get("email", {})

    if data.digest_enabled is not None:
        email_prefs["digest_enabled"] = data.digest_enabled
    if data.digest_frequency is not None:
        if data.digest_frequency not in ("daily", "weekly", "off"):
            raise HTTPException(400, "digest_frequency должен быть daily/weekly/off")
        email_prefs["digest_frequency"] = data.digest_frequency
    if data.notify_decision_status is not None:
        email_prefs["notify_decision_status"] = data.notify_decision_status
    if data.notify_portfolio_alerts is not None:
        email_prefs["notify_portfolio_alerts"] = data.notify_portfolio_alerts
    if data.notify_ai_insights is not None:
        email_prefs["notify_ai_insights"] = data.notify_ai_insights

    prefs["email"] = email_prefs

    try:
        current_user.preferences = prefs
        db.commit()
    except Exception:
        db.rollback()

    return EmailSettingsResponse(**email_prefs)


@router.post("/test")
async def send_test_email(
    data: SendTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Отправить тестовое письмо."""
    to = data.to_email or current_user.email
    if not to:
        raise HTTPException(400, "Email адрес не указан")

    success = send_email(
        to_email=to,
        subject="AI Capital — Тестовое письмо",
        html_body="""
        <html><body style="font-family:Arial,sans-serif;">
        <div style="background:#1a2332; padding:20px; text-align:center;">
            <h1 style="color:#fff;">AI Capital</h1>
        </div>
        <div style="padding:20px;">
            <h2>Тестовое письмо</h2>
            <p>Email-сервис работает корректно.</p>
            <p>Дата: {}</p>
        </div>
        </body></html>
        """,
    )

    if success:
        return {"status": "sent", "to": to}
    else:
        return {"status": "smtp_not_configured", "message": "SMTP не настроен в .env. Добавьте SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD."}


@router.post("/send-digest")
async def send_digest_manual(
    data: SendDigestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ручная отправка дайджеста (для тестирования)."""
    target_user = current_user
    if data.user_id and data.user_id != current_user.id:
        if not getattr(current_user, "is_superuser", False):
            raise HTTPException(403, "Только admin может отправлять дайджесты другим")
        target_user = db.query(User).filter(User.id == data.user_id).first()
        if not target_user:
            raise HTTPException(404, "Пользователь не найден")

    user_name = getattr(target_user, "full_name", None) or target_user.email.split("@")[0]

    success = send_daily_digest(
        to_email=target_user.email,
        user_name=user_name,
        decisions_changed=[
            {"title": "Пример решения", "new_status": "Approved", "changed_by": "Система"},
        ],
        portfolio_alerts=[],
        ai_insights=[
            {"provider": "groq", "summary": "IT-сектор Узбекистана показывает рост 15% в Q1 2026"},
        ],
    )

    if success:
        return {"status": "sent", "to": target_user.email}
    else:
        return {"status": "smtp_not_configured", "message": "SMTP не настроен в .env"}
