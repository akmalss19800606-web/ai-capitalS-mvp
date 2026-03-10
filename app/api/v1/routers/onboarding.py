"""
Онбординг Wizard — пошаговый мастер настройки для новых пользователей.

5 шагов:
  1. Приветствие + выбор роли (Analyst / PM / Committee / Admin)
  2. Настройка профиля (имя, организация, телефон)
  3. Создание первого портфеля (название, валюта, тип)
  4. Подключение источников данных (AI-провайдеры, CBU, UZSE)
  5. Выбор шаблона дашборда (Аналитик / Руководитель / Инвестком)

Данные сохраняются в user.preferences["onboarding"].
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# ─── Схемы ───────────────────────────────────────────────────────────

class OnboardingStatusResponse(BaseModel):
    completed: bool = False
    current_step: int = 1
    total_steps: int = 5
    steps: list = []

class Step1Data(BaseModel):
    """Шаг 1: Выбор роли."""
    role: str  # analyst | portfolio_manager | committee_member | admin

class Step2Data(BaseModel):
    """Шаг 2: Профиль."""
    full_name: str
    organization: Optional[str] = None
    phone: Optional[str] = None

class Step3Data(BaseModel):
    """Шаг 3: Первый портфель."""
    portfolio_name: str = "Мой первый портфель"
    currency: str = "UZS"
    portfolio_type: str = "mixed"  # equity | debt | mixed | real_estate

class Step4Data(BaseModel):
    """Шаг 4: Источники данных."""
    enable_cbu: bool = True
    enable_uzse: bool = True
    enable_ai_groq: bool = True
    enable_ai_gemini: bool = True

class Step5Data(BaseModel):
    """Шаг 5: Шаблон дашборда."""
    dashboard_template: str = "analyst"  # analyst | executive | committee | custom


STEPS_META = [
    {"step": 1, "title": "Выбор роли", "description": "Выберите вашу роль в системе"},
    {"step": 2, "title": "Профиль", "description": "Заполните информацию о себе"},
    {"step": 3, "title": "Первый портфель", "description": "Создайте инвестиционный портфель"},
    {"step": 4, "title": "Источники данных", "description": "Подключите источники рыночных данных"},
    {"step": 5, "title": "Шаблон дашборда", "description": "Выберите готовый дашборд или создайте свой"},
]

DASHBOARD_TEMPLATES = {
    "analyst": {
        "name": "Аналитик",
        "widgets": ["portfolio_summary", "market_overview", "ai_insights", "charts_waterfall", "dd_scoring"],
    },
    "executive": {
        "name": "Руководитель",
        "widgets": ["kpi_cards", "portfolio_trend", "decisions_status", "risk_heatmap"],
    },
    "committee": {
        "name": "Инвестком",
        "widgets": ["decisions_pipeline", "dd_scoring", "stress_test", "voting_status"],
    },
}


# ─── Хелперы ─────────────────────────────────────────────────────────

def _get_onboarding_data(user: User) -> dict:
    """Получить данные онбординга из preferences."""
    prefs = {}
    if hasattr(user, "preferences") and user.preferences:
        prefs = user.preferences if isinstance(user.preferences, dict) else {}
    return prefs.get("onboarding", {})


def _save_onboarding_data(user: User, data: dict, db: Session):
    """Сохранить данные онбординга."""
    prefs = {}
    if hasattr(user, "preferences") and user.preferences:
        prefs = user.preferences if isinstance(user.preferences, dict) else {}
    prefs["onboarding"] = data
    user.preferences = prefs
    db.commit()


# ─── Эндпоинты ───────────────────────────────────────────────────────

@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
):
    """Получить текущий статус онбординга."""
    ob = _get_onboarding_data(current_user)
    completed = ob.get("completed", False)
    current_step = ob.get("current_step", 1)

    steps = []
    for meta in STEPS_META:
        step_num = meta["step"]
        steps.append({
            **meta,
            "status": "completed" if step_num < current_step else (
                "current" if step_num == current_step and not completed else
                "completed" if completed else "pending"
            ),
        })

    return OnboardingStatusResponse(
        completed=completed,
        current_step=current_step if not completed else 5,
        total_steps=5,
        steps=steps,
    )


@router.post("/step/1")
async def onboarding_step1(
    data: Step1Data,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Шаг 1: Выбор роли."""
    valid_roles = ["analyst", "portfolio_manager", "committee_member", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(400, f"Роль должна быть одной из: {', '.join(valid_roles)}")

    ob = _get_onboarding_data(current_user)
    ob["step1"] = {"role": data.role, "completed_at": datetime.now().isoformat()}
    ob["current_step"] = 2
    _save_onboarding_data(current_user, ob, db)

    return {"status": "ok", "next_step": 2, "message": f"Роль {data.role} сохранена"}


@router.post("/step/2")
async def onboarding_step2(
    data: Step2Data,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Шаг 2: Настройка профиля."""
    # Обновляем профиль пользователя
    if hasattr(current_user, "full_name"):
        current_user.full_name = data.full_name
    if data.organization and hasattr(current_user, "organization"):
        current_user.organization = data.organization

    ob = _get_onboarding_data(current_user)
    ob["step2"] = {
        "full_name": data.full_name,
        "organization": data.organization,
        "phone": data.phone,
        "completed_at": datetime.now().isoformat(),
    }
    ob["current_step"] = 3
    _save_onboarding_data(current_user, ob, db)

    return {"status": "ok", "next_step": 3, "message": "Профиль обновлён"}


@router.post("/step/3")
async def onboarding_step3(
    data: Step3Data,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Шаг 3: Создание первого портфеля."""
    from app.db.models.portfolio import Portfolio

    # Создаём портфель
    portfolio = Portfolio(
        name=data.portfolio_name,
        description=f"Портфель создан при онбординге. Тип: {data.portfolio_type}. Валюта: {data.currency}.",
        user_id=current_user.id,
    )
    db.add(portfolio)
    db.flush()

    ob = _get_onboarding_data(current_user)
    ob["step3"] = {
        "portfolio_id": portfolio.id,
        "portfolio_name": data.portfolio_name,
        "currency": data.currency,
        "portfolio_type": data.portfolio_type,
        "completed_at": datetime.now().isoformat(),
    }
    ob["current_step"] = 4
    _save_onboarding_data(current_user, ob, db)

    return {"status": "ok", "next_step": 4, "portfolio_id": portfolio.id}


@router.post("/step/4")
async def onboarding_step4(
    data: Step4Data,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Шаг 4: Подключение источников данных."""
    ob = _get_onboarding_data(current_user)
    ob["step4"] = {
        "enable_cbu": data.enable_cbu,
        "enable_uzse": data.enable_uzse,
        "enable_ai_groq": data.enable_ai_groq,
        "enable_ai_gemini": data.enable_ai_gemini,
        "completed_at": datetime.now().isoformat(),
    }
    ob["current_step"] = 5
    _save_onboarding_data(current_user, ob, db)

    return {"status": "ok", "next_step": 5, "sources_enabled": sum([
        data.enable_cbu, data.enable_uzse, data.enable_ai_groq, data.enable_ai_gemini
    ])}


@router.post("/step/5")
async def onboarding_step5(
    data: Step5Data,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Шаг 5: Выбор шаблона дашборда — завершение онбординга."""
    template = DASHBOARD_TEMPLATES.get(data.dashboard_template)
    if not template and data.dashboard_template != "custom":
        raise HTTPException(400, "Неизвестный шаблон дашборда")

    ob = _get_onboarding_data(current_user)
    ob["step5"] = {
        "dashboard_template": data.dashboard_template,
        "widgets": template["widgets"] if template else [],
        "completed_at": datetime.now().isoformat(),
    }
    ob["current_step"] = 5
    ob["completed"] = True
    ob["completed_at"] = datetime.now().isoformat()
    _save_onboarding_data(current_user, ob, db)

    return {
        "status": "ok",
        "completed": True,
        "message": "Онбординг завершён! Система настроена и готова к работе.",
        "dashboard_template": data.dashboard_template,
    }


@router.post("/skip")
async def skip_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Пропустить онбординг."""
    ob = _get_onboarding_data(current_user)
    ob["completed"] = True
    ob["skipped"] = True
    ob["completed_at"] = datetime.now().isoformat()
    _save_onboarding_data(current_user, ob, db)

    return {"status": "ok", "message": "Онбординг пропущен"}


@router.get("/templates")
async def get_dashboard_templates(
    current_user: User = Depends(get_current_user),
):
    """Получить доступные шаблоны дашбордов."""
    return {
        "templates": [
            {"id": k, "name": v["name"], "widgets_count": len(v["widgets"]), "widgets": v["widgets"]}
            for k, v in DASHBOARD_TEMPLATES.items()
        ]
    }
