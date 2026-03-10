"""
AI Gateway — единый вход для мультипровайдерной ИИ-оркестрации.

Эндпоинты:
  POST /ai-gateway/ask      — универсальный запрос (маршрутизация по task_type)
  GET  /ai-gateway/providers — статус провайдеров (Groq, Gemini, Ollama)

Типы задач (task_type):
  general           — общий запрос (Groq → Gemini)
  investment        — инвестиционная рекомендация (Groq → Gemini)
  market_analysis   — анализ рынка (Groq → Gemini)
  due_diligence     — проверка компании (Gemini → Groq)
  document_analysis — анализ документов (Gemini → Groq)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.api.v1.deps import get_current_user
from app.db.models.user import User
from app.services.ai_service import ask_ai_gateway, get_provider_status

router = APIRouter(prefix="/ai-gateway", tags=["ai_gateway"])


# ─── Схемы запросов ──────────────────────────────────────────────────────────

class GatewayAskRequest(BaseModel):
    """Запрос к AI Gateway."""
    question: str = Field(..., min_length=3, max_length=4000, description="Вопрос или запрос")
    context: str = Field("", max_length=8000, description="Дополнительный контекст")
    task_type: str = Field(
        "general",
        description="Тип задачи: general, investment, market_analysis, due_diligence, document_analysis"
    )
    language: str = Field("ru", description="Язык ответа: ru, en, uz")


class GatewayAskResponse(BaseModel):
    """Ответ AI Gateway."""
    answer: str
    provider: str
    model: str
    task_type: str
    fallback_used: bool


# ─── Эндпоинты ───────────────────────────────────────────────────────────────

@router.post("/ask", response_model=GatewayAskResponse)
async def gateway_ask(
    request: GatewayAskRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Универсальный запрос к AI Gateway.

    Автоматически маршрутизирует запрос к оптимальному провайдеру
    по типу задачи. При отказе основного — fallback на резервный.
    """
    valid_types = {"general", "investment", "market_analysis", "due_diligence", "document_analysis"}
    if request.task_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Неизвестный task_type: {request.task_type}. Допустимые: {', '.join(sorted(valid_types))}"
        )

    result = await ask_ai_gateway(
        question=request.question,
        context=request.context,
        task_type=request.task_type,
    )

    return GatewayAskResponse(
        answer=result.get("result", "Не удалось получить ответ"),
        provider=result.get("provider", "unknown"),
        model=result.get("model", "unknown"),
        task_type=request.task_type,
        fallback_used=result.get("fallback_used", False),
    )


@router.get("/providers")
async def gateway_providers(
    current_user: User = Depends(get_current_user),
):
    """
    Статус всех AI-провайдеров.

    Возвращает список провайдеров с информацией о доступности,
    модели и специализации. Полезно для мониторинга и отладки.
    """
    statuses = await get_provider_status()
    return {
        "providers": statuses,
        "total": len(statuses),
        "available": sum(1 for s in statuses if s["available"]),
    }
