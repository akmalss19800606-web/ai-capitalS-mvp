from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision, DecisionStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated dashboard data for the main panel."""
    # Portfolio stats
    portfolios = db.query(Portfolio).filter(Portfolio.owner_id == current_user.id).all()
    total_value = sum(p.total_value or 0 for p in portfolios)
    portfolio_count = len(portfolios)

    # Decision stats
    decisions = db.query(InvestmentDecision).filter(
        InvestmentDecision.created_by == current_user.id
    ).all()
    total_decisions = len(decisions)
    active_decisions = sum(1 for d in decisions if d.status in [
        DecisionStatus.DRAFT, DecisionStatus.REVIEW, DecisionStatus.IN_PROGRESS
    ])
    
    # Decisions by status
    status_counts = {}
    for d in decisions:
        status_counts[d.status.value if hasattr(d.status, 'value') else d.status] = \
            status_counts.get(d.status.value if hasattr(d.status, 'value') else d.status, 0) + 1

    # Decisions by type
    type_counts = {}
    for d in decisions:
        dtype = d.decision_type.value if hasattr(d.decision_type, 'value') else d.decision_type
        type_counts[dtype] = type_counts.get(dtype, 0) + 1

    # Recent decisions (last 5)
    recent = sorted(decisions, key=lambda x: x.created_at or '', reverse=True)[:5]
    recent_list = [
        {
            "id": d.id,
            "asset_name": d.asset_name,
            "asset_symbol": d.asset_symbol,
            "decision_type": d.decision_type.value if hasattr(d.decision_type, 'value') else d.decision_type,
            "amount": d.amount,
            "price": d.price,
            "status": d.status.value if hasattr(d.status, 'value') else d.status,
            "portfolio_id": d.portfolio_id,
            "created_at": str(d.created_at) if d.created_at else None,
        }
        for d in recent
    ]

    return {
        "total_portfolio_value": total_value,
        "portfolio_count": portfolio_count,
        "total_decisions": total_decisions,
        "active_decisions": active_decisions,
        "status_counts": status_counts,
        "type_counts": type_counts,
        "recent_decisions": recent_list,
        "portfolios": [
            {
                "id": p.id,
                "name": p.name,
                "total_value": p.total_value or 0,
            }
            for p in portfolios
        ],
    }
