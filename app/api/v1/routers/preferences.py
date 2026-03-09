"""
Роутер: Персонализация UI.
Фаза 3, Сессия 4 — VIS-PERS-001.1–001.3.

Эндпоинты:
  GET  /preferences         — получить настройки текущего пользователя
  PUT  /preferences         — обновить настройки
  GET  /preferences/roles   — список доступных роль-видов
  GET  /preferences/role-config — конфиг для текущего роль-вида
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.schemas.collaboration import UserPreferencesUpdate, UserPreferencesResponse
from app.services.preferences_service import (
    get_preferences, update_preferences, get_role_view_config, list_role_views,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("", response_model=UserPreferencesResponse)
def api_get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить настройки текущего пользователя (или создать дефолт)."""
    prefs = get_preferences(db, current_user.id)
    return prefs


@router.put("", response_model=UserPreferencesResponse)
def api_update_preferences(
    req: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки пользователя."""
    try:
        prefs = update_preferences(db, current_user.id, **req.model_dump(exclude_unset=True))
        return prefs
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/roles")
def api_list_role_views(
    current_user: User = Depends(get_current_user),
):
    """Список доступных роль-специфичных представлений."""
    return list_role_views()


@router.get("/role-config")
def api_get_role_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить конфигурацию текущего роль-вида пользователя."""
    prefs = get_preferences(db, current_user.id)
    config = get_role_view_config(prefs.view_mode)
    return {
        "view_mode": prefs.view_mode,
        **config,
    }
