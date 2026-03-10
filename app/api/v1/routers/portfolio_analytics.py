"""
Роутер портфельной аналитики — DCF/NPV/IRR, What-If, Монте-Карло, бизнес-кейсы.

Эндпоинты:
- POST /portfolio-analytics/dcf              — расчёт DCF/NPV/IRR
- POST /portfolio-analytics/what-if          — сценарный анализ (What-If)
- POST /portfolio-analytics/monte-carlo      — симуляция Монте-Карло
- GET  /portfolio-analytics/business-cases   — список бизнес-кейсов
- GET  /portfolio-analytics/business-cases/{case_id}          — один кейс
- POST /portfolio-analytics/business-cases/{case_id}/calculate — расчёт по кейсу
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.services.portfolio_analytics import (
    calculate_dcf,
    what_if_analysis,
    monte_carlo_simulation,
    get_business_cases,
    get_business_case_by_id,
    get_business_cases_by_category,
    get_categories,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio-analytics", tags=["portfolio-analytics"])


# ─── Pydantic-схемы запросов ─────────────────────────────────────────────────


class DCFRequest(BaseModel):
    """Запрос расчёта DCF/NPV/IRR."""
    cash_flows: List[float] = Field(
        ..., min_length=1, max_length=30,
        description="Прогнозные денежные потоки по годам (млн UZS)",
    )
    discount_rate: float = Field(
        ..., gt=0, lt=1.0,
        description="Ставка дисконтирования (WACC), например 0.18",
    )
    terminal_growth: float = Field(
        0.03, ge=0, lt=0.15,
        description="Темп терминального роста (модель Гордона)",
    )
    initial_investment: float = Field(
        0, ge=0,
        description="Начальная инвестиция (положительное число, млн UZS)",
    )
    currency: str = Field("UZS", description="Валюта: UZS или USD")


class ScenarioInput(BaseModel):
    """Пользовательский сценарий для What-If анализа."""
    name: str = Field(..., description="Название сценария")
    cf_multiplier: float = Field(1.0, gt=0, description="Множитель денежных потоков")
    discount_delta: float = Field(0.0, description="Сдвиг ставки дисконтирования")
    description: str = Field("", description="Описание сценария")


class WhatIfRequest(BaseModel):
    """Запрос What-If сценарного анализа."""
    base_cash_flows: List[float] = Field(
        ..., min_length=1, max_length=30,
        description="Базовые прогнозные денежные потоки (млн UZS)",
    )
    base_discount_rate: float = Field(
        ..., gt=0, lt=1.0,
        description="Базовая ставка дисконтирования",
    )
    initial_investment: float = Field(0, ge=0, description="Начальная инвестиция (млн UZS)")
    terminal_growth: float = Field(0.03, ge=0, lt=0.15, description="Терминальный рост")
    scenarios: Optional[List[ScenarioInput]] = Field(
        None, max_length=10,
        description="Пользовательские сценарии (до 10)",
    )
    variables: Optional[List[str]] = Field(
        None, description="Переменные для анализа чувствительности",
    )


class MonteCarloRequest(BaseModel):
    """Запрос симуляции Монте-Карло."""
    base_cash_flows: List[float] = Field(
        ..., min_length=1, max_length=30,
        description="Базовые прогнозные денежные потоки (млн UZS)",
    )
    base_discount_rate: float = Field(
        ..., gt=0, lt=1.0,
        description="Базовая ставка дисконтирования",
    )
    initial_investment: float = Field(0, ge=0, description="Начальная инвестиция (млн UZS)")
    terminal_growth: float = Field(0.03, ge=0, lt=0.15, description="Терминальный рост")
    num_simulations: int = Field(
        5000, ge=100, le=50000,
        description="Количество симуляций (100-50000)",
    )
    volatility: float = Field(
        0.25, gt=0, le=1.0,
        description="Волатильность денежных потоков (σ)",
    )
    discount_volatility: float = Field(
        0.05, ge=0, le=0.5,
        description="Волатильность ставки дисконтирования",
    )
    uz_calibration: bool = Field(
        True, description="Калибровка под макропараметры Узбекистана",
    )
    autocorrelation: float = Field(
        0.0, ge=-1.0, le=1.0,
        description="Автокорреляция между годовыми потоками",
    )
    seed: Optional[int] = Field(
        None, description="Зерно генератора (для воспроизводимости)",
    )


class BusinessCaseCalculateRequest(BaseModel):
    """Запрос расчёта DCF по бизнес-кейсу с пользовательскими параметрами."""
    discount_rate: Optional[float] = Field(
        None, gt=0, lt=1.0,
        description="Своя ставка дисконтирования (если не указана — используется из кейса)",
    )
    terminal_growth: float = Field(0.03, ge=0, lt=0.15, description="Терминальный рост")
    cf_multiplier: float = Field(
        1.0, gt=0, le=5.0,
        description="Множитель денежных потоков (масштабирование)",
    )
    investment_multiplier: float = Field(
        1.0, gt=0, le=5.0,
        description="Множитель начальной инвестиции",
    )


# ─── Эндпоинты ──────────────────────────────────────────────────────────────


@router.post(
    "/dcf",
    summary="Расчёт DCF / NPV / IRR",
    response_description="NPV, IRR, период окупаемости, таблица чувствительности",
)
async def dcf_endpoint(
    request: DCFRequest,
    _current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Расчёт модели дисконтированных денежных потоков (DCF).

    Возвращает: NPV, IRR (бисекция), простой и дисконтированный payback,
    индекс рентабельности, терминальную стоимость (модель Гордона),
    годовую разбивку PV и таблицу чувствительности (±5% по ставке).
    """
    try:
        result = await calculate_dcf(
            cash_flows=request.cash_flows,
            discount_rate=request.discount_rate,
            terminal_growth=request.terminal_growth,
            initial_investment=request.initial_investment,
            currency=request.currency,
        )
    except Exception as e:
        logger.error("Ошибка DCF расчёта: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при расчёте DCF")

    return result


