"""
Decisions router — обновлён для Фазы 1, Сессия 2.
Добавлена автоматическая запись версий и аудит при create/update/delete/status_change.
"""
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
# Импорт хелперов версионирования и аудита
from app.api.v1.routers.audit import create_version, create_audit_event, _make_snapshot

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
# ---------------------------------------------------------------------------
@router.get("", response_model=DecisionListResponse)
def list_decisions(
    status: Optional[str] = Query(None),
    decision_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    portfolio_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all investment decisions with optional filtering, sorting, pagination."""
    query = db.query(InvestmentDecision).filter(
        InvestmentDecision.created_by == current_user.id
    )

    if status:
        try:
            status_enum = DecisionStatus(status)
            query = query.filter(InvestmentDecision.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый статус: {status}")

    if decision_type:
        try:
            type_enum = DecisionType(decision_type.upper())
            query = query.filter(InvestmentDecision.decision_type == type_enum)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый тип решения: {decision_type}")

    if priority:
        try:
            priority_enum = DecisionPriority(priority.lower())
            query = query.filter(InvestmentDecision.priority == priority_enum)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый приоритет: {priority}")

    if category:
        try:
            category_enum = DecisionCategory(category.lower())
            query = query.filter(InvestmentDecision.category == category_enum)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимая категория: {category}")

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
# POST "" — create a new decision  +  version + audit
# ---------------------------------------------------------------------------
@router.post("", response_model=DecisionRead, status_code=http_status.HTTP_201_CREATED)
def create_decision(
    decision_in: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new investment decision. Auto-creates version 1 and audit event."""
    try:
        decision_type_enum = DecisionType(decision_in.decision_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Недопустимый тип решения: {decision_in.decision_type}. Допустимые: BUY, SELL, HOLD",
        )

    priority_enum = DecisionPriority.MEDIUM
    if decision_in.priority:
        try:
            priority_enum = DecisionPriority(decision_in.priority.lower())
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый приоритет: {decision_in.priority}")

    category_enum = DecisionCategory.OTHER
    if decision_in.category:
        try:
            category_enum = DecisionCategory(decision_in.category.lower())
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимая категория: {decision_in.category}")

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
    db.flush()  # получить ID до создания версии

    # ✅ Версия 1 — начальное состояние
    create_version(
        db=db,
        decision=decision,
        change_type="created",
        changed_by=current_user.id,
    )

    # ✅ Аудит
    create_audit_event(
        db=db,
        entity_type="decision",
        entity_id=decision.id,
        action="create",
        user_id=current_user.id,
        new_values=_make_snapshot(decision),
    )

    db.commit()
    db.refresh(decision)

    return DecisionRead(**_decision_to_dict(decision))


# ---------------------------------------------------------------------------
# GET "/stats" — aggregated statistics
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

    by_status: dict = {}
    for s in DecisionStatus:
        by_status[s.value] = 0
    for d in decisions:
        key = d.status.value if hasattr(d.status, "value") else d.status
        by_status[key] = by_status.get(key, 0) + 1

    by_type: dict = {}
    for t in DecisionType:
        by_type[t.value] = 0
    for d in decisions:
        key = d.decision_type.value if hasattr(d.decision_type, "value") else d.decision_type
        by_type[key] = by_type.get(key, 0) + 1

    by_priority: dict = {}
    for p in DecisionPriority:
        by_priority[p.value] = 0
    for d in decisions:
        if d.priority is not None:
            key = d.priority.value if hasattr(d.priority, "value") else d.priority
            by_priority[key] = by_priority.get(key, 0) + 1

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
    """Get a single investment decision by ID."""
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")
    return DecisionRead(**_decision_to_dict(decision))


# ---------------------------------------------------------------------------
# PUT "/{decision_id}" — full update  +  version + audit
# ---------------------------------------------------------------------------
@router.put("/{decision_id}", response_model=DecisionRead)
def update_decision(
    decision_id: int,
    decision_in: DecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update decision fields. Auto-creates version and audit event."""
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    # Снимок ДО изменения
    old_snapshot = _make_snapshot(decision)

    # Отследить, какие поля меняются
    changed_fields = []

    if decision_in.asset_name is not None and decision_in.asset_name != decision.asset_name:
        decision.asset_name = decision_in.asset_name
        changed_fields.append("asset_name")
    if decision_in.asset_symbol is not None and decision_in.asset_symbol != decision.asset_symbol:
        decision.asset_symbol = decision_in.asset_symbol
        changed_fields.append("asset_symbol")

    if decision_in.decision_type is not None:
        try:
            new_type = DecisionType(decision_in.decision_type.upper())
            if new_type != decision.decision_type:
                decision.decision_type = new_type
                changed_fields.append("decision_type")
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый тип решения: {decision_in.decision_type}")

    if decision_in.amount is not None and decision_in.amount != decision.amount:
        decision.amount = decision_in.amount
        changed_fields.append("amount")
    if decision_in.price is not None and decision_in.price != decision.price:
        decision.price = decision_in.price
        changed_fields.append("price")

    decision.total_value = decision.amount * decision.price

    if decision_in.notes is not None and decision_in.notes != decision.notes:
        decision.notes = decision_in.notes
        changed_fields.append("notes")

    if decision_in.priority is not None:
        try:
            new_pri = DecisionPriority(decision_in.priority.lower())
            if new_pri != decision.priority:
                decision.priority = new_pri
                changed_fields.append("priority")
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый приоритет: {decision_in.priority}")

    if decision_in.category is not None:
        try:
            new_cat = DecisionCategory(decision_in.category.lower())
            if new_cat != decision.category:
                decision.category = new_cat
                changed_fields.append("category")
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимая категория: {decision_in.category}")

    if decision_in.geography is not None and decision_in.geography != decision.geography:
        decision.geography = decision_in.geography
        changed_fields.append("geography")
    if decision_in.target_return is not None and decision_in.target_return != decision.target_return:
        decision.target_return = decision_in.target_return
        changed_fields.append("target_return")
    if decision_in.investment_horizon is not None and decision_in.investment_horizon != decision.investment_horizon:
        decision.investment_horizon = decision_in.investment_horizon
        changed_fields.append("investment_horizon")
    if decision_in.risk_level is not None and decision_in.risk_level != decision.risk_level:
        decision.risk_level = decision_in.risk_level
        changed_fields.append("risk_level")
    if decision_in.rationale is not None and decision_in.rationale != decision.rationale:
        decision.rationale = decision_in.rationale
        changed_fields.append("rationale")
    if decision_in.tags is not None and decision_in.tags != decision.tags:
        decision.tags = decision_in.tags
        changed_fields.append("tags")

    # ✅ Версия — только если что-то реально изменилось
    if changed_fields:
        create_version(
            db=db,
            decision=decision,
            change_type="updated",
            changed_by=current_user.id,
            changed_fields=changed_fields,
        )

        # ✅ Аудит
        new_snapshot = _make_snapshot(decision)
        create_audit_event(
            db=db,
            entity_type="decision",
            entity_id=decision_id,
            action="update",
            user_id=current_user.id,
            old_values={f: old_snapshot.get(f) for f in changed_fields},
            new_values={f: new_snapshot.get(f) for f in changed_fields},
        )

    db.commit()
    db.refresh(decision)

    return DecisionRead(**_decision_to_dict(decision))


# ---------------------------------------------------------------------------
# DELETE "/{decision_id}"  +  audit
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
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    # ✅ Аудит
    create_audit_event(
        db=db,
        entity_type="decision",
        entity_id=decision_id,
        action="delete",
        user_id=current_user.id,
        old_values=_make_snapshot(decision),
    )

    db.delete(decision)
    db.commit()


# ---------------------------------------------------------------------------
# PATCH "/{decision_id}/status"  +  version + audit
# ---------------------------------------------------------------------------
@router.patch("/{decision_id}/status", response_model=DecisionRead)
def update_decision_status(
    decision_id: int,
    status_update: DecisionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update decision status with transition validation. Auto-creates version and audit."""
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    try:
        new_status = DecisionStatus(status_update.status)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Недопустимый статус: {status_update.status}. Допустимые: {[s.value for s in DecisionStatus]}",
        )

    current_status = decision.status
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])

    if new_status not in allowed:
        allowed_values = [s.value for s in allowed]
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Переход из статуса '{current_status.value}' в '{new_status.value}' недопустим. Допустимые переходы: {allowed_values}",
        )

    old_status = current_status.value if hasattr(current_status, "value") else current_status
    decision.status = new_status

    # ✅ Версия
    create_version(
        db=db,
        decision=decision,
        change_type="status_changed",
        changed_by=current_user.id,
        changed_fields=["status"],
    )

    # ✅ Аудит
    create_audit_event(
        db=db,
        entity_type="decision",
        entity_id=decision_id,
        action="status_change",
        user_id=current_user.id,
        old_values={"status": old_status},
        new_values={"status": new_status.value},
    )

    db.commit()
    db.refresh(decision)

    return DecisionRead(**_decision_to_dict(decision))
