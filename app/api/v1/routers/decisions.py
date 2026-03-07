from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision, DecisionStatus

router = APIRouter(prefix="/decisions", tags=["decisions"])

# ─── Schemas ────────────────────────────────────────────
class DecisionCreate(BaseModel):
    asset_name: str
    asset_symbol: str
    decision_type: str
    amount: float
    price: float
    portfolio_id: int
    notes: Optional[str] = None

class DecisionStatusUpdate(BaseModel):
    status: DecisionStatus

class DecisionRead(BaseModel):
    id: int
    asset_name: str
    asset_symbol: str
    decision_type: str
    amount: float
    price: float
    ai_recommendation: Optional[str] = None
    notes: Optional[str] = None
    status: str
    portfolio_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Endpoints ───────────────────────────────────────────

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

    decision = InvestmentDecision(
        **decision_in.dict(),
        status=DecisionStatus.DRAFT,
        created_by=current_user.id
    )
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
        InvestmentDecision.id == decision_id,
        InvestmentDecision.created_by == current_user.id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.patch("/{decision_id}/status", response_model=DecisionRead)
def update_decision_status(
    decision_id: int,
    status_update: DecisionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Изменить статус: draft → review → approved → in_progress → completed"""
    decision = db.query(InvestmentDecision).filter(
        InvestmentDecision.id == decision_id,
        InvestmentDecision.created_by == current_user.id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Разрешённые переходы статусов
    allowed_transitions = {
        DecisionStatus.DRAFT: [DecisionStatus.REVIEW],
        DecisionStatus.REVIEW: [DecisionStatus.APPROVED, DecisionStatus.DRAFT],
        DecisionStatus.APPROVED: [DecisionStatus.IN_PROGRESS, DecisionStatus.REVIEW],
        DecisionStatus.IN_PROGRESS: [DecisionStatus.COMPLETED],
        DecisionStatus.COMPLETED: [],
    }

    current_status = DecisionStatus(decision.status)
    new_status = status_update.status

    if new_status not in allowed_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Нельзя перейти из '{current_status.value}' в '{new_status.value}'"
        )

    decision.status = new_status
    db.commit()
    db.refresh(decision)
    return decision


@router.put("/{decision_id}", response_model=DecisionRead)
def update_decision(
    decision_id: int,
    decision_in: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = db.query(InvestmentDecision).filter(
        InvestmentDecision.id == decision_id,
        InvestmentDecision.created_by == current_user.id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    if decision.status not in [DecisionStatus.DRAFT, DecisionStatus.REVIEW]:
        raise HTTPException(
            status_code=400,
            detail="Редактировать можно только решения со статусом Draft или Review"
        )
    for key, value in decision_in.dict().items():
        setattr(decision, key, value)
    db.commit()
    db.refresh(decision)
    return decision


@router.delete("/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = db.query(InvestmentDecision).filter(
        InvestmentDecision.id == decision_id,
        InvestmentDecision.created_by == current_user.id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    if decision.status == DecisionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Нельзя удалить завершённое решение")
    db.delete(decision)
    db.commit()
