"""
Сервис персонализации UI — тема, роль-виды, настройки.
Фаза 3, Сессия 4 — VIS-PERS-001.1–001.3.
"""
import logging
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.db.models.collaboration import UserPreferences

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# ROLE-SPECIFIC VIEWS  (VIS-PERS-001.1)
# ═══════════════════════════════════════════════════════════════

ROLE_VIEWS = {
    "analyst": {
        "label": "Аналитик",
        "description": "Детальные данные, все метрики, полный набор фильтров",
        "default_sections": [
            "decisions", "analytics", "ai-analytics", "due-diligence",
            "stress-testing", "charts", "reports",
        ],
        "summary_level": "detailed",
    },
    "partner": {
        "label": "Партнёр",
        "description": "Executive summary, высокоуровневые KPI, ключевые решения",
        "default_sections": [
            "dashboard", "portfolios", "decisions", "reports",
        ],
        "summary_level": "executive",
    },
    "manager": {
        "label": "Портфельный менеджер",
        "description": "Портфельная аналитика, оптимизация, управление рисками",
        "default_sections": [
            "portfolios", "analytics", "stress-testing",
            "dashboard-builder", "charts",
        ],
        "summary_level": "portfolio",
    },
}

VALID_VIEW_MODES = set(ROLE_VIEWS.keys())
VALID_THEMES = {"light", "dark"}
VALID_FONT_SIZES = {"small", "medium", "large"}


# ═══════════════════════════════════════════════════════════════
# PREFERENCES CRUD
# ═══════════════════════════════════════════════════════════════

def get_preferences(db: Session, user_id: int) -> UserPreferences:
    """Получить или создать настройки пользователя."""
    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id,
    ).first()
    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def update_preferences(db: Session, user_id: int, **fields) -> UserPreferences:
    """Обновить настройки пользователя."""
    prefs = get_preferences(db, user_id)

    for key, val in fields.items():
        if val is None:
            continue
        if key == "view_mode" and val not in VALID_VIEW_MODES:
            raise ValueError(f"Недопустимый режим: {val}. Доступны: {', '.join(VALID_VIEW_MODES)}")
        if key == "theme" and val not in VALID_THEMES:
            raise ValueError(f"Недопустимая тема: {val}. Доступны: light, dark")
        if key == "font_size" and val not in VALID_FONT_SIZES:
            raise ValueError(f"Недопустимый размер шрифта: {val}. Доступны: small, medium, large")
        if key == "accent_color" and (not val.startswith("#") or len(val) != 7):
            raise ValueError("Цвет должен быть в формате #RRGGBB")
        if hasattr(prefs, key):
            setattr(prefs, key, val)

    db.commit()
    db.refresh(prefs)
    return prefs


def get_role_view_config(view_mode: str) -> Dict[str, Any]:
    """Получить конфигурацию роль-вида."""
    if view_mode not in ROLE_VIEWS:
        view_mode = "analyst"
    return ROLE_VIEWS[view_mode]


def list_role_views() -> list:
    """Список доступных роль-видов."""
    return [
        {"key": k, "label": v["label"], "description": v["description"]}
        for k, v in ROLE_VIEWS.items()
    ]
