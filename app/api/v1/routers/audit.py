"""
API роутер: версионирование, аудит, diff, rollback.
Фаза 1, Сессия 2 — DM-AUDIT-001

Endpoints:
  GET  /decisions/{id}/history            — история версий решения
  GET  /decisions/{id}/diff/{va}/{vb}     — diff между двумя версиями
  POST /decisions/{id}/rollback/{version} — откат к версии
  GET  /decisions/{id}/audit              — аудиторский след решения
  GET  /audit/events                      — все аудиторские события (глобально)
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.investment_decision import InvestmentDecision, DecisionStatus, DecisionType, DecisionPriority, DecisionCategory
from app.db.models.decision_version import DecisionVersion, AuditEvent
from app.schemas.audit import (
    DecisionVersionRead,
    DecisionVersionListResponse,
    DecisionDiffResponse,
    RollbackRequest,
    RollbackResponse,
    AuditEventRead,
    AuditEventListResponse,
)

router = APIRouter(tags=["audit"])


# ───────────────────────────────────────────────────────────────────────────────
# Helpers: создание снимка и аудит-события
# ───────────────────────────────────────────────────────────────────────────────

def _make_snapshot(d: InvestmentDecision) -> dict:
    """Создать полный снимок решения в виде сериализуемого dict."""
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
        "priority": d.priority.value if hasattr(d.priority, "value") else (d.priority if d.priority else None),
        "category": d.category.value if hasattr(d.category, "value") else (d.category if d.category else None),
        "geography": d.geography,
        "target_return": d.target_return,
        "investment_horizon": d.investment_horizon,
        "risk_level": d.risk_level,
        "rationale": d.rationale,
        "tags": d.tags,
        "portfolio_id": d.portfolio_id,
        "created_by": d.created_by,
        "created_at": str(d.created_at) if d.created_at else None,
        "updated_at": str(d.updated_at) if d.updated_at else None,
    }


def create_version(
    db: Session,
    decision: InvestmentDecision,
    change_type: str,
    changed_by: int,
    changed_fields: list | None = None,
    change_reason: str | None = None,
) -> DecisionVersion:
    """Создать новую версию решения (вызывается из decisions router при update/status_change)."""
    # Определить номер версии
    last_version = (
        db.query(DecisionVersion)
        .filter(DecisionVersion.decision_id == decision.id)
        .order_by(DecisionVersion.version_number.desc())
        .first()
    )
    next_version = (last_version.version_number + 1) if last_version else 1

    version = DecisionVersion(
        decision_id=decision.id,
        version_number=next_version,
        snapshot=_make_snapshot(decision),
        change_type=change_type,
        changed_fields=changed_fields,
        change_reason=change_reason,
        changed_by=changed_by,
    )
    db.add(version)
    return version


def create_audit_event(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    user_id: int,
    old_values: dict | None = None,
    new_values: dict | None = None,
    metadata_json: dict | None = None,
) -> AuditEvent:
    """Записать аудиторское событие."""
    event = AuditEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
        metadata_json=metadata_json,
        user_id=user_id,
    )
    db.add(event)
    return event


# ───────────────────────────────────────────────────────────────────────────────
# GET /decisions/{decision_id}/history — история версий
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/decisions/{decision_id}/history", response_model=DecisionVersionListResponse)
def get_decision_history(
    decision_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Вернуть историю версий решения (от новейшей к старой)."""
    # Проверка: решение принадлежит текущему пользователю
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    query = (
        db.query(DecisionVersion)
        .filter(DecisionVersion.decision_id == decision_id)
        .order_by(DecisionVersion.version_number.desc())
    )
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return DecisionVersionListResponse(
        items=[DecisionVersionRead.model_validate(v) for v in items],
        total=total,
    )


