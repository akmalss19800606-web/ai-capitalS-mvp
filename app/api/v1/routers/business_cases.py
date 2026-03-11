"""
Роутер бизнес-кейсов — PORT-001, Фаза 4.

Эндпоинты:
  GET  /business-cases            — список всех бизнес-кейсов
  GET  /business-cases/categories — категории
  GET  /business-cases/{case_id}  — один кейс
  POST /business-cases/validate   — валидация всех кейсов через аналитику
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

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
