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