# ───────────────────────────────────────────────────────────────────────────────
# GET /decisions/{decision_id}/diff/{version_a}/{version_b}
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/decisions/{decision_id}/diff/{version_a}/{version_b}", response_model=DecisionDiffResponse)
def get_decision_diff(
    decision_id: int,
    version_a: int,
    version_b: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сравнить две версии решения — поле-по-полю."""
    # Проверка
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    va = (
        db.query(DecisionVersion)
        .filter(DecisionVersion.decision_id == decision_id, DecisionVersion.version_number == version_a)
        .first()
    )
    vb = (
        db.query(DecisionVersion)
        .filter(DecisionVersion.decision_id == decision_id, DecisionVersion.version_number == version_b)
        .first()
    )
    if not va or not vb:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Одна из версий не найдена")

    # Вычислить diff
    snap_a = va.snapshot or {}
    snap_b = vb.snapshot or {}
    all_keys = set(snap_a.keys()) | set(snap_b.keys())
    # Исключить технические поля
    exclude_keys = {"id", "created_by", "created_at"}
    changes = []
    for key in sorted(all_keys - exclude_keys):
        old_val = snap_a.get(key)
        new_val = snap_b.get(key)
        if old_val != new_val:
            changes.append({
                "field": key,
                "old": old_val,
                "new": new_val,
            })

    return DecisionDiffResponse(
        decision_id=decision_id,
        version_a=version_a,
        version_b=version_b,
        changes=changes,
    )


# ───────────────────────────────────────────────────────────────────────────────
# POST /decisions/{decision_id}/rollback/{version_number}
# ───────────────────────────────────────────────────────────────────────────────
@router.post("/decisions/{decision_id}/rollback/{version_number}", response_model=RollbackResponse)
def rollback_decision(
    decision_id: int,
    version_number: int,
    rollback_in: RollbackRequest = RollbackRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Откат решения к указанной версии. Создаёт новую версию с типом 'rolledback'."""
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    target_version = (
        db.query(DecisionVersion)
        .filter(DecisionVersion.decision_id == decision_id, DecisionVersion.version_number == version_number)
        .first()
    )
    if not target_version:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Версия {version_number} не найдена",
        )

    snap = target_version.snapshot
    if not snap:
        raise HTTPException(status_code=400, detail="Снимок версии пуст")

    # Сохранить старые значения для аудита
    old_snapshot = _make_snapshot(decision)

    # Восстановить поля из снимка
    decision.asset_name = snap.get("asset_name", decision.asset_name)
    decision.asset_symbol = snap.get("asset_symbol", decision.asset_symbol)
    if snap.get("decision_type"):
        try:
            decision.decision_type = DecisionType(snap["decision_type"].upper() if snap["decision_type"] else "BUY")
        except (ValueError, AttributeError):
            pass
    if snap.get("amount") is not None:
        decision.amount = snap["amount"]
    if snap.get("price") is not None:
        decision.price = snap["price"]
    decision.total_value = (decision.amount or 0) * (decision.price or 0)
    decision.notes = snap.get("notes")
    if snap.get("status"):
        try:
            decision.status = DecisionStatus(snap["status"])
        except ValueError:
            pass
    if snap.get("priority"):
        try:
            decision.priority = DecisionPriority(snap["priority"])
        except ValueError:
            pass
    if snap.get("category"):
        try:
            decision.category = DecisionCategory(snap["category"])
        except ValueError:
            pass
    decision.geography = snap.get("geography")
    decision.target_return = snap.get("target_return")
    decision.investment_horizon = snap.get("investment_horizon")
    decision.risk_level = snap.get("risk_level")
    decision.rationale = snap.get("rationale")
    decision.tags = snap.get("tags")

    # Создать новую версию с типом "rolledback"
    new_version = create_version(
        db=db,
        decision=decision,
        change_type="rolledback",
        changed_by=current_user.id,
        change_reason=rollback_in.reason or f"Откат к версии {version_number}",
    )

    # Аудит
    create_audit_event(
        db=db,
        entity_type="decision",
        entity_id=decision_id,
        action="rollback",
        user_id=current_user.id,
        old_values=old_snapshot,
        new_values=_make_snapshot(decision),
        metadata_json={"target_version": version_number, "reason": rollback_in.reason},
    )

    db.commit()
    db.refresh(new_version)

    return RollbackResponse(
        decision_id=decision_id,
        rolled_back_to_version=version_number,
        new_version_number=new_version.version_number,
        message=f"Решение откачено к версии {version_number}",
    )


# ───────────────────────────────────────────────────────────────────────────────
# GET /decisions/{decision_id}/audit — аудит решения
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/decisions/{decision_id}/audit", response_model=AuditEventListResponse)
def get_decision_audit(
    decision_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Вернуть аудиторский след для конкретного решения."""
    # Проверка
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Решение не найдено")

    query = (
        db.query(AuditEvent)
        .filter(AuditEvent.entity_type == "decision", AuditEvent.entity_id == decision_id)
        .order_by(AuditEvent.created_at.desc())
    )
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return AuditEventListResponse(
        items=[AuditEventRead.model_validate(e) for e in items],
        total=total,
    )


# ───────────────────────────────────────────────────────────────────────────────
# GET /audit/events — глобальный аудит
# ───────────────────────────────────────────────────────────────────────────────
@router.get("/audit/events", response_model=AuditEventListResponse)
def list_audit_events(
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Глобальный аудиторский журнал (только события текущего пользователя)."""
    query = db.query(AuditEvent).filter(AuditEvent.user_id == current_user.id)

    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)
    if action:
        query = query.filter(AuditEvent.action == action)

    query = query.order_by(AuditEvent.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return AuditEventListResponse(
        items=[AuditEventRead.model_validate(e) for e in items],
        total=total,
    )
