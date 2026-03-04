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
    prompt = f"""You are an expert investment analyst specializing in Uzbekistan and Central Asian markets.
The user is asking about: {request.query}

Please provide a detailed investment analysis in Russian language including:
1. Current market overview
2. Price levels (approximate)
3. Investment potential (HIGH/MEDIUM/LOW)
4. Key risks
5. Recommendation: INVEST / WAIT / AVOID

Be specific and practical for Uzbekistan market conditions."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
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
    prompt = f"""You are an expert financial compliance analyst specializing in Central Asian markets.

Analyze the following for investment due diligence:
Company/Industry: {request.company_name}
Sector: {request.industry}
Country: {request.country}

Provide a structured due diligence report in Russian with the following sections:

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
   - Статус: TRUSTED (75-100) / CAUTION (40-74) / HIGH RISK (0-39)
   - Рекомендация для инвестора

Be specific and practical."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000
    )

    analysis = response.choices[0].message.content

    # Определяем статус из текста
    status = "CAUTION"
    if "TRUSTED" in analysis.upper():
        status = "TRUSTED"
    elif "HIGH RISK" in analysis.upper():
        status = "HIGH RISK"

    return {
        "company": request.company_name,
        "industry": request.industry,
        "status": status,
        "analysis": analysis
    }
