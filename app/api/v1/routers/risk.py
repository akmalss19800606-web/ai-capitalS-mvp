"""
risk.py — Tasks 121-135: Risk scoring and investment analysis endpoints.
"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.db.session import get_db
from app.services.risk_scoring_service import (
    score_concentration_risk,
    score_performance_risk,
    compute_composite_risk_score,
    generate_investment_recommendations,
    score_single_investment,
)

router = APIRouter(prefix="/risk", tags=["Risk Analysis"])


@router.get("/concentration")
def concentration_risk(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 121-123: Portfolio concentration risk (HHI-based)."""
    return score_concentration_risk(db, portfolio_id)


@router.get("/performance")
def performance_risk(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 124-126: Investment performance risk score."""
    return score_performance_risk(db, portfolio_id)


@router.get("/composite")
def composite_risk(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 127-130: Weighted composite risk score."""
    return compute_composite_risk_score(db, portfolio_id)


@router.get("/recommendations")
def investment_recommendations(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 131-133: AI-generated investment recommendations."""
    return generate_investment_recommendations(db, portfolio_id)


@router.post("/score-investment")
def score_investment(
    investment: Dict[str, Any] = Body(..., example={
        'asset_name': 'Tesla Inc',
        'category': 'equity',
        'geography': 'US',
        'status': 'active',
        'total_value': 500000,
    }),
):
    """Task 134-135: Score a single investment decision."""
    return score_single_investment(investment)
