"""
Роутер контроля доступа — ABAC-политики, кастомные роли, доступ к решениям.
Фаза 3, Сессия 3 — COLLAB-ACCESS-001.1–001.4.

Эндпоинты:
  # ABAC
  GET    /access/policies               — список политик
  POST   /access/policies               — создать политику
  PUT    /access/policies/{id}          — обновить политику
  DELETE /access/policies/{id}          — удалить политику
  POST   /access/check                  — проверить доступ

  # Кастомные роли
  GET    /access/roles                  — список кастомных ролей
  POST   /access/roles                  — создать роль
  PUT    /access/roles/{id}             — обновить роль
  DELETE /access/roles/{id}             — удалить роль
  POST   /access/roles/seed             — создать системные роли

  # Decision-level access
  GET    /access/decisions/{id}/access  — список доступа к решению
  POST   /access/decisions/{id}/grant   — выдать доступ
  DELETE /access/decisions/{id}/revoke/{user_id} — отозвать
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services import abac_service

router = APIRouter(prefix="/access", tags=["access-control"])


# ── Schemas ──

class PolicyCreate(BaseModel):
    name: str
    resource_type: str
    action: str
    conditions: dict = {}
    effect: str = "allow"
    priority: int = 0
    description: str = ""

class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    resource_type: Optional[str] = None
    action: Optional[str] = None
    conditions: Optional[dict] = None
    effect: Optional[str] = None
    priority: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class PolicyRead(BaseModel):
    id: int
    name: str
    resource_type: str
    action: str
    conditions: dict
    effect: str
    priority: int
    description: Optional[str]
    is_active: bool
    class Config:
        from_attributes = True

class AccessCheckRequest(BaseModel):
    resource_type: str
    action: str
    resource_attrs: dict = {}

class AccessCheckResponse(BaseModel):
    allowed: bool
    matched_policy: Optional[str]
    reason: str

class CustomRoleCreate(BaseModel):
    name: str
    permissions: dict
    description: str = ""

class CustomRoleUpdate(BaseModel):
    name: Optional[str] = None
    permissions: Optional[dict] = None
    description: Optional[str] = None

class CustomRoleRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    permissions: dict
    is_system: bool
    class Config:
        from_attributes = True

class DecisionAccessGrant(BaseModel):
    user_id: int
    access_level: str = "viewer"  # "owner" | "editor" | "viewer"
    can_view_financials: bool = False

class DecisionAccessRead(BaseModel):
    id: int
    decision_id: int
    user_id: int
    access_level: str
    can_view_financials: bool
    class Config:
        from_attributes = True


# ── ABAC Policies ──

@router.get("/policies", response_model=List[PolicyRead])
def list_policies(
    resource_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return abac_service.list_policies(db, resource_type)


@router.post("/policies", response_model=PolicyRead, status_code=201)
def create_policy(
    body: PolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может создавать политики")
    return abac_service.create_policy(
        db,
        name=body.name,
        resource_type=body.resource_type,
        action=body.action,
        conditions=body.conditions,
        effect=body.effect,
        priority=body.priority,
        description=body.description,
        created_by=current_user.id,
    )


@router.put("/policies/{policy_id}", response_model=PolicyRead)
def update_policy(
    policy_id: int,
    body: PolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может изменять политики")
    result = abac_service.update_policy(db, policy_id, body.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Политика не найдена")
    return result


@router.delete("/policies/{policy_id}")
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может удалять политики")
    ok = abac_service.delete_policy(db, policy_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Политика не найдена")
    return {"message": "Политика удалена"}


@router.post("/check", response_model=AccessCheckResponse)
def check_access(
    body: AccessCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = abac_service.evaluate_access(
        db, current_user, body.resource_type, body.action, body.resource_attrs
    )
    return AccessCheckResponse(**result)


# ── Custom Roles ──

@router.get("/roles", response_model=List[CustomRoleRead])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return abac_service.list_custom_roles(db)


@router.post("/roles", response_model=CustomRoleRead, status_code=201)
def create_role(
    body: CustomRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может создавать роли")
    return abac_service.create_custom_role(
        db, name=body.name, permissions=body.permissions,
        description=body.description, created_by=current_user.id,
    )


@router.put("/roles/{role_id}", response_model=CustomRoleRead)
def update_role(
    role_id: int,
    body: CustomRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может изменять роли")
    result = abac_service.update_custom_role(db, role_id, body.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Роль не найдена или является системной")
    return result


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может удалять роли")
    ok = abac_service.delete_custom_role(db, role_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Роль не найдена или является системной")
    return {"message": "Роль удалена"}


@router.post("/roles/seed")
def seed_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin")
    created = abac_service.seed_default_roles(db)
    return {"created": created, "message": "Системные роли созданы"}


# ── Decision-level Access ──

@router.get("/decisions/{decision_id}/access", response_model=List[DecisionAccessRead])
def list_decision_access(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return abac_service.get_decision_access(db, decision_id)


@router.post("/decisions/{decision_id}/grant", response_model=DecisionAccessRead)
def grant_access(
    decision_id: int,
    body: DecisionAccessGrant,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return abac_service.grant_decision_access(
        db, decision_id, body.user_id, body.access_level,
        body.can_view_financials, current_user.id,
    )


@router.delete("/decisions/{decision_id}/revoke/{user_id}")
def revoke_access(
    decision_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = abac_service.revoke_decision_access(db, decision_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Запись доступа не найдена")
    return {"message": "Доступ отозван"}
