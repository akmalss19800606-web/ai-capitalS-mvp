from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.role import Role

router = APIRouter(prefix="/roles", tags=["roles"])

class RoleCreate(BaseModel):
    name: str
    description: str | None = None

class RoleRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role_id: int


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin может управлять ролями")
    return current_user


@router.post("/seed", status_code=201)
def seed_roles(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Создать стандартные роли системы"""
    default_roles = [
        {"name": "Admin", "description": "Полный доступ к системе"},
        {"name": "Investment Committee Member", "description": "Утверждение инвестиционных решений"},
        {"name": "Portfolio Manager", "description": "Управление портфелями"},
        {"name": "Analyst", "description": "Анализ данных и подготовка отчётов"},
        {"name": "Viewer", "description": "Только просмотр"},
    ]
    created = []
    for r in default_roles:
        existing = db.query(Role).filter(Role.name == r["name"]).first()
        if not existing:
            role = Role(**r)
            db.add(role)
            created.append(r["name"])
    db.commit()
    return {"created": created, "message": "Роли созданы успешно"}


@router.get("/", response_model=List[RoleRead])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Role).all()


@router.patch("/users/{user_id}/role")
def assign_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = db.query(Role).filter(Role.id == role_update.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    user.role_id = role_update.role_id
    db.commit()
    return {"message": f"Роль '{role.name}' назначена пользователю {user.email}"}
