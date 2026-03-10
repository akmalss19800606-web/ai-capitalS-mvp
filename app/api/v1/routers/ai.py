"""
AI-роутер — инвестиционные рекомендации, анализ рынка, Due Diligence, AI Gateway.
Phase 1 REF-002: merged ai.py + ai_gateway.py

Использует мультипровайдерный ai_service для оркестрации:
Groq (быстрый анализ) → Gemini (мультимодальный) → Ollama (приватный).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.services.ai_service import (
    get_investment_recommendation,
    analyze_market,
    due_diligence_check,
    ask_ai_gateway,
    get_provider_status,
)

# ══════════════════════════════════════════════════════════════════
#  Router 1: /ai — Рекомендации, рынок, Due Diligence
# ══════════════════════════════════════════════════════════════════
router = APIRouter(prefix="/ai", tags=["ai"])


# ─── Схемы ───────────────────────────────────────────────────────────────────

class RecommendationRequest(BaseModel):
    asset_name: str
    asset_symbol: str
    current_price: float
    portfolio_id: int


class MarketRequest(BaseModel):
    symbols: List[str]


class MarketAnalysisRequest(BaseModel):
    query: str
    language: str = "ru"


class DueDiligenceRequest(BaseModel):
    company_name: str
    industry: str = ""
    country: str = "Uzbekistan"


# ─── Эндпоинты /ai ──────────────────────────────────────────────────────────

@router.post("/recommend")
async def get_recommendation(
    request: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI-рекомендация КУПИТЬ/ПРОДАТЬ/ДЕРЖАТЬ для актива."""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == request.portfolio_id,
        Portfolio.owner_id == current_user.id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Портфель не найден")

    result = await get_investment_recommendation(
        asset_name=request.asset_name,
        asset_symbol=request.asset_symbol,
        current_price=request.current_price,
        portfolio_value=portfolio.total_value,
    )

    return {
        "asset": request.asset_symbol,
        "recommendation": result.get("result", ""),
        "portfolio_id": request.portfolio_id,
        "provider": result.get("provider", "unknown"),
        "model": result.get("model", "unknown"),
    }


@router.get("/market/{symbol}")
async def get_market_data(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """Рыночные данные по символу (Alpha Vantage). Async."""
    from app.services.market_service import get_stock_price
    data = await get_stock_price(symbol.upper())
    return data


@router.post("/market/overview")
async def get_market_data_bulk(
    request: MarketRequest,
    current_user: User = Depends(get_current_user),
):
    """Обзор рынка по списку символов. Async."""
    from app.services.market_service import get_market_overview
    symbols = [s.upper() for s in request.symbols]
    return await get_market_overview(symbols)


@router.post("/market-analysis")
async def analyze_local_market(
    request: MarketAnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    """AI-анализ рынка Узбекистана и Центральной Азии."""
    result = await analyze_market(
        query=request.query,
        language=request.language,
    )

    return {
        "query": request.query,
        "analysis": result.get("result", ""),
        "provider": result.get("provider", "unknown"),
        "model": result.get("model", "unknown"),
        "fallback_used": result.get("fallback_used", False),
    }


@router.post("/due-diligence")
async def due_diligence(
    request: DueDiligenceRequest,
    current_user: User = Depends(get_current_user),
):
    """AI Due Diligence — проверка компании."""
    result = await due_diligence_check(
        company_name=request.company_name,
        industry=request.industry,
        country=request.country,
    )

    return {
        "company": request.company_name,
        "industry": request.industry,
        "status": result.get("status", "ОСТОРОЖНО"),
        "analysis": result.get("result", ""),
        "provider": result.get("provider", "unknown"),
        "model": result.get("model", "unknown"),
        "fallback_used": result.get("fallback_used", False),
    }


# ══════════════════════════════════════════════════════════════════
#  Router 2: /ai-gateway — AI Gateway (мультипровайдер)
# ══════════════════════════════════════════════════════════════════
gateway_router = APIRouter(prefix="/ai-gateway", tags=["ai-gateway"])


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


@gateway_router.post("/ask", response_model=GatewayAskResponse)
async def gateway_ask(
    request: GatewayAskRequest,
    current_user: User = Depends(get_current_user),
):
    """Универсальный запрос к AI Gateway."""
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


@gateway_router.get("/providers")
async def gateway_providers(
    current_user: User = Depends(get_current_user),
):
    """Статус всех AI-провайдеров."""
    statuses = await get_provider_status()
    return {
        "providers": statuses,
        "total": len(statuses),
        "available": sum(1 for s in statuses if s["available"]),
    }
