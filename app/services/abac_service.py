"""
Сервис контроля доступа на основе атрибутов (ABAC) + кастомные роли.
Фаза 3, Сессия 3 — COLLAB-ACCESS-001.1–001.4.
Поддержка:
  - CRUD для ABAC-политик
  - Evaluation engine для проверки доступа
  - CRUD для кастомных ролей
  - Гранулярный доступ к решениям (владелец/участник/зритель)
  - Разграничение конфиденциальной информации
"""
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session

from app.db.models.auth_security import AbacPolicy, CustomRole, DecisionAccess
from app.db.models.user import User
from app.db.models.role import Role


# ──────────────────────────────────────────────
# ABAC Policy CRUD
# ──────────────────────────────────────────────

def list_policies(db: Session, resource_type: Optional[str] = None) -> List[AbacPolicy]:
    """Получить список политик, опционально с фильтром по типу ресурса."""
    q = db.query(AbacPolicy).filter(AbacPolicy.is_active == True)
    if resource_type:
        q = q.filter(AbacPolicy.resource_type == resource_type)
    return q.order_by(AbacPolicy.priority.desc()).all()


def get_policy(db: Session, policy_id: int) -> Optional[AbacPolicy]:
    return db.query(AbacPolicy).filter(AbacPolicy.id == policy_id).first()


