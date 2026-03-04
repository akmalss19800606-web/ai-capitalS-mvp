from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision
from app.schemas.investment_decision import DecisionCreate, DecisionRead

router = APIRouter(prefix="/decisions", tags=["decisions"])

@router.post("/", response_model=DecisionRead, status_code=status.HTTP_201_CREATED)
def create_decision(
    decision_in: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == decision_in.portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    decision = InvestmentDecision(**decision_in.dict())
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision

@router.get("/portfolio/{portfolio_id}", response_model=List[DecisionRead])
def get_decisions_by_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return db.query(InvestmentDecision).filter(
        InvestmentDecision.portfolio_id == portfolio_id
    ).all()

@router.get("/{decision_id}", response_model=DecisionRead)
def get_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = db.query(InvestmentDecision).filter(
        InvestmentDecision.id == decision_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == decision.portfolio_id,
        Portfolio.owner_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=403, detail="Access denied")
    return decision
