"""
Роутер XAI (Explainable AI) — объяснимость инвестиционных решений.

Эндпоинты:
  POST /xai/analyze   — анализ факторов и рекомендация
  GET  /xai/factors    — список доступных факторов
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.db.models.user import User
from app.services.xai_service import (
    INVESTMENT_FACTORS,
    SECTOR_ADJUSTMENTS,
    analyze_explainability,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/xai", tags=["xai"])


# ─── Схемы ───────────────────────────────────────────────────────────────────


class XAIAnalyzeRequest(BaseModel):
    sector: str = Field(default="general", description="Сектор экономики")
    investment_amount: float = Field(default=10000, ge=100, le=10_000_000)
    time_horizon_years: int = Field(default=3, ge=1, le=30)
    language: str = Field(default="ru", pattern="^(ru|en)$")
    analysis_type: str = Field(
        default="investment",
        description="Тип анализа: investment, risk, sector",
    )


# ─── Эндпоинты ──────────────────────────────────────────────────────────────


@router.post("/analyze")
async def xai_analyze(
    req: XAIAnalyzeRequest,
    _current_user: User = Depends(get_current_user),
):
    """
    XAI-анализ инвестиционного решения.

    Возвращает:
    - Факторы с весами и процентом важности
    - Уровень уверенности (0-100%)
    - Рекомендацию (ИНВЕСТИРОВАТЬ / ОСТОРОЖНО / ВОЗДЕРЖАТЬСЯ)
    """
    try:
        result = await analyze_explainability(
            sector=req.sector,
            investment_amount=req.investment_amount,
            time_horizon_years=req.time_horizon_years,
            language=req.language,
            analysis_type=req.analysis_type,
        )
        return result
    except Exception as e:
        logger.error("XAI анализ ошибка: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Ошибка при выполнении XAI-анализа",
        ) from e


@router.get("/factors")
async def xai_factors(
    _current_user: User = Depends(get_current_user),
):
    """Список доступных факторов и секторов для XAI-анализа."""
    return {
        "factors": [
            {
                "key": f["key"],
                "name_ru": f["name_ru"],
                "name_en": f["name_en"],
                "category": f["category"],
                "base_weight": f["base_weight"],
            }
            for f in INVESTMENT_FACTORS
        ],
        "sectors": list(SECTOR_ADJUSTMENTS.keys()),
        "categories": ["market", "risk", "operational", "macro", "financial"],
    }
