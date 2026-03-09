from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import (
    DecisionCategory,
    DecisionPriority,
    DecisionStatus,
    DecisionType,
    InvestmentDecision,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# GET /dashboard/summary — main dashboard panel with aggregated data
# Phase 1: extended with priority, category, geography breakdowns and totals
# ---------------------------------------------------------------------------
@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated dashboard data for the main panel (Phase 1 — extended stats)."""

    # --- Portfolio stats ---
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.owner_id == current_user.id)
        .all()
    )
    total_portfolio_value = sum(p.total_value or 0 for p in portfolios)
    portfolio_count = len(portfolios)

    # --- Decisions ---
    decisions = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.created_by == current_user.id)
        .all()
    )
    total_decisions = len(decisions)

    # Active = not yet finished or rejected
    active_statuses = {
        DecisionStatus.DRAFT,
        DecisionStatus.REVIEW,
        DecisionStatus.APPROVED,
        DecisionStatus.IN_PROGRESS,
    }
    active_decisions = sum(1 for d in decisions if d.status in active_statuses)

    # Total investment value (sum of amount * price)
    total_investment_value = sum(d.total_value or 0.0 for d in decisions)

    # --- Decisions by status ---
    status_counts: dict = {s.value: 0 for s in DecisionStatus}
    for d in decisions:
        key = d.status.value if hasattr(d.status, "value") else d.status
        status_counts[key] = status_counts.get(key, 0) + 1

    # --- Decisions by type ---
    type_counts: dict = {t.value: 0 for t in DecisionType}
    for d in decisions:
        key = d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type
        type_counts[key] = type_counts.get(key, 0) + 1

    # --- Decisions by priority (Phase 1 new field) ---
    priority_counts: dict = {p.value: 0 for p in DecisionPriority}
    for d in decisions:
        if d.priority is not None:
            key = d.priority.value if hasattr(d.priority, "value") else d.priority
            priority_counts[key] = priority_counts.get(key, 0) + 1

    # --- Decisions by category (Phase 1 new field) ---
    category_counts: dict = {c.value: 0 for c in DecisionCategory}
    for d in decisions:
        if d.category is not None:
            key = d.category.value if hasattr(d.category, "value") else d.category
            category_counts[key] = category_counts.get(key, 0) + 1

    # --- Decisions by geography (Phase 1 new field) ---
    geography_counts: dict = {}
    for d in decisions:
        if d.geography:
            geography_counts[d.geography] = geography_counts.get(d.geography, 0) + 1

    # --- Recent decisions (last 5, sorted by created_at desc) ---
    recent = sorted(
        decisions,
        key=lambda x: x.created_at or "",
        reverse=True,
    )[:5]

    recent_list = [
        {
            "id": d.id,
            "asset_name": d.asset_name,
            "asset_symbol": d.asset_symbol,
            "decision_type": d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type,
            "amount": d.amount,
            "price": d.price,
            "total_value": d.total_value,
            "status": d.status.value if hasattr(d.status, "value") else d.status,
            "priority": d.priority.value if hasattr(d.priority, "value") else d.priority,
            "category": d.category.value if hasattr(d.category, "value") else d.category,
            "geography": d.geography,
            "portfolio_id": d.portfolio_id,
            "created_at": str(d.created_at) if d.created_at else None,
        }
        for d in recent
    ]

    # --- High-priority & critical decisions requiring attention ---
    high_priority_decisions = [
        d for d in decisions
        if d.priority in (DecisionPriority.HIGH, DecisionPriority.CRITICAL)
        and d.status in active_statuses
    ]
    high_priority_count = len(high_priority_decisions)

    return {
        # Portfolio summary
        "total_portfolio_value": round(total_portfolio_value, 2),
        "portfolio_count": portfolio_count,
        "portfolios": [
            {
                "id": p.id,
                "name": p.name,
                "total_value": round(p.total_value or 0, 2),
            }
            for p in portfolios
        ],

        # Decision summary
        "total_decisions": total_decisions,
        "active_decisions": active_decisions,
        "total_investment_value": round(total_investment_value, 2),
        "high_priority_count": high_priority_count,

        # Breakdowns (Phase 1 extended)
        "status_counts": status_counts,
        "type_counts": type_counts,
        "priority_counts": priority_counts,
        "category_counts": category_counts,
        "geography_counts": geography_counts,

        # Recent activity
        "recent_decisions": recent_list,
    }