def create_policy(
    db: Session,
    name: str,
    resource_type: str,
    action: str,
    conditions: dict,
    effect: str = "allow",
    priority: int = 0,
    description: str = "",
    created_by: Optional[int] = None,
) -> AbacPolicy:
    """Создать новую ABAC-политику."""
    policy = AbacPolicy(
        name=name,
        resource_type=resource_type,
        action=action,
        conditions=conditions,
        effect=effect,
        priority=priority,
        description=description,
        created_by=created_by,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def update_policy(db: Session, policy_id: int, data: dict) -> Optional[AbacPolicy]:
    """Обновить политику."""
    p = get_policy(db, policy_id)
    if not p:
        return None
    for k, v in data.items():
        if hasattr(p, k) and k not in ("id", "created_at"):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


def delete_policy(db: Session, policy_id: int) -> bool:
    """Мягкое удаление — деактивация."""
    p = get_policy(db, policy_id)
    if not p:
        return False
    p.is_active = False
    db.commit()
    return True


# ──────────────────────────────────────────────
# ABAC Evaluation Engine
# ──────────────────────────────────────────────

def evaluate_access(
    db: Session,
    user: User,
    resource_type: str,
    action: str,
    resource_attrs: Optional[Dict[str, Any]] = None,
) -> dict:
    """
    Проверить доступ по ABAC-политикам.
    Возвращает {"allowed": bool, "matched_policy": str|None, "reason": str}.

    Порядок:
    1. Superuser → всегда разрешён.
    2. Политики сортируются по priority desc.
    3. Первая подходящая политика определяет результат.
    4. Если ничего не найдено → deny по умолчанию.
    """
    # Superuser bypass
    if user.is_superuser:
        return {"allowed": True, "matched_policy": None, "reason": "superuser"}

    policies = list_policies(db, resource_type)

    # Собрать атрибуты пользователя
    user_role_name = None
    if user.role_id:
        role = db.query(Role).filter(Role.id == user.role_id).first()
        user_role_name = role.name if role else None

    user_attrs = {
        "user_id": user.id,
        "role": user_role_name,
        "is_superuser": user.is_superuser,
        "email": user.email,
    }

    for policy in policies:
        if policy.action != action:
            continue

        if _match_conditions(policy.conditions, user_attrs, resource_attrs or {}):
            return {
                "allowed": policy.effect == "allow",
                "matched_policy": policy.name,
                "reason": f"policy:{policy.name}",
            }

    # Default deny
    return {"allowed": False, "matched_policy": None, "reason": "no_matching_policy"}


def _match_conditions(
    conditions: dict,
    user_attrs: dict,
    resource_attrs: dict,
) -> bool:
    """
    Проверить условия политики.
    Поддерживаемые операторы:
      role_in: [list] — роль пользователя в списке
      role_not_in: [list]
      user_id_eq: int — конкретный пользователь
      department_eq: str — если в resource_attrs есть department
      is_owner: bool — если user_id == resource_attrs.owner_id
    """
    for key, value in conditions.items():
        if key == "role_in":
            if user_attrs.get("role") not in value:
                return False
        elif key == "role_not_in":
            if user_attrs.get("role") in value:
                return False
        elif key == "user_id_eq":
            if user_attrs.get("user_id") != value:
                return False
        elif key == "is_owner" and value:
            if user_attrs.get("user_id") != resource_attrs.get("owner_id"):
                return False
        elif key == "department_eq":
            if resource_attrs.get("department") != value:
                return False
        # extensible — неизвестные условия пропускаем
    return True


# ──────────────────────────────────────────────
# Custom Roles CRUD
# ──────────────────────────────────────────────

def list_custom_roles(db: Session) -> List[CustomRole]:
    return db.query(CustomRole).order_by(CustomRole.name).all()


def get_custom_role(db: Session, role_id: int) -> Optional[CustomRole]:
    return db.query(CustomRole).filter(CustomRole.id == role_id).first()


def create_custom_role(
    db: Session,
    name: str,
    permissions: dict,
    description: str = "",
    created_by: Optional[int] = None,
) -> CustomRole:
    role = CustomRole(
        name=name,
        permissions=permissions,
        description=description,
        created_by=created_by,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_custom_role(db: Session, role_id: int, data: dict) -> Optional[CustomRole]:
    r = get_custom_role(db, role_id)
    if not r:
        return None
    if r.is_system:
        return None  # нельзя изменять системные роли
    for k, v in data.items():
        if hasattr(r, k) and k not in ("id", "is_system", "created_at"):
            setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


def delete_custom_role(db: Session, role_id: int) -> bool:
    r = get_custom_role(db, role_id)
    if not r or r.is_system:
        return False
    db.delete(r)
    db.commit()
    return True


def seed_default_roles(db: Session) -> List[str]:
    """Создать системные кастомные роли."""
    defaults = [
        {
            "name": "Администратор",
            "description": "Полный доступ ко всем модулям системы",
            "permissions": {
                "decisions": ["read", "write", "delete", "approve"],
                "portfolios": ["read", "write", "delete"],
                "analytics": ["read", "write"],
                "reports": ["read", "write", "delete"],
                "settings": ["read", "write"],
                "users": ["read", "write", "delete"],
            },
            "is_system": True,
        },
        {
            "name": "Инвестиционный комитет",
            "description": "Утверждение решений и просмотр аналитики",
            "permissions": {
                "decisions": ["read", "approve"],
                "portfolios": ["read"],
                "analytics": ["read"],
                "reports": ["read"],
            },
            "is_system": True,
        },
        {
            "name": "Портфельный менеджер",
            "description": "Управление портфелями и решениями",
            "permissions": {
                "decisions": ["read", "write"],
                "portfolios": ["read", "write"],
                "analytics": ["read"],
                "reports": ["read", "write"],
            },
            "is_system": True,
        },
        {
            "name": "Аналитик",
            "description": "Анализ данных и подготовка отчётов",
            "permissions": {
                "decisions": ["read"],
                "portfolios": ["read"],
                "analytics": ["read", "write"],
                "reports": ["read", "write"],
            },
            "is_system": True,
        },
        {
            "name": "Наблюдатель",
            "description": "Только просмотр",
            "permissions": {
                "decisions": ["read"],
                "portfolios": ["read"],
                "analytics": ["read"],
                "reports": ["read"],
            },
            "is_system": True,
        },
    ]

    created = []
    for d in defaults:
        existing = db.query(CustomRole).filter(CustomRole.name == d["name"]).first()
        if not existing:
            role = CustomRole(**d)
            db.add(role)
            created.append(d["name"])
    db.commit()
    return created


# ──────────────────────────────────────────────
# Decision-level Access (COLLAB-ACCESS-001.2–001.3)
# ──────────────────────────────────────────────

def get_decision_access(db: Session, decision_id: int) -> List[DecisionAccess]:
    """Получить список доступа к решению."""
    return db.query(DecisionAccess).filter(
        DecisionAccess.decision_id == decision_id,
    ).all()


def grant_decision_access(
    db: Session,
    decision_id: int,
    user_id: int,
    access_level: str,
    can_view_financials: bool = False,
    granted_by: Optional[int] = None,
) -> DecisionAccess:
    """Выдать / обновить доступ пользователя к решению."""
    existing = db.query(DecisionAccess).filter(
        DecisionAccess.decision_id == decision_id,
        DecisionAccess.user_id == user_id,
    ).first()

    if existing:
        existing.access_level = access_level
        existing.can_view_financials = can_view_financials
        existing.granted_by = granted_by
    else:
        existing = DecisionAccess(
            decision_id=decision_id,
            user_id=user_id,
            access_level=access_level,
            can_view_financials=can_view_financials,
            granted_by=granted_by,
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return existing


def revoke_decision_access(db: Session, decision_id: int, user_id: int) -> bool:
    """Отозвать доступ к решению."""
    existing = db.query(DecisionAccess).filter(
        DecisionAccess.decision_id == decision_id,
        DecisionAccess.user_id == user_id,
    ).first()
    if not existing:
        return False
    db.delete(existing)
    db.commit()
    return True


def check_decision_access(
    db: Session,
    decision_id: int,
    user_id: int,
    required_level: str = "viewer",
) -> dict:
    """
    Проверить доступ пользователя к решению.
    Иерархия: owner > editor > viewer.
    """
    levels = {"owner": 3, "editor": 2, "viewer": 1}

    access = db.query(DecisionAccess).filter(
        DecisionAccess.decision_id == decision_id,
        DecisionAccess.user_id == user_id,
    ).first()

    if not access:
        return {
            "allowed": False,
            "level": None,
            "can_view_financials": False,
            "reason": "no_access_record",
        }

    user_level = levels.get(access.access_level, 0)
    required = levels.get(required_level, 0)

    return {
        "allowed": user_level >= required,
        "level": access.access_level,
        "can_view_financials": access.can_view_financials,
        "reason": "granted" if user_level >= required else "insufficient_level",
    }
