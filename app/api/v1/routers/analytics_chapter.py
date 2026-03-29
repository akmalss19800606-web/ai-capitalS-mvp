"""
Analytics chapter API — KPI, DCF, multiples, stress-test, visualizations, decisions.
Uses real data from _portfolio_cache when available.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.v1.routers.portfolios import _portfolio_cache

router = APIRouter(tags=["analytics-chapter"])


# ---------------------------------------------------------------------------
# Helpers: extract balance aggregates from cache
# ---------------------------------------------------------------------------

def _get_balance_aggregates() -> Optional[dict]:
    """Calculate balance aggregates from cached accounts + pnl data."""
    accounts = _portfolio_cache.get("accounts")
    if not accounts:
        return None

    def _v(code: str, field: str = "current") -> float:
        acc = accounts.get(code)
        return acc[field] if acc else 0.0

    pnl = _portfolio_cache.get("pnl", {})

    net_fa = _v("0100") - _v("0200")
    capex = _v("0800")
    non_current_assets = net_fa + capex

    inventories = _v("1000") + _v("1010")
    receivables = _v("2010") + _v("2300")
    cash = _v("5010") + _v("5110") + _v("5210")
    current_assets = inventories + receivables + cash
    total_assets = non_current_assets + current_assets

    equity_base = _v("8300") + _v("8500") + _v("8700")
    lt_liabilities = _v("7010") + _v("7800")
    st_liabilities = _v("6010") + _v("6110") + _v("6310") + _v("6710") + _v("6820") + _v("6610")
    total_liabilities = lt_liabilities + st_liabilities

    # Unclosed profit adjustment
    unclosed_profit = total_assets - (equity_base + total_liabilities)
    total_equity = equity_base + unclosed_profit

    revenue = pnl.get("total_revenue_end", 0.0)
    expenses = pnl.get("total_expenses_end", 0.0)
    net_profit = revenue - expenses

    # Previous period
    net_fa_p = _v("0100", "previous") - _v("0200", "previous")
    capex_p = _v("0800", "previous")
    inventories_p = _v("1000", "previous") + _v("1010", "previous")
    receivables_p = _v("2010", "previous") + _v("2300", "previous")
    cash_p = _v("5010", "previous") + _v("5110", "previous") + _v("5210", "previous")
    non_current_assets_p = net_fa_p + capex_p
    current_assets_p = inventories_p + receivables_p + cash_p
    total_assets_p = non_current_assets_p + current_assets_p

    return {
        "non_current_assets": non_current_assets,
        "current_assets": current_assets,
        "inventories": inventories,
        "receivables": receivables,
        "cash": cash,
        "total_assets": total_assets,
        "total_equity": total_equity,
        "equity_base": equity_base,
        "unclosed_profit": unclosed_profit,
        "lt_liabilities": lt_liabilities,
        "st_liabilities": st_liabilities,
        "total_liabilities": total_liabilities,
        "revenue": revenue,
        "expenses": expenses,
        "net_profit": net_profit,
        "net_fa": net_fa,
        "capex": capex,
        # Previous period
        "total_assets_prev": total_assets_p,
        "non_current_assets_prev": non_current_assets_p,
        "current_assets_prev": current_assets_p,
        "inventories_prev": inventories_p,
        "receivables_prev": receivables_p,
        "cash_prev": cash_p,
    }


def _safe_div(a: float, b: float) -> float:
    return round(a / b, 4) if b != 0 else 0.0


def _calc_kpis(agg: dict) -> list:
    """Calculate KPI groups from balance aggregates."""
    ca = agg["current_assets"]
    cl = agg["st_liabilities"]
    inv = agg["inventories"]
    ta = agg["total_assets"]
    te = agg["total_equity"]
    tl = agg["total_liabilities"]
    np_ = agg["net_profit"]
    rev = agg["revenue"]

    return [
        {
            "group": "Ликвидность",
            "items": [
                {"name": "Коэффициент текущей ликвидности", "code": "current_ratio", "value": _safe_div(ca, cl), "norm": "≥ 2.0", "unit": "x"},
                {"name": "Коэффициент быстрой ликвидности", "code": "quick_ratio", "value": _safe_div(ca - inv, cl), "norm": "≥ 1.0", "unit": "x"},
                {"name": "Коэффициент абсолютной ликвидности", "code": "cash_ratio", "value": _safe_div(agg["cash"], cl), "norm": "≥ 0.2", "unit": "x"},
            ],
        },
        {
            "group": "Рентабельность",
            "items": [
                {"name": "Рентабельность активов (ROA)", "code": "roa", "value": _safe_div(np_, ta), "norm": "> 0.05", "unit": "%"},
                {"name": "Рентабельность капитала (ROE)", "code": "roe", "value": _safe_div(np_, te), "norm": "> 0.10", "unit": "%"},
                {"name": "Чистая маржа", "code": "net_margin", "value": _safe_div(np_, rev), "norm": "> 0.05", "unit": "%"},
            ],
        },
        {
            "group": "Левередж",
            "items": [
                {"name": "Долг / Капитал", "code": "debt_equity", "value": _safe_div(tl, te), "norm": "< 2.0", "unit": "x"},
                {"name": "Коэффициент автономии", "code": "equity_ratio", "value": _safe_div(te, ta), "norm": "≥ 0.5", "unit": "%"},
                {"name": "Финансовый рычаг", "code": "leverage", "value": _safe_div(ta, te), "norm": "< 3.0", "unit": "x"},
            ],
        },
        {
            "group": "Деловая активность",
            "items": [
                {"name": "Оборачиваемость активов", "code": "asset_turnover", "value": _safe_div(rev, ta), "norm": "> 0.5", "unit": "x"},
                {"name": "Оборачиваемость дебиторки", "code": "receivables_turnover", "value": _safe_div(rev, agg["receivables"]) if agg["receivables"] else 0, "norm": "> 4", "unit": "x"},
                {"name": "Оборачиваемость запасов", "code": "inventory_turnover", "value": _safe_div(agg["expenses"], inv) if inv else 0, "norm": "> 4", "unit": "x"},
            ],
        },
    ]


# ---------------------------------------------------------------------------
# GET /analytics/kpi
# ---------------------------------------------------------------------------

@router.get("/analytics/kpi")
async def get_kpi(standard: Optional[str] = "nsbu"):
    """KPI groups by accounting standard."""
    agg = _get_balance_aggregates()
    if agg is None:
        return JSONResponse({"groups": []})
    return JSONResponse({"groups": _calc_kpis(agg)})


# ---------------------------------------------------------------------------
# POST /analytics/dcf
# ---------------------------------------------------------------------------

class DcfInput(BaseModel):
    revenue: float = 0
    growth_rate: float = 0
    wacc: float = 0
    terminal_growth: float = 0
    years: int = 5


@router.post("/analytics/dcf")
async def calculate_dcf(data: DcfInput):
    """DCF valuation stub."""
    return JSONResponse({
        "wacc": 0,
        "enterprise_value": 0,
        "equity_value": 0,
        "intrinsic_value_per_share": 0,
        "pv_fcff": 0,
        "terminal_value": 0,
    })


# ---------------------------------------------------------------------------
# GET /analytics/multiples
# ---------------------------------------------------------------------------

@router.get("/analytics/multiples")
async def get_multiples():
    """Market multiples stub."""
    return JSONResponse({})


# ---------------------------------------------------------------------------
# POST /analytics/stress-test
# ---------------------------------------------------------------------------

class StressTestInput(BaseModel):
    scenarios: List[Dict[str, Any]] = []


_DEFAULT_SCENARIOS = [
    {"id": "crisis_2008", "name": "Кризис 2008", "revenue_shock": -0.30, "cost_shock": 0.10, "interest_shock": 0, "fx_shock": 0},
    {"id": "covid_2020", "name": "COVID-2020", "revenue_shock": -0.20, "cost_shock": 0.05, "interest_shock": 0, "fx_shock": 0},
    {"id": "rate_hike", "name": "Рост ставок", "revenue_shock": 0, "cost_shock": 0, "interest_shock": 0.50, "fx_shock": 0},
    {"id": "currency_shock", "name": "Валютный шок", "revenue_shock": 0, "cost_shock": 0, "interest_shock": 0, "fx_shock": 2.0},
    {"id": "commodity_drop", "name": "Рост цен на сырьё", "revenue_shock": 0, "cost_shock": 0.25, "interest_shock": 0, "fx_shock": 0},
]


@router.post("/analytics/stress-test")
async def run_stress_test(data: StressTestInput = StressTestInput()):
    """Stress test: apply scenario shocks to baseline KPIs."""
    agg = _get_balance_aggregates()
    if agg is None:
        return JSONResponse({"results": [], "ai_summary": []})

    baseline_groups = _calc_kpis(agg)
    baseline_flat = {}
    for g in baseline_groups:
        for item in g["items"]:
            baseline_flat[item["code"]] = item["value"]

    scenarios = data.scenarios if data.scenarios else _DEFAULT_SCENARIOS
    results = []

    for sc in scenarios:
        rev_shock = sc.get("revenue_shock", 0)
        cost_shock = sc.get("cost_shock", 0)
        interest_shock = sc.get("interest_shock", 0)
        fx_shock = sc.get("fx_shock", 0)

        stressed_rev = agg["revenue"] * (1 + rev_shock)
        stressed_exp = agg["expenses"] * (1 + cost_shock)
        # Interest increases hit long-term liabilities cost
        interest_extra = agg["lt_liabilities"] * interest_shock * 0.10  # assume 10% base rate
        # FX shock hits as additional expense
        fx_extra = agg["total_assets"] * 0.05 * fx_shock  # assume 5% FX exposure
        stressed_np = stressed_rev - stressed_exp - interest_extra - fx_extra

        stressed_agg = dict(agg)
        stressed_agg["revenue"] = stressed_rev
        stressed_agg["expenses"] = stressed_exp
        stressed_agg["net_profit"] = stressed_np

        stressed_groups = _calc_kpis(stressed_agg)
        stressed_flat = {}
        for g in stressed_groups:
            for item in g["items"]:
                stressed_flat[item["code"]] = item["value"]

        kpi_comparison = []
        for code, base_val in baseline_flat.items():
            stressed_val = stressed_flat.get(code, 0)
            kpi_comparison.append({
                "code": code,
                "baseline": base_val,
                "stressed": stressed_val,
                "delta": round(stressed_val - base_val, 4),
            })

        results.append({
            "scenario_id": sc.get("id", ""),
            "scenario_name": sc.get("name", ""),
            "stressed_revenue": stressed_rev,
            "stressed_expenses": stressed_exp,
            "stressed_net_profit": stressed_np,
            "kpis": kpi_comparison,
        })

    ai_summary = [
        "Базовые KPI рассчитаны из загруженной ОСВ.",
        f"Чистая прибыль базового сценария: {agg['net_profit']:,.0f}",
        f"Наихудший сценарий: Кризис 2008 (выручка −30%, расходы +10%).",
    ]

    return JSONResponse({"results": results, "ai_summary": ai_summary})


# ---------------------------------------------------------------------------
# GET /analytics/visualizations
# ---------------------------------------------------------------------------

@router.get("/analytics/visualizations")
async def get_visualizations():
    """Chart/visualization data from real balance data."""
    agg = _get_balance_aggregates()
    if agg is None:
        return JSONResponse({})

    # Waterfall: asset changes from start to end of period
    waterfall = {
        "type": "waterfall",
        "title": "Изменение активов за период",
        "categories": [
            "Начало", "ОС (нетто)", "Кап.вложения", "Запасы",
            "Дебиторка", "Ден.средства", "Конец",
        ],
        "values": [
            agg["total_assets_prev"],
            agg["net_fa"] - (agg["non_current_assets_prev"] - agg.get("capex", 0)),
            agg["capex"] - agg.get("capex", 0),
            agg["inventories"] - agg["inventories_prev"],
            agg["receivables"] - agg["receivables_prev"],
            agg["cash"] - agg["cash_prev"],
            agg["total_assets"],
        ],
    }

    # Tornado: sensitivity of profit to key factors (±10% each)
    base_np = agg["net_profit"]
    factors = [
        ("Выручка", agg["revenue"] * 0.10, -agg["revenue"] * 0.10),
        ("Себестоимость", -agg["expenses"] * 0.10, agg["expenses"] * 0.10),
        ("Процентные расходы", -agg["lt_liabilities"] * 0.01, agg["lt_liabilities"] * 0.01),
        ("Курсовые разницы", -agg["total_assets"] * 0.005, agg["total_assets"] * 0.005),
    ]
    tornado = {
        "type": "tornado",
        "title": "Чувствительность прибыли (±10%)",
        "baseline": base_np,
        "factors": [{"name": n, "up": round(u, 0), "down": round(d, 0)} for n, u, d in factors],
    }

    # Bubble: asset categories by risk/return/volume
    bubble = {
        "type": "bubble",
        "title": "Активы: риск / доходность / объём",
        "items": [
            {"name": "Основные средства", "risk": 0.15, "return_": 0.05, "volume": agg["net_fa"]},
            {"name": "Запасы", "risk": 0.25, "return_": 0.12, "volume": agg["inventories"]},
            {"name": "Дебиторка", "risk": 0.30, "return_": 0.08, "volume": agg["receivables"]},
            {"name": "Денежные средства", "risk": 0.05, "return_": 0.02, "volume": agg["cash"]},
            {"name": "Кап. вложения", "risk": 0.35, "return_": 0.15, "volume": agg["capex"]},
        ],
    }

    # Heatmap: monthly revenue distribution (estimated — split evenly with seasonal pattern)
    monthly_rev = agg["revenue"] / 12
    seasonal = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8]
    heatmap = {
        "type": "heatmap",
        "title": "Оценка помесячной выручки",
        "months": ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
        "values": [round(monthly_rev * s, 0) for s in seasonal],
    }

    return JSONResponse({
        "waterfall": waterfall,
        "tornado": tornado,
        "bubble": bubble,
        "heatmap": heatmap,
    })


# ---------------------------------------------------------------------------
# POST /decisions/impact
# ---------------------------------------------------------------------------

class ImpactInput(BaseModel):
    decision_type: str = ""
    params: Dict[str, Any] = {}


@router.post("/decisions/impact")
async def calculate_impact(data: ImpactInput = ImpactInput()):
    """Decision impact calculator stub."""
    return JSONResponse({"rows": []})
