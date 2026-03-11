"""
Роутер AI-оркестратора — маршрутизация запросов к провайдерам.

Эндпоинты:
  POST /ai-orchestrator/route      — маршрутизация запроса к провайдеру
  POST /ai-orchestrator/synthesize  — синтез ответов от нескольких провайдеров
  GET  /ai-orchestrator/routing-rules — правила маршрутизации
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.db.models.user import User
from app.services.ai_orchestrator import (
    ROUTING_RULES,
    RequestType,
    route_request,
)
from app.services.ai_synthesizer import synthesize_responses

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-orchestrator", tags=["ai-orchestrator"])


# ─── Схемы ───────────────────────────────────────────────────────────────────


class RouteRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    request_type: str | None = Field(
        default=None,
        description="Тип запроса: quick_analysis, chat, document_analysis, "
        "deep_analysis, private, market_overview, calculation",
    )
    prefer_provider: str | None = Field(
        default=None,
        description="Предпочтительный провайдер: groq, gemini, ollama",
    )


class SynthesizeRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    providers: list[str] | None = Field(
        default=None,
        description="Список провайдеров (если не указан — все доступные)",
    )


# ─── Эндпоинты ──────────────────────────────────────────────────────────────


@router.post("/route")
async def orchestrator_route(
    req: RouteRequest,
    _current_user: User = Depends(get_current_user),
):
    """
    Маршрутизация AI-запроса к оптимальному провайдеру.

    Автоматически определяет тип запроса и выбирает провайдера.
    При недоступности основного — fallback на следующий.
    """
    try:
        result = await route_request(
            query=req.query,
            request_type=req.request_type,
            prefer_provider=req.prefer_provider,
        )
        return result
    except Exception as e:
        logger.error("Ошибка маршрутизации: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Ошибка при обработке запроса",
        ) from e


@router.post("/synthesize")
async def orchestrator_synthesize(
    req: SynthesizeRequest,
    _current_user: User = Depends(get_current_user),
):
    """
    Синтез ответов от нескольких AI-провайдеров.

    Отправляет запрос каждому указанному провайдеру,
    дедуплицирует и объединяет ответы в единый результат.
    """
    try:
        result = await synthesize_responses(
            query=req.query,
            provider_names=req.providers,
        )
        return result
    except Exception as e:
        logger.error("Ошибка синтеза: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Ошибка при синтезе ответов",
        ) from e


@router.get("/routing-rules")
async def get_routing_rules(
    _current_user: User = Depends(get_current_user),
):
    """Правила маршрутизации AI-запросов."""
    rules = {}
    for req_type, providers in ROUTING_RULES.items():
        rules[req_type.value] = {
            "providers": [p.value for p in providers],
            "primary": providers[0].value if providers else None,
        }

    return {
        "rules": rules,
        "request_types": [t.value for t in RequestType],
        "description": {
            "quick_analysis": "Быстрый анализ (< 3 сек) → Groq",
            "chat": "Чат и простые вопросы → Groq",
            "document_analysis": "Анализ документов → Gemini",
            "deep_analysis": "Глубокий анализ → Gemini",
            "private": "Конфиденциальные данные → Ollama",
            "market_overview": "Обзор рынка → Groq",
            "calculation": "Расчёты → Groq",
        },
    }
