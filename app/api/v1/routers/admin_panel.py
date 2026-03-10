"""
Админ-панель — управление пользователями, мониторинг системы, статистика.

Только для superuser / admin.

Эндпоинты:
  GET  /api/v1/admin/users — список пользователей с фильтрами
  PUT  /api/v1/admin/users/{user_id} — редактирование (роль, блокировка)
  POST /api/v1/admin/users/{user_id}/block — заблокировать пользователя
  POST /api/v1/admin/users/{user_id}/unblock — разблокировать
  POST /api/v1/admin/users/{user_id}/reset-password — сброс пароля
  GET  /api/v1/admin/monitoring — метрики системы
  GET  /api/v1/admin/ai-stats — статистика AI-провайдеров
  GET  /api/v1/admin/activity — последние действия пользователей
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Проверка admin ──────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Только superuser / admin."""
    is_admin = getattr(current_user, "is_superuser", False)
    if not is_admin:
        # Проверяем роль
        role = getattr(current_user, "role", None)
        if role and hasattr(role, "name"):
            is_admin = role.name.lower() in ("admin", "superadmin")
    if not is_admin:
        raise HTTPException(403, "Доступ только для администратора")
    return current_user


# ─── Схемы ───────────────────────────────────────────────────────────

class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: bool = True
    is_blocked: bool = False
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    portfolios_count: int = 0
    decisions_count: int = 0

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class ResetPasswordResponse(BaseModel):
    temporary_password: str
    message: str

class MonitoringResponse(BaseModel):
    total_users: int
    active_users_24h: int
    total_portfolios: int
    total_decisions: int
    total_ai_requests: int
    system_uptime: str
    database_size: str
    ai_providers: dict

class ActivityItem(BaseModel):
    user_email: str
    action: str
    entity: str
    timestamp: str


# ─── Эндпоинты: Пользователи ────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    search: Optional[str] = Query(None, description="Поиск по email или имени"),
    is_active: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Список всех пользователей с фильтрами."""
    query = db.query(User)

    if search:
        query = query.filter(
            User.email.ilike(f"%{search}%")
        )
    if is_active is not None:
        if hasattr(User, "is_active"):
            query = query.filter(User.is_active == is_active)

    users = query.offset(offset).limit(limit).all()

    result = []
    for u in users:
        # Считаем портфели и решения
        p_count = 0
        d_count = 0
        try:
            from app.db.models.portfolio import Portfolio
            p_count = db.query(func.count(Portfolio.id)).filter(
                Portfolio.user_id == u.id
            ).scalar() or 0
        except Exception:
            pass
        try:
            from app.db.models.decision import Decision
            d_count = db.query(func.count(Decision.id)).filter(
                Decision.user_id == u.id
            ).scalar() or 0
        except Exception:
            pass

        role_name = None
        if hasattr(u, "role") and u.role:
            role_name = u.role.name if hasattr(u.role, "name") else str(u.role)

        result.append(AdminUserResponse(
            id=u.id,
            email=u.email,
            full_name=getattr(u, "full_name", None),
            role=role_name,
            is_active=getattr(u, "is_active", True),
            is_blocked=getattr(u, "is_blocked", False),
            created_at=u.created_at.isoformat() if hasattr(u, "created_at") and u.created_at else None,
            last_login=getattr(u, "last_login", None),
            portfolios_count=p_count,
            decisions_count=d_count,
        ))

    return result


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Редактирование пользователя (роль, имя, активность)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    if data.full_name is not None and hasattr(user, "full_name"):
        user.full_name = data.full_name
    if data.is_active is not None and hasattr(user, "is_active"):
        user.is_active = data.is_active
    if data.role is not None and hasattr(user, "role_id"):
        # Ищем роль по имени
        try:
            from app.db.models.role import Role
            role = db.query(Role).filter(Role.name == data.role).first()
            if role:
                user.role_id = role.id
        except Exception:
            pass

    db.commit()
    db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=getattr(user, "full_name", None),
        role=data.role,
        is_active=getattr(user, "is_active", True),
        is_blocked=getattr(user, "is_blocked", False),
        created_at=user.created_at.isoformat() if hasattr(user, "created_at") and user.created_at else None,
        portfolios_count=0,
        decisions_count=0,
    )


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Заблокировать пользователя."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if user.id == current_user.id:
        raise HTTPException(400, "Нельзя заблокировать самого себя")

    if hasattr(user, "is_active"):
        user.is_active = False
    if hasattr(user, "is_blocked"):
        user.is_blocked = True
    db.commit()

    return {"status": "blocked", "user_id": user_id, "email": user.email}


@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Разблокировать пользователя."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    if hasattr(user, "is_active"):
        user.is_active = True
    if hasattr(user, "is_blocked"):
        user.is_blocked = False
    db.commit()

    return {"status": "unblocked", "user_id": user_id, "email": user.email}


@router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_user_password(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Сброс пароля пользователя (генерирует временный)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    temp_password = secrets.token_urlsafe(12)

    try:
        from app.core.security import get_password_hash
        user.hashed_password = get_password_hash(temp_password)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Ошибка сброса пароля: {e}")

    return ResetPasswordResponse(
        temporary_password=temp_password,
        message=f"Пароль пользователя {user.email} сброшен. Передайте временный пароль пользователю.",
    )


# ─── Эндпоинты: Мониторинг ──────────────────────────────────────────

@router.get("/monitoring", response_model=MonitoringResponse)
async def get_monitoring(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Метрики системы."""
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Активные за 24ч (упрощённо — все пользователи)
    active_24h = total_users  # TODO: трекинг last_activity

    total_portfolios = 0
    total_decisions = 0
    try:
        from app.db.models.portfolio import Portfolio
        total_portfolios = db.query(func.count(Portfolio.id)).scalar() or 0
    except Exception:
        pass
    try:
        from app.db.models.decision import Decision
        total_decisions = db.query(func.count(Decision.id)).scalar() or 0
    except Exception:
        pass

    # AI провайдеры
    ai_providers = {"groq": "active", "gemini": "active", "ollama": "unavailable"}
    try:
        from app.services.ai_service import _check_provider_available, AIProvider
        import asyncio
        for p in [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA]:
            available = await _check_provider_available(p)
            ai_providers[p.value] = "active" if available else "unavailable"
    except Exception:
        pass

    return MonitoringResponse(
        total_users=total_users,
        active_users_24h=active_24h,
        total_portfolios=total_portfolios,
        total_decisions=total_decisions,
        total_ai_requests=0,  # TODO: счётчик запросов
        system_uptime="running",
        database_size="—",
        ai_providers=ai_providers,
    )


