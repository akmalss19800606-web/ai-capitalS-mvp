import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.investment_decision import (
    DecisionCategory,
    DecisionPriority,
    DecisionStatus,
    DecisionType,
    InvestmentDecision,
)
from app.db.models.user import User
from app.schemas.decision import (
    DecisionCreate,
    DecisionListResponse,
    DecisionRead,
    DecisionStatusUpdate,
    DecisionUpdate,
)

router = APIRouter(prefix="/decisions", tags=["decisions"])

# ---------------------------------------------------------------------------
# Status transition map — Phase 1 (extended with REJECTED)
# ---------------------------------------------------------------------------
ALLOWED_TRANSITIONS: dict[DecisionStatus, list[DecisionStatus]] = {
    DecisionStatus.DRAFT: [DecisionStatus.REVIEW, DecisionStatus.REJECTED],
    DecisionStatus.REVIEW: [
        DecisionStatus.APPROVED,
        DecisionStatus.REJECTED,
        DecisionStatus.DRAFT,
    ],
    DecisionStatus.APPROVED: [
        DecisionStatus.IN_PROGRESS,
        DecisionStatus.REJECTED,
        DecisionStatus.REVIEW,
    ],
    DecisionStatus.IN_PROGRESS: [DecisionStatus.COMPLETED],
    DecisionStatus.COMPLETED: [],
    DecisionStatus.REJECTED: [DecisionStatus.DRAFT],
}