@router.post(
    "/what-if",
    summary="Сценарный анализ (What-If)",
    response_description="Сценарии, торнадо, паутинный график, безубыточность",
)
async def what_if_endpoint(
    request: WhatIfRequest,
    _current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Сценарный анализ инвестиционного проекта.

    Включает 3 встроенных сценария (базовый, оптимистичный, пессимистичный),
    пользовательские сценарии, торнадо-анализ чувствительности,
    данные для паутинного графика (spider plot), анализ безубыточности.
    """
    scenarios_raw = None
    if request.scenarios:
        scenarios_raw = [s.model_dump() for s in request.scenarios]

    try:
        result = await what_if_analysis(
            base_cash_flows=request.base_cash_flows,
            base_discount_rate=request.base_discount_rate,
            initial_investment=request.initial_investment,
            terminal_growth=request.terminal_growth,
            scenarios=scenarios_raw,
            variables=request.variables,
        )
    except Exception as e:
        logger.error("Ошибка What-If анализа: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при сценарном анализе")

    return result


@router.post(
    "/monte-carlo",
    summary="Симуляция Монте-Карло",
    response_description="Распределение NPV, VaR, перцентили, гистограмма",
)
async def monte_carlo_endpoint(
    request: MonteCarloRequest,
    _current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Монте-Карло симуляция инвестиционного проекта.

    Чистый Python (без numpy). При uz_calibration=True корректирует
    параметры под инфляцию и ставку рефинансирования ЦБ Узбекистана.

    Возвращает: статистику NPV (среднее, медиана, σ), перцентили P5-P95,
    VaR (95% и 99%), вероятность прибыли, гистограмму (20 бинов).
    """
    try:
        result = await monte_carlo_simulation(
            base_cash_flows=request.base_cash_flows,
            base_discount_rate=request.base_discount_rate,
            initial_investment=request.initial_investment,
            terminal_growth=request.terminal_growth,
            num_simulations=request.num_simulations,
            volatility=request.volatility,
            discount_volatility=request.discount_volatility,
            uz_calibration=request.uz_calibration,
            autocorrelation=request.autocorrelation,
            seed=request.seed,
        )
    except Exception as e:
        logger.error("Ошибка Монте-Карло: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при симуляции Монте-Карло")

    return result


@router.get(
    "/business-cases",
    summary="Список инвестиционных бизнес-кейсов Узбекистана",
    response_description="50+ бизнес-кейсов с параметрами",
)
async def list_business_cases(
    category: Optional[str] = Query(
        None,
        description="Фильтр по категории: agriculture, food_processing, trade, "
                    "construction, manufacturing, it_services, transport, tourism",
    ),
    risk_level: Optional[str] = Query(
        None, description="Фильтр по уровню риска: low, medium, high",
    ),
    _current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Получение списка инвестиционных бизнес-кейсов для рынка Узбекистана.

    Суммы в миллионах UZS. Фильтрация по категории и уровню риска.
    """
    if category:
        cases = get_business_cases_by_category(category)
        cases = [
            {
                "id": c["id"],
                "name": c["name"],
                "category": c["category"],
                "category_name": c["category_name"],
                "industry": c["industry"],
                "description": c["description"],
                "initial_investment_mln": c["initial_investment"],
                "discount_rate": c["discount_rate"],
                "risk_level": c["risk_level"],
                "typical_payback": c["typical_payback"],
                "region": c["region"],
                "years": len(c["cash_flows"]),
            }
            for c in cases
        ]
    else:
        cases = get_business_cases()

    if risk_level:
        cases = [c for c in cases if c["risk_level"] == risk_level]

    categories = get_categories()

    return {
        "total": len(cases),
        "categories": categories,
        "cases": cases,
    }


@router.get(
    "/business-cases/{case_id}",
    summary="Бизнес-кейс с полным расчётом DCF",
    response_description="Кейс + автоматический DCF расчёт",
)
async def get_single_business_case(
    case_id: str,
    _current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Получение одного бизнес-кейса по ID с автоматическим расчётом DCF.

    Возвращает параметры кейса и полный DCF-расчёт с NPV, IRR,
    периодом окупаемости и таблицей чувствительности.
    """
    case = get_business_case_by_id(case_id)
    if case is None:
        raise HTTPException(
            status_code=404,
            detail=f"Бизнес-кейс '{case_id}' не найден",
        )

    # Автоматический расчёт DCF
    try:
        dcf_result = await calculate_dcf(
            cash_flows=case["cash_flows"],
            discount_rate=case["discount_rate"],
            initial_investment=case["initial_investment"],
            terminal_growth=0.03,
            currency="UZS",
        )
    except Exception as e:
        logger.error("Ошибка DCF для кейса %s: %s", case_id, e, exc_info=True)
        dcf_result = {"error": "Не удалось рассчитать DCF"}

    return {
        "case": case,
        "dcf": dcf_result,
        "note": "Суммы в миллионах UZS",
    }


@router.post(
    "/business-cases/{case_id}/calculate",
    summary="Расчёт DCF по бизнес-кейсу с параметрами",
    response_description="Полный DCF + What-If + Монте-Карло",
)
async def calculate_business_case(
    case_id: str,
    request: BusinessCaseCalculateRequest,
    _current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Запуск полного расчёта по бизнес-кейсу с пользовательскими параметрами.

    Позволяет переопределить ставку дисконтирования, масштабировать
    денежные потоки и инвестиции. Возвращает DCF + What-If + Монте-Карло.
    """
    case = get_business_case_by_id(case_id)
    if case is None:
        raise HTTPException(
            status_code=404,
            detail=f"Бизнес-кейс '{case_id}' не найден",
        )

    # Применяем множители
    adj_cash_flows = [cf * request.cf_multiplier for cf in case["cash_flows"]]
    adj_investment = case["initial_investment"] * request.investment_multiplier
    discount_rate = request.discount_rate or case["discount_rate"]

    try:
        dcf_result = await calculate_dcf(
            cash_flows=adj_cash_flows,
            discount_rate=discount_rate,
            terminal_growth=request.terminal_growth,
            initial_investment=adj_investment,
            currency="UZS",
        )
    except Exception as e:
        logger.error("Ошибка DCF для кейса %s: %s", case_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при расчёте DCF")

    try:
        whatif_result = await what_if_analysis(
            base_cash_flows=adj_cash_flows,
            base_discount_rate=discount_rate,
            initial_investment=adj_investment,
            terminal_growth=request.terminal_growth,
        )
    except Exception as e:
        logger.error("Ошибка What-If для кейса %s: %s", case_id, e, exc_info=True)
        whatif_result = {"error": "Не удалось выполнить What-If анализ"}

    try:
        mc_result = await monte_carlo_simulation(
            base_cash_flows=adj_cash_flows,
            base_discount_rate=discount_rate,
            initial_investment=adj_investment,
            terminal_growth=request.terminal_growth,
            num_simulations=3000,
            uz_calibration=True,
        )
    except Exception as e:
        logger.error("Ошибка Монте-Карло для кейса %s: %s", case_id, e, exc_info=True)
        mc_result = {"error": "Не удалось выполнить симуляцию Монте-Карло"}

    return {
        "case": {
            "id": case["id"],
            "name": case["name"],
            "category_name": case["category_name"],
            "industry": case["industry"],
            "description": case["description"],
            "region": case["region"],
        },
        "parameters": {
            "discount_rate": discount_rate,
            "terminal_growth": request.terminal_growth,
            "cf_multiplier": request.cf_multiplier,
            "investment_multiplier": request.investment_multiplier,
            "initial_investment_mln": adj_investment,
            "cash_flows_mln": adj_cash_flows,
        },
        "dcf": dcf_result,
        "what_if": whatif_result,
        "monte_carlo": mc_result,
        "note": "Суммы в миллионах UZS",
    }
