"""
Роутер бизнес-кейсов — PORT-001, Фаза 4.

Эндпоинты:
    GET  /business-cases                — список всех бизнес-кейсов
    GET  /business-cases/categories     — категории
    GET  /business-cases/{case_id}      — один кейс
    POST /business-cases/validate       — валидация всех кейсов через аналитику
    POST /business-cases/evaluate       — оценка кейса пользователя по анкете (NPV, IRR, PI)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.services.analytics.business_cases import (
    _BUSINESS_CASES,
    get_business_case_by_id,
    get_business_cases,
    get_categories,
)
from app.services.analytics.dcf_service import _irr_bisection, _npv

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/business-cases", tags=["Business Cases"])


@router.get("", summary="Список бизнес-кейсов")
async def list_cases(
        category: str | None = None,
        _current_user=Depends(get_current_user),
):
    """Получить все 50+ бизнес-кейсов (или по категории)."""
    cases = get_business_cases()
    if category:
        cases = [c for c in cases if c["category"] == category]
    return {"total": len(cases), "cases": cases}


@router.get("/categories", summary="Категории бизнес-кейсов")
async def list_categories(_current_user=Depends(get_current_user)):
    """Получить список категорий с количеством кейсов."""
    return {"categories": get_categories()}


@router.get("/{case_id}", summary="Один бизнес-кейс")
async def get_case(case_id: str, _current_user=Depends(get_current_user)):
    """Получить детали бизнес-кейса по ID."""
    case = get_business_case_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Бизнес-кейс не найден")
    return case


@router.post("/validate", summary="Валидация всех бизнес-кейсов")
async def validate_all_cases(_current_user=Depends(get_current_user)):
    """
    Прогоняет все 50+ бизнес-кейсов через аналитический движок (NPV, IRR).
    Возвращает pass/fail статус для каждого кейса.
    """
    results = []
    passed = 0
    failed = 0

    for case in _BUSINESS_CASES:
        case_id = case["id"]
        name = case["name"]
        initial = case["initial_investment"]
        flows = case["cash_flows"]
        discount = case["discount_rate"]

        try:
            full_flows = [-initial] + flows
            npv = _npv(discount, full_flows)
            irr = _irr_bisection(full_flows)

            # Простой payback
            cumulative = -initial
            payback_years = None
            for t, cf in enumerate(flows, 1):
                cumulative += cf
                if cumulative >= 0:
                    payback_years = t
                    break

            # Profitability index
            pv_inflows = sum(cf / ((1 + discount) ** t) for t, cf in enumerate(flows, 1))
            pi = pv_inflows / initial if initial > 0 else 0

            # Валидация: NPV > 0 и IRR > discount_rate — проект рентабельный
            is_valid = npv > 0 and (irr is not None and irr > discount)

            results.append({
                "id": case_id,
                "name": name,
                "category": case["category"],
                "status": "pass" if is_valid else "fail",
                "npv_mln": round(npv, 2),
                "irr": round(irr * 100, 2) if irr is not None else None,
                "payback_years": payback_years,
                "profitability_index": round(pi, 3),
                "discount_rate_pct": round(discount * 100, 1),
                "initial_investment_mln": initial,
            })
            if is_valid:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error("Ошибка валидации кейса %s: %s", case_id, e)
            results.append({
                "id": case_id,
                "name": name,
                "category": case["category"],
                "status": "error",
                "error": str(e),
            })
            failed += 1

    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "pass_rate": round(passed / len(results) * 100, 1) if results else 0,
        "results": results,
    }


# ─── Модель анкеты пользователя ───
class UserCaseForm(BaseModel):
    # 1. Основная информация
    project_name: str = Field(..., description="Название проекта")
    industry: str = Field(..., description="Отрасль")
    region: str = Field(..., description="Регион")
    legal_form: str = Field(..., description="Организационно-правовая форма")
    project_stage: str = Field(..., description="Стадия проекта (идея, стартап, расширение)")

    # 2. Финансы
    initial_investment_mln: float = Field(..., gt=0, description="Сумма инвестиций (млн UZS)")
    equity_share_pct: float = Field(..., ge=0, le=100, description="Доля собственного капитала (%)")
    debt_share_pct: float = Field(..., ge=0, le=100, description="Доля заёмного капитала (%)")
    interest_rate_pct: float = Field(..., ge=0, description="Процентная ставка по кредиту (%)")
    discount_rate_pct: float = Field(..., gt=0, description="Ставка дисконтирования (%)")

    # 3. Выручка и затраты
    annual_revenue_mln: float = Field(..., gt=0, description="Ожидаемая годовая выручка (млн UZS)")
    annual_costs_mln: float = Field(..., gt=0, description="Ежегодные операционные затраты (млн UZS)")
    revenue_growth_pct: float = Field(0.0, description="Ежегодный рост выручки (%)")
    project_years: int = Field(..., gt=0, le=30, description="Горизонт проекта (лет)")
    tax_rate_pct: float = Field(15.0, ge=0, le=60, description="Ставка налога на прибыль (%)")

    # 4. Риски и прочее
    risk_level: str = Field(..., description="Уровень риска (низкий / средний / высокий)")
    market_competition: str = Field(..., description="Конкурентная среда (низкая / средняя / высокая)")
    has_state_support: bool = Field(False, description="Наличие государственной поддержки")
    export_share_pct: float = Field(0.0, ge=0, le=100, description="Доля экспорта в выручке (%)")
    additional_notes: Optional[str] = Field(None, description="Дополнительные сведения о проекте")


@router.post("/evaluate", summary="Оценка кейса пользователя (NPV, IRR, PI)")
async def evaluate_user_case(
    form: UserCaseForm,
    _current_user=Depends(get_current_user),
):
    """
    Принимает заполненную пользователем анкету (20 вопросов) и возвращает
    точные финансовые показатели: NPV, IRR, PI, срок окупаемости.
    """
    discount = form.discount_rate_pct / 100.0
    tax = form.tax_rate_pct / 100.0
    initial = form.initial_investment_mln
    years = form.project_years
    growth = form.revenue_growth_pct / 100.0

    # Строим денежные потоки по годам
    cash_flows = []
    for t in range(1, years + 1):
        revenue = form.annual_revenue_mln * ((1 + growth) ** (t - 1))
        costs = form.annual_costs_mln
        ebit = revenue - costs
        # Учёт процентов по кредиту (упрощённо — только в первые годы)
        debt = initial * (form.debt_share_pct / 100.0)
        interest = debt * (form.interest_rate_pct / 100.0) if t <= years else 0
        ebt = ebit - interest
        net_income = ebt * (1 - tax) if ebt > 0 else ebt
        cash_flows.append(net_income)

    full_flows = [-initial] + cash_flows

    try:
        npv = _npv(discount, full_flows)
        irr = _irr_bisection(full_flows)

        # Срок окупаемости
        cumulative = -initial
        payback_years = None
        for t, cf in enumerate(cash_flows, 1):
            cumulative += cf
            if cumulative >= 0:
                payback_years = t
                break

        # Profitability Index
        pv_inflows = sum(cf / ((1 + discount) ** t) for t, cf in enumerate(cash_flows, 1))
        pi = pv_inflows / initial if initial > 0 else 0

        is_viable = npv > 0 and (irr is not None and irr > discount)

        # Рекомендация
        if is_viable and pi >= 1.2:
            recommendation = "Проект привлекателен для инвестирования. Высокая рентабельность."
        elif is_viable:
            recommendation = "Проект рентабельный. Рекомендуется дополнительный анализ рисков."
        else:
            recommendation = "Проект не окупается при текущих параметрах. Пересмотрите условия."

        return {
            "status": "ok",
            "project_name": form.project_name,
            "industry": form.industry,
            "region": form.region,
            "npv_mln": round(npv, 2),
            "irr_pct": round(irr * 100, 2) if irr is not None else None,
            "profitability_index": round(pi, 3),
            "payback_years": payback_years,
            "discount_rate_pct": form.discount_rate_pct,
            "initial_investment_mln": initial,
            "project_years": years,
            "is_viable": is_viable,
            "recommendation": recommendation,
            "cash_flows": [round(cf, 2) for cf in cash_flows],
        }
    except Exception as e:
        logger.error("Ошибка оценки пользовательского кейса: %s", e)
        raise HTTPException(status_code=500, detail=f"Ошибка расчёта: {str(e)}")