# ---------------------------------------------------------------------------
# Helper: convert ORM object to dict for DecisionRead
# ---------------------------------------------------------------------------
def _decision_to_dict(d: InvestmentDecision) -> dict:
    return {
        "id": d.id,
        "asset_name": d.asset_name,
        "asset_symbol": d.asset_symbol,
        "decision_type": d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type,
        "amount": d.amount,
        "price": d.price,
        "total_value": d.total_value,
        "ai_recommendation": d.ai_recommendation,
        "notes": d.notes,
        "status": d.status.value if hasattr(d.status, "value") else d.status,
        "priority": d.priority.value if hasattr(d.priority, "value") else d.priority,
        "category": d.category.value if hasattr(d.category, "value") else d.category,
        "geography": d.geography,
        "target_return": d.target_return,
        "investment_horizon": d.investment_horizon,
        "risk_level": d.risk_level,
        "rationale": d.rationale,
        "tags": d.tags,
        "portfolio_id": d.portfolio_id,
        "created_by": d.created_by,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


# ---------------------------------------------------------------------------
# GET "" — list decisions with filters, sorting, pagination
# Note: "" maps to /api/v1/decisions because redirect_slashes=False
# ---------------------------------------------------------------------------
@router.get("", response_model=DecisionListResponse)
def list_decisions(
    # Filters
    status: Optional[str] = Query(None, description="Filter by status: draft, review, approved, in_progress, completed, rejected"),
    decision_type: Optional[str] = Query(None, description="Filter by type: BUY, SELL, HOLD"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by category"),
    portfolio_id: Optional[int] = Query(None, description="Filter by portfolio"),
    search: Optional[str] = Query(None, description="Search in asset_name, asset_symbol, notes"),
    # Sorting
    sort_by: Optional[str] = Query("created_at", description="Sort field: created_at, amount, price, status, priority"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: asc, desc"),
    # Pagination
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all investment decisions for the current user with optional filtering, sorting, pagination."""
    query = db.query(InvestmentDecision).filter(
        InvestmentDecision.created_by == current_user.id
    )

    # --- Filtering ---
    if status:
        # Accept both enum value and raw string
        try:
            status_enum = DecisionStatus(status)
            query = query.filter(InvestmentDecision.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимый статус: {status}",
            )

    if decision_type:
        try:
            type_enum = DecisionType(decision_type.upper())
            query = query.filter(InvestmentDecision.decision_type == type_enum)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимый тип решения: {decision_type}",
            )

    if priority:
        try:
            priority_enum = DecisionPriority(priority.lower())
            query = query.filter(InvestmentDecision.priority == priority_enum)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимый приоритет: {priority}",
            )

    if category:
        try:
            category_enum = DecisionCategory(category.lower())
            query = query.filter(InvestmentDecision.category == category_enum)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимая категория: {category}",
            )

    if portfolio_id is not None:
        query = query.filter(InvestmentDecision.portfolio_id == portfolio_id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                InvestmentDecision.asset_name.ilike(term),
                InvestmentDecision.asset_symbol.ilike(term),
                InvestmentDecision.notes.ilike(term),
            )
        )

    # --- Sorting ---
    sort_column_map = {
        "created_at": InvestmentDecision.created_at,
        "amount": InvestmentDecision.amount,
        "price": InvestmentDecision.price,
        "status": InvestmentDecision.status,
        "priority": InvestmentDecision.priority,
        "total_value": InvestmentDecision.total_value,
    }
    sort_col = sort_column_map.get(sort_by, InvestmentDecision.created_at)
    if sort_order and sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    # --- Pagination ---
    total = query.count()
    pages = math.ceil(total / per_page) if per_page else 1
    offset = (page - 1) * per_page
    items = query.offset(offset).limit(per_page).all()

    return DecisionListResponse(
        items=[DecisionRead(**_decision_to_dict(d)) for d in items],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


# ---------------------------------------------------------------------------
# POST "" — create a new decision
# ---------------------------------------------------------------------------
@router.post("", response_model=DecisionRead, status_code=http_status.HTTP_201_CREATED)
def create_decision(
    decision_in: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new investment decision. total_value is auto-calculated as amount * price."""
    # Validate decision_type
    try:
        decision_type_enum = DecisionType(decision_in.decision_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Недопустимый тип решения: {decision_in.decision_type}. Допустимые: BUY, SELL, HOLD",
        )

    # Validate priority
    priority_enum = DecisionPriority.MEDIUM
    if decision_in.priority:
        try:
            priority_enum = DecisionPriority(decision_in.priority.lower())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимый приоритет: {decision_in.priority}",
            )

    # Validate category
    category_enum = DecisionCategory.OTHER
    if decision_in.category:
        try:
            category_enum = DecisionCategory(decision_in.category.lower())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимая категория: {decision_in.category}",
            )

    # Auto-calculate total_value
    total_value = decision_in.amount * decision_in.price

    decision = InvestmentDecision(
        asset_name=decision_in.asset_name,
        asset_symbol=decision_in.asset_symbol,
        decision_type=decision_type_enum,
        amount=decision_in.amount,
        price=decision_in.price,
        total_value=total_value,
        portfolio_id=decision_in.portfolio_id,
        created_by=current_user.id,
        notes=decision_in.notes,
        status=DecisionStatus.DRAFT,
        priority=priority_enum,
        category=category_enum,
        geography=decision_in.geography,
        target_return=decision_in.target_return,
        investment_horizon=decision_in.investment_horizon,
        risk_level=decision_in.risk_level,
        rationale=decision_in.rationale,
        tags=decision_in.tags,
    )

    db.add(decision)
    db.commit()
    db.refresh(decision)

    return DecisionRead(**_decision_to_dict(decision))


# ---------------------------------------------------------------------------
# GET "/stats" — aggregated statistics
# IMPORTANT: must be declared BEFORE "/{decision_id}" to avoid route conflict
# ---------------------------------------------------------------------------
@router.get("/stats")
def get_decisions_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return aggregated statistics for the current user's decisions."""
    decisions = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.created_by == current_user.id)
        .all()
    )

    total_decisions = len(decisions)
    total_value = sum(d.total_value or 0.0 for d in decisions)

    # Count by status
    by_status: dict = {}
    for s in DecisionStatus:
        by_status[s.value] = 0
    for d in decisions:
        key = d.status.value if hasattr(d.status, "value") else d.status
        by_status[key] = by_status.get(key, 0) + 1

    # Count by type
    by_type: dict = {}
    for t in DecisionType:
        by_type[t.value] = 0
    for d in decisions:
        key = d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type
        by_type[key] = by_type.get(key, 0) + 1

    # Count by priority
    by_priority: dict = {}
    for p in DecisionPriority:
        by_priority[p.value] = 0
    for d in decisions:
        if d.priority is not None:
            key = d.priority.value if hasattr(d.priority, "value") else d.priority
            by_priority[key] = by_priority.get(key, 0) + 1

    # Count by category
    by_category: dict = {}
    for c in DecisionCategory:
        by_category[c.value] = 0
    for d in decisions:
        if d.category is not None:
            key = d.category.value if hasattr(d.category, "value") else d.category
            by_category[key] = by_category.get(key, 0) + 1

    return {
        "total_decisions": total_decisions,
        "total_value": round(total_value, 2),
        "by_status": by_status,
        "by_type": by_type,
        "by_priority": by_priority,
        "by_category": by_category,
    }