@router.get("/ai-stats")
async def get_ai_stats(
    current_user: User = Depends(require_admin),
):
    """Статистика AI-провайдеров."""
    stats = {
        "providers": [],
        "total_requests": 0,
        "total_errors": 0,
    }

    try:
        from app.services.ai_service import _check_provider_available, AIProvider
        from app.core.config import settings

        for provider in [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA]:
            available = await _check_provider_available(provider)
            model = ""
            if provider == AIProvider.GROQ:
                model = settings.GROQ_MODEL
            elif provider == AIProvider.GEMINI:
                model = settings.GEMINI_MODEL
            elif provider == AIProvider.OLLAMA:
                model = settings.OLLAMA_MODEL

            stats["providers"].append({
                "name": provider.value,
                "model": model,
                "available": available,
                "requests_count": 0,  # TODO: трекинг
                "avg_response_time": "—",
                "error_rate": "0%",
            })
    except Exception as e:
        stats["error"] = str(e)

    return stats


@router.get("/activity", response_model=List[ActivityItem])
async def get_recent_activity(
    limit: int = Query(20, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Последние действия пользователей (из аудит-лога)."""
    items = []

    try:
        from app.db.models.audit import AuditEvent
        events = db.query(AuditEvent).order_by(
            desc(AuditEvent.created_at)
        ).limit(limit).all()

        for e in events:
            user_email = "—"
            if hasattr(e, "user_id") and e.user_id:
                user = db.query(User).filter(User.id == e.user_id).first()
                if user:
                    user_email = user.email

            items.append(ActivityItem(
                user_email=user_email,
                action=getattr(e, "action", ""),
                entity=f"{getattr(e, 'entity_type', '')} #{getattr(e, 'entity_id', '')}",
                timestamp=e.created_at.isoformat() if e.created_at else "",
            ))
    except Exception:
        # Если AuditEvent не существует — пустой список
        pass

    return items
