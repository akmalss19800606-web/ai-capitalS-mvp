from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.services.ai_service import get_investment_recommendation
from app.services.market_service import get_stock_price, get_market_overview

router = APIRouter(prefix="/ai", tags=["ai"])

class RecommendationRequest(BaseModel):
    asset_name: str
    asset_symbol: str
    current_price: float
    portfolio_id: int

class MarketRequest(BaseModel):
    symbols: List[str]

@router.post("/recommend")
def get_recommendation(
    request: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == request.portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    recommendation = get_investment_recommendation(
        asset_name=request.asset_name,
        asset_symbol=request.asset_symbol,
        current_price=request.current_price,
        portfolio_value=portfolio.total_value
    )
    return {
        "asset": request.asset_symbol,
        "recommendation": recommendation,
        "portfolio_id": request.portfolio_id
    }

@router.get("/market/{symbol}")
def get_market_data(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    data = get_stock_price(symbol.upper())
    return data

@router.post("/market/overview")
def get_market_data_bulk(
    request: MarketRequest,
    current_user: User = Depends(get_current_user)
):
    symbols = [s.upper() for s in request.symbols]
    return get_market_overview(symbols)

class MarketAnalysisRequest(BaseModel):
    query: str
    language: str = "ru"

@router.post("/market-analysis")
def analyze_local_market(
    request: MarketAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_service import get_groq_client
    client = get_groq_client()
    prompt = f"""Ты опытный инвестиционный аналитик, специализирующийся на рынках Узбекистана и Центральной Азии.
Пользователь спрашивает о: {request.query}

Предоставь детальный инвестиционный анализ СТРОГО НА РУССКОМ ЯЗЫКЕ, включая:
1. Текущий обзор рынка
2. Уровни цен (приблизительно)
3. Инвестиционный потенциал (ВЫСОКИЙ/СРЕДНИЙ/НИЗКИЙ)
4. Ключевые риски
5. Рекомендация: ИНВЕСТИРОВАТЬ / ЖДАТЬ / ИЗБЕГАТЬ

Будь конкретным и практичным для условий рынка Узбекистана. Отвечай ТОЛЬКО на русском языке."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "Ты профессиональный инвестиционный аналитик. Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800
    )
    return {
        "query": request.query,
        "analysis": response.choices[0].message.content
    }

class DueDiligenceRequest(BaseModel):
    company_name: str
    industry: str = ""
    country: str = "Uzbekistan"

@router.post("/due-diligence")
def due_diligence_check(
    request: DueDiligenceRequest,
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_service import get_groq_client
    client = get_groq_client()
    prompt = f"""Ты опытный финансовый аналитик по соответствию нормативным требованиям, специализирующийся на рынках Центральной Азии.

Проведи анализ для инвестиционного Due Diligence:
Компания/Отрасль: {request.company_name}
Сектор: {request.industry}
Страна: {request.country}

Предоставь структурированный отчёт due diligence СТРОГО НА РУССКОМ ЯЗЫКЕ по следующим разделам:

1. ФИНАНСОВАЯ ПРОЗРАЧНОСТЬ (0-100 баллов)
   - Доступность финансовой отчётности
   - Признаки теневой деятельности
   - Налоговая дисциплина

2. РЕГУЛЯТОРНЫЕ РИСКИ (0-100 баллов)
   - Соответствие законодательству Узбекистана
   - Лицензирование и разрешения
   - Государственное регулирование отрасли

3. РЫНОЧНАЯ РЕПУТАЦИЯ (0-100 баллов)
   - Присутствие на рынке
   - Конкурентная среда
   - Деловая репутация

4. ESG ОЦЕНКА (0-100 баллов)
   - Экологические риски
   - Социальная ответственность
   - Корпоративное управление

5. ИТОГОВЫЙ ВЕРДИКТ
   - Общий скоринг (0-100)
   - Статус: НАДЁЖНО (75-100) / ОСТОРОЖНО (40-74) / ВЫСОКИЙ РИСК (0-39)
   - Рекомендация для инвестора

Отвечай ТОЛЬКО на русском языке. Будь конкретным."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "Ты профессиональный финансовый аналитик. Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке. Никогда не используй английский язык."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000
    )

    analysis = response.choices[0].message.content

    # Определяем статус из текста
    status = "ОСТОРОЖНО"
    analysis_upper = analysis.upper()
    if "НАДЁЖНО" in analysis_upper or "НАДЕЖНО" in analysis_upper or "TRUSTED" in analysis_upper:
        status = "НАДЁЖНО"
    elif "ВЫСОКИЙ РИСК" in analysis_upper or "HIGH RISK" in analysis_upper:
        status = "ВЫСОКИЙ РИСК"

    return {
        "company": request.company_name,
        "industry": request.industry,
        "status": status,
        "analysis": analysis
    }