# ---------------------------------------------------------------------------
# GET "/{decision_id}" — get single decision
# ---------------------------------------------------------------------------
@router.get("/{decision_id}", response_model=DecisionRead)
def get_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single investment decision by ID (must belong to current user)."""
    decision = (
        db.query(InvestmentDecision)
        .filter(
            InvestmentDecision.id == decision_id,
            InvestmentDecision.created_by == current_user.id,
        )
        .first()
    )
    if not decision:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Решение не найдено",
        )
    return DecisionRead(**_decision_to_dict(decision))


# ---------------------------------------------------------------------------
# PUT "/{decision_id}" — full update of decision fields
# ---------------------------------------------------------------------------
@router.put("/{decision_id}", response_model=DecisionRead)
def update_decision(
    decision_id: int,
    decision_in: DecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update decision fields. Recalculates total_value if amount or price changes."""
    decision = (
        db.query(InvestmentDecision)
        .filter(
            InvestmentDecision.id == decision_id,
            InvestmentDecision.created_by == current_user.id,
        )
        .first()
    )
    if not decision:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Решение не найдено",
        )

    # Apply updates for each provided field
    if decision_in.asset_name is not None:
        decision.asset_name = decision_in.asset_name
    if decision_in.asset_symbol is not None:
        decision.asset_symbol = decision_in.asset_symbol

    if decision_in.decision_type is not None:
        try:
            decision.decision_type = DecisionType(decision_in.decision_type.upper())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимый тип решения: {decision_in.decision_type}",
            )

    if decision_in.amount is not None:
        decision.amount = decision_in.amount
    if decision_in.price is not None:
        decision.price = decision_in.price

    # Recalculate total_value whenever amount or price changes
    decision.total_value = decision.amount * decision.price

    if decision_in.notes is not None:
        decision.notes = decision_in.notes

    if decision_in.priority is not None:
        try:
            decision.priority = DecisionPriority(decision_in.priority.lower())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимый приоритет: {decision_in.priority}",
            )

    if decision_in.category is not None:
        try:
            decision.category = DecisionCategory(decision_in.category.lower())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Недопустимая категория: {decision_in.category}",
            )

    if decision_in.geography is not None:
        decision.geography = decision_in.geography
    if decision_in.target_return is not None:
        decision.target_return = decision_in.target_return
    if decision_in.investment_horizon is not None:
        decision.investment_horizon = decision_in.investment_horizon
    if decision_in.risk_level is not None:
        decision.risk_level = decision_in.risk_level
    if decision_in.rationale is not None:
        decision.rationale = decision_in.rationale
    if decision_in.tags is not None:
        decision.tags = decision_in.tags

    db.commit()
    db.refresh(decision)

    return DecisionRead(**_decision_to_dict(decision))


# ---------------------------------------------------------------------------
# DELETE "/{decision_id}" — delete decision
# ---------------------------------------------------------------------------
@router.delete("/{decision_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a decision permanently."""
    decision = (
        db.query(InvestmentDecision)
        .filter(
            InvestmentDecision.id == decision_id,
            InvestmentDecision.created_by == current_user.id,
        )
        .first()
    )
    if not decision:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Решение не найдено",
        )
    db.delete(decision)
    db.commit()


# ---------------------------------------------------------------------------
# PATCH "/{decision_id}/status" — update status with transition validation
# ---------------------------------------------------------------------------
@router.patch("/{decision_id}/status", response_model=DecisionRead)
def update_decision_status(
    decision_id: int,
    status_update: DecisionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update decision status with transition validation.

    Allowed transitions:
      draft       → review, rejected
      review      → approved, rejected, draft
      approved    → in_progress, rejected, review
      in_progress → completed
      completed   → (нет переходов)
      rejected    → draft
    """
    decision = (
        db.query(InvestmentDecision)
        .filter(
            InvestmentDecision.id == decision_id,
            InvestmentDecision.created_by == current_user.id,
        )
        .first()
    )
    if not decision:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Решение не найдено",
        )

    # Parse new status
    try:
        new_status = DecisionStatus(status_update.status)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Недопустимый статус: {status_update.status}. "
                   f"Допустимые: {[s.value for s in DecisionStatus]}",
        )

    current_status = decision.status
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])

    if new_status not in allowed:
        allowed_values = [s.value for s in allowed]
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Переход из статуса '{current_status.value}' в '{new_status.value}' недопустим. "
                f"Допустимые переходы: {allowed_values}"
            ),
        )

    decision.status = new_status
    db.commit()
    db.refresh(decision)

    return DecisionRead(**_decision_to_dict(decision))
