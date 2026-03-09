"""
users.py — управление пользователями.
Этап 0, Сессия 0.1: Добавлен auth guard + ограничение доступа (только superuser).

ВАЖНО: Создание пользователей через /auth/register, НЕ через /users/.
Эндпоинт POST /users/ удалён (дубликат /auth/register).
GET /users/ доступен только superuser (админ).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Список пользователей (только для superuser).
    Обычные пользователи получают 403.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для администратора",
        )
    return db.query(User).order_by(User.id).all()


@router.get("/me", response_model=UserRead)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Профиль текущего пользователя."""
    return current_user
