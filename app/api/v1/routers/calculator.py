"""
Роутер инвестиционного калькулятора — Фаза 3, CALC-001.

Эндпоинты:
  - POST /calculator/dcf — DCF расчёт
  - POST /calculator/npv — NPV расчёт
  - POST /calculator/irr — IRR расчёт
  - POST /calculator/payback — Payback Period
  - POST /calculator/wacc — WACC расчёт
  - POST /calculator/full — полный анализ
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.services.calculator_service import InvestmentCalculatorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calculator", tags=["Investment Calculator"])

calc = InvestmentCalculatorService


# ── Схемы запросов ─────────────────────────────────────────────


class CashFlowRequest(BaseModel):
    """Базовый запрос с денежными потоками."""
    cash_flows: list[float] = Field(
        ...,
        description="Денежные потоки [CF0, CF1, CF2, ...]. CF0 — начальная инвестиция (отрицательная).",
        min_length=1,
    )
    discount_rate: float = Field(
        0.10,
        description="Ставка дисконтирования (0.10 = 10%)",
        ge=0,
        le=1,
    )


class DCFRequest(CashFlowRequest):
    terminal_growth: float = Field(0.0, description="Ставка роста терминальной стоимости", ge=0, le=0.2)


class PaybackRequest(CashFlowRequest):
    pass


class IRRRequest(BaseModel):
    cash_flows: list[float] = Field(..., min_length=2)


class WACCRequest(BaseModel):
    equity: float = Field(..., description="Собственный капитал", ge=0)
    debt: float = Field(..., description="Заёмный капитал", ge=0)
    cost_equity: float = Field(0.12, description="Стоимость собственного капитала", ge=0, le=1)
    cost_debt: float = Field(0.08, description="Стоимость заёмного капитала", ge=0, le=1)
    tax_rate: float = Field(0.15, description="Ставка налога на прибыль", ge=0, le=1)


class FullAnalysisRequest(BaseModel):
    cash_flows: list[float] = Field(..., min_length=2)
    discount_rate: float = Field(0.10, ge=0, le=1)
    equity: float = Field(0, ge=0)
    debt: float = Field(0, ge=0)
    cost_equity: float = Field(0.12, ge=0, le=1)
    cost_debt: float = Field(0.08, ge=0, le=1)
    tax_rate: float = Field(0.15, ge=0, le=1)
    terminal_growth: float = Field(0.0, ge=0, le=0.2)


# ── Эндпоинты ─────────────────────────────────────────────────


@router.post("/dcf", summary="DCF — Discounted Cash Flow")
async def calculate_dcf(
    body: DCFRequest,
    _current_user=Depends(get_current_user),
):
    """
    Расчёт DCF с детализацией по периодам.

    Включает терминальную стоимость (Gordon Growth Model) если указана terminal_growth.
    """
    try:
        return calc.calculate_dcf(body.cash_flows, body.discount_rate, body.terminal_growth)
    except Exception as e:
        logger.error("Ошибка DCF: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка расчёта DCF")


@router.post("/npv", summary="NPV — Net Present Value")
async def calculate_npv(
    body: CashFlowRequest,
    _current_user=Depends(get_current_user),
):
    """
    Расчёт NPV (чистая приведённая стоимость).

    NPV > 0 — проект рентабелен.
    """
    try:
        return calc.calculate_npv(body.cash_flows, body.discount_rate)
    except Exception as e:
        logger.error("Ошибка NPV: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка расчёта NPV")


@router.post("/irr", summary="IRR — Internal Rate of Return")
async def calculate_irr(
    body: IRRRequest,
    _current_user=Depends(get_current_user),
):
    """
    Расчёт IRR (внутренняя ставка доходности).

    Использует numpy-financial, scipy или метод Ньютона.
    """
    try:
        return calc.calculate_irr(body.cash_flows)
    except Exception as e:
        logger.error("Ошибка IRR: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка расчёта IRR")


@router.post("/payback", summary="Payback Period")
async def calculate_payback(
    body: PaybackRequest,
    _current_user=Depends(get_current_user),
):
    """
    Расчёт срока окупаемости: простой + дисконтированный.
    """
    try:
        return calc.calculate_payback(body.cash_flows, body.discount_rate)
    except Exception as e:
        logger.error("Ошибка Payback: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка расчёта Payback")


@router.post("/wacc", summary="WACC — Weighted Average Cost of Capital")
async def calculate_wacc(
    body: WACCRequest,
    _current_user=Depends(get_current_user),
):
    """
    Расчёт WACC (средневзвешенная стоимость капитала).

    WACC = We × Re + Wd × Rd × (1 - T)
    """
    try:
        return calc.calculate_wacc(
            body.equity, body.debt, body.cost_equity, body.cost_debt, body.tax_rate
        )
    except Exception as e:
        logger.error("Ошибка WACC: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка расчёта WACC")


@router.post("/full", summary="Полный инвестиционный анализ")
async def full_analysis(
    body: FullAnalysisRequest,
    _current_user=Depends(get_current_user),
):
    """
    Полный анализ: DCF + NPV + IRR + Payback + WACC + рекомендация.

    Возвращает все метрики одним запросом с общей инвестиционной оценкой.
    """
    try:
        return calc.full_analysis(
            cash_flows=body.cash_flows,
            discount_rate=body.discount_rate,
            equity=body.equity,
            debt=body.debt,
            cost_equity=body.cost_equity,
            cost_debt=body.cost_debt,
            tax_rate=body.tax_rate,
            terminal_growth=body.terminal_growth,
        )
    except Exception as e:
        logger.error("Ошибка полного анализа: %s", e)
        raise HTTPException(status_code=500, detail="Ошибка расчёта")
