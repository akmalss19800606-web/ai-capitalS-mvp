"""
Роутер контактов — Фаза 3, ABOUT-001.

Эндпоинты:
  - POST /contacts/submit — отправка контактной формы
  - GET  /contacts/info — информация о компании
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# ── Схемы ─────────────────────────────────────────────────────


class ContactFormRequest(BaseModel):
    """Данные контактной формы."""
    name: str = Field(..., min_length=2, max_length=100, description="Имя отправителя")
    email: EmailStr = Field(..., description="Email для обратной связи")
    subject: str = Field(..., min_length=2, max_length=200, description="Тема обращения")
    message: str = Field(..., min_length=10, max_length=5000, description="Текст сообщения")


class ContactFormResponse(BaseModel):
    """Ответ на отправку формы."""
    status: str
    message: str
    reference_id: str


# ── Информация о компании ─────────────────────────────────────

COMPANY_INFO = {
    "company_name": "AI Capital Management",
    "legal_name": "Толиев Акмал Идиевич (ИП)",
    "registration": "Свидетельство №009932",
    "phone": "+998 98 739 01 98",
    "email": "atom2014@bk.ru",
    "address": "Узбекистан, г. Ташкент",
    "working_hours": "Пн-Пт: 09:00 - 18:00 (UZT, UTC+5)",
    "website": "https://ai-capital.uz",
    "telegram": "@ai_capital_uz",
    "description": (
        "AI Capital Management — платформа для управления инвестициями "
        "с использованием искусственного интеллекта. "
        "Due Diligence, портфельная аналитика, AI-рекомендации."
    ),
}

# Хранилище обращений (для MVP — in-memory + логирование)
_contact_submissions: list[dict] = []


# ── Эндпоинты ─────────────────────────────────────────────────


@router.post(
    "/submit",
    response_model=ContactFormResponse,
    summary="Отправка контактной формы",
)
async def submit_contact_form(body: ContactFormRequest):
    """
    Приём обращения из контактной формы.

    Для MVP: логирует обращение и сохраняет в памяти.
    В продакшне: отправка email/Telegram уведомления, запись в БД.
    """
    now = datetime.now(timezone.utc)
    ref_id = f"REQ-{now.strftime('%Y%m%d%H%M%S')}-{len(_contact_submissions)+1:04d}"

    submission = {
        "reference_id": ref_id,
        "name": body.name,
        "email": body.email,
        "subject": body.subject,
        "message": body.message,
        "submitted_at": now.isoformat(),
        "status": "received",
    }

    _contact_submissions.append(submission)

    logger.info(
        "Новое обращение %s от %s <%s>: %s",
        ref_id, body.name, body.email, body.subject,
    )

    return ContactFormResponse(
        status="success",
        message="Сообщение получено. Мы свяжемся с вами в ближайшее время.",
        reference_id=ref_id,
    )


@router.get("/info", summary="Контактная информация компании")
async def get_company_info():
    """
    Возвращает контактные данные AI Capital Management.
    """
    return COMPANY_INFO
