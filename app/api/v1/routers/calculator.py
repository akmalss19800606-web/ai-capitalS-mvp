"""
Investment Calculator Pro Router - CALC-003
Endpoints: dcf, wacc, monte-carlo, sensitivity, benchmarks, compare, full, tax-rates
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from app.api.v1.deps import get_current_user
from app.services.calculator_service import InvestmentCalculatorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calculator", tags=["Investment Calculator"])
calc = InvestmentCalculatorService


class DCFRequest(BaseModel):
    cash_flows: List[float] = Field(..., min_length=1)
    discount_rate: float = Field(0.10, ge=0, le=1)
    terminal_growth: float = Field(0.0, ge=0, le=0.2)
    initial_investment: float = Field(0, ge=0)
    tax_regime: str = Field("general")
    custom_tax_rate: Optional[float] = None
    currency: str = Field("USD")
    industry: Optional[str] = None
    years: Optional[int] = None


class WACCRequest(BaseModel):
    equity_weight: float = Field(0.6, ge=0, le=1)
    debt_weight: float = Field(0.4, ge=0, le=1)
    risk_free_rate: float = Field(0.043, ge=0, le=1)
    beta: float = Field(1.0, ge=0, le=5)
    equity_risk_premium: float = Field(0.055, ge=0, le=1)
    country_risk_premium: float = Field(0.055, ge=0, le=1)
    size_premium: float = Field(0.025, ge=0, le=1)
    cost_of_debt: float = Field(0.228, ge=0, le=1)
    tax_rate: float = Field(0.15, ge=0, le=1)

    @model_validator(mode="after")
    def weights_sum_to_one(self):
        total = self.equity_weight + self.debt_weight
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"equity_weight + debt_weight must equal 1.0, got {total}")
        return self


class MonteCarloRequest(BaseModel):
    initial_investment: float = Field(..., gt=0)
    base_cash_flows: List[float] = Field(..., min_length=1)
    discount_rate: float = Field(0.10, ge=0, le=1)
    n_simulations: int = Field(10000, ge=100, le=50000)
    revenue_std: float = Field(0.15, ge=0, le=1)
    cost_std: float = Field(0.10, ge=0, le=1)
    rate_std: float = Field(0.02, ge=0, le=0.5)
    annual_cash_flow: Optional[float] = None
    years: Optional[int] = None
    iterations: Optional[int] = None
    volatility: Optional[float] = None


class SensitivityRequest(BaseModel):
    cash_flows: List[float] = Field(..., min_length=1)
    discount_rate: float = Field(0.10, ge=0, le=1)
    initial_investment: float = Field(..., gt=0)
    variation_pct: float = Field(20.0, ge=1, le=50)


class BenchmarkRequest(BaseModel):
    npv: float = Field(0)
    irr_pct: float = Field(0)
    irr: Optional[float] = None
    investment_usd: float = Field(0, ge=0)
    horizon_years: int = Field(3, ge=1, le=30)
    industry: Optional[str] = None
    payback_years: Optional[float] = None


class FullAnalysisRequest(BaseModel):
    cash_flows: List[float] = Field(..., min_length=2)
    discount_rate: float = Field(0.10, ge=0, le=1)
    initial_investment: float = Field(0, ge=0)
    equity: float = Field(0, ge=0)
    debt: float = Field(0, ge=0)
    cost_equity: float = Field(0.12, ge=0, le=1)
    cost_debt: float = Field(0.08, ge=0, le=1)
    tax_rate: float = Field(0.15, ge=0, le=1)
    terminal_growth: float = Field(0.0, ge=0, le=0.2)
    tax_regime: str = Field("general")
    currency: str = Field("USD")


class CompareRequest(BaseModel):
    scenarios: List[FullAnalysisRequest] = Field(..., min_length=2, max_length=5)


@router.post("/dcf", summary="DCF & ROI Analysis")
async def calculate_dcf(body: DCFRequest, _u=Depends(get_current_user)):
    try:
        return calc.calculate_dcf(
            cash_flows=body.cash_flows, discount_rate=body.discount_rate,
            terminal_growth=body.terminal_growth, initial_investment=body.initial_investment,
            tax_regime=body.tax_regime, custom_tax_rate=body.custom_tax_rate, currency=body.currency,
        )
    except Exception as e:
        logger.error("DCF error: %s", e)
        raise HTTPException(status_code=500, detail="DCF calculation error")


@router.post("/wacc", summary="WACC via CAPM")
async def calculate_wacc(body: WACCRequest, _u=Depends(get_current_user)):
    try:
        return calc.calculate_wacc_capm(**body.dict())
    except Exception as e:
        logger.error("WACC error: %s", e)
        raise HTTPException(status_code=500, detail="WACC calculation error")


@router.post("/monte-carlo", summary="Monte Carlo NPV Simulation")
async def monte_carlo(body: MonteCarloRequest, _u=Depends(get_current_user)):
    try:
        inv = body.initial_investment
        cfs = body.base_cash_flows
        if body.annual_cash_flow and body.years and not cfs:
            cfs = [body.annual_cash_flow] * body.years
        n = body.iterations or body.n_simulations
        return calc.monte_carlo_npv(
            initial_investment=inv, base_cash_flows=cfs,
            discount_rate=body.discount_rate, n_simulations=min(n, 50000),
            revenue_std=body.volatility or body.revenue_std,
            cost_std=body.cost_std, rate_std=body.rate_std,
        )
    except Exception as e:
        logger.error("Monte Carlo error: %s", e)
        raise HTTPException(status_code=500, detail="Monte Carlo error")


@router.post("/sensitivity", summary="Sensitivity Analysis (Tornado + Spider)")
async def sensitivity(body: SensitivityRequest, _u=Depends(get_current_user)):
    try:
        return calc.sensitivity_analysis(
            cash_flows=body.cash_flows, discount_rate=body.discount_rate,
            initial_investment=body.initial_investment, variation_pct=body.variation_pct,
        )
    except Exception as e:
        logger.error("Sensitivity error: %s", e)
        raise HTTPException(status_code=500, detail="Sensitivity error")


@router.post("/benchmarks", summary="UZ Market Benchmarks 2026")
async def benchmarks(body: BenchmarkRequest, _u=Depends(get_current_user)):
    try:
        irr = body.irr or body.irr_pct
        return calc.get_benchmarks(npv=body.npv, irr_pct=irr, investment_usd=body.investment_usd, horizon_years=body.horizon_years)
    except Exception as e:
        logger.error("Benchmarks error: %s", e)
        raise HTTPException(status_code=500, detail="Benchmarks error")


@router.post("/full", summary="Full Investment Analysis")
async def full_analysis(body: FullAnalysisRequest, _u=Depends(get_current_user)):
    try:
        return calc.full_analysis(
            cash_flows=body.cash_flows, discount_rate=body.discount_rate,
            initial_investment=body.initial_investment, equity=body.equity, debt=body.debt,
            cost_equity=body.cost_equity, cost_debt=body.cost_debt, tax_rate=body.tax_rate,
            terminal_growth=body.terminal_growth, tax_regime=body.tax_regime, currency=body.currency,
        )
    except Exception as e:
        logger.error("Full analysis error: %s", e)
        raise HTTPException(status_code=500, detail="Full analysis error")


@router.post("/compare", summary="Compare up to 5 Scenarios")
async def compare_scenarios(body: CompareRequest, _u=Depends(get_current_user)):
    try:
        scenarios = [sc.dict() for sc in body.scenarios]
        return calc.compare_scenarios(scenarios)
    except Exception as e:
        logger.error("Compare error: %s", e)
        raise HTTPException(status_code=500, detail="Compare error")


@router.get("/tax-rates", summary="UZ Tax Regimes 2026")
async def get_tax_rates(_u=Depends(get_current_user)):
    return calc.get_tax_rates()


@router.get("/benchmarks", summary="UZ Benchmarks List 2026")
async def get_benchmarks_list(_u=Depends(get_current_user)):
    return calc.get_benchmarks_list()


@router.get("/wacc-defaults", summary="WACC Default Parameters (UZ 2026)")
async def get_wacc_defaults(_u=Depends(get_current_user)):
    return calc.get_wacc_defaults()


# ---- CALC-004: Data Table endpoint ----

class DataTableRequest(BaseModel):
    initial_investment: float = Field(..., gt=0, description="Начальные инвестиции")
    annual_revenue: float = Field(..., gt=0, description="Годовая выручка")
    annual_costs: float = Field(..., ge=0, description="Годовые затраты")
    years: int = Field(5, ge=1, le=30, description="Горизон	прогноза")
    discount_rate: float = Field(0.10, ge=0, le=1)
    revenue_growth: float = Field(0.05, ge=-0.5, le=2.0, description="Рост выручки в год")
    cost_growth: float = Field(0.03, ge=-0.5, le=2.0, description="Рост затрат в год")
    tax_rate: float = Field(0.15, ge=0, le=1)
    currency: str = Field("USD")


@router.post("/data-table", summary="Таблица расчётов по периодам (NPV, CF, IRR)")
async def data_table(
    body: DataTableRequest,
    _u=Depends(get_current_user),
):
    """Генерирует таблицу денежных потоков и накопленного NPV по годам для фронтенд."""
    try:
        rows = []
        cumulative_npv = -body.initial_investment
        cumulative_cf = -body.initial_investment
        revenue = body.annual_revenue
        costs = body.annual_costs
        payback_year = None

        for yr in range(1, body.years + 1):
            revenue *= (1 + body.revenue_growth) if yr > 1 else 1
            costs *= (1 + body.cost_growth) if yr > 1 else 1
            ebit = revenue - costs
            tax = max(0, ebit * body.tax_rate)
            net_cf = ebit - tax
            discount_factor = 1 / ((1 + body.discount_rate) ** yr)
            pv = net_cf * discount_factor
            cumulative_npv += pv
            cumulative_cf += net_cf
            if payback_year is None and cumulative_cf >= 0:
                payback_year = yr
            rows.append({
                "year": yr,
                "revenue": round(revenue, 2),
                "costs": round(costs, 2),
                "ebit": round(ebit, 2),
                "tax": round(tax, 2),
                "net_cash_flow": round(net_cf, 2),
                "discount_factor": round(discount_factor, 6),
                "present_value": round(pv, 2),
                "cumulative_npv": round(cumulative_npv, 2),
                "cumulative_cf": round(cumulative_cf, 2),
            })

        total_pv = sum(r["present_value"] for r in rows)
        total_cf = sum(r["net_cash_flow"] for r in rows)
        npv = total_pv - body.initial_investment

        return {
            "currency": body.currency,
            "initial_investment": body.initial_investment,
            "years": body.years,
            "discount_rate": body.discount_rate,
            "rows": rows,
            "summary": {
                "total_net_cf": round(total_cf, 2),
                "total_pv": round(total_pv, 2),
                "npv": round(npv, 2),
                "payback_year": payback_year,
                "roi_pct": round((total_cf / body.initial_investment - 1) * 100, 2) if body.initial_investment else 0,
            },
        }
    except Exception as e:
        logger.error("Data table error: %s", e)
        raise HTTPException(status_code=500, detail="Data table calculation error")
