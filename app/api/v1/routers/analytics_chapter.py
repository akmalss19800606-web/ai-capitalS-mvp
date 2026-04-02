"""
Analytics chapter API — KPI, DCF, multiples, stress-test, visualizations, decisions.
Uses real data from _portfolio_cache when available.
E2-08: Full NSBU+IFRS Excel export endpoint.
"""
import io
from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.v1.routers.portfolios import _portfolio_cache, _user_cache, _build_nsbu_rows, _build_ifrs_rows, _build_diff_rows
from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from sqlalchemy.orm import Session

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


def _kpi_status(value: float, norm_threshold: float, lower_is_better: bool = False) -> str:
    """Determine KPI status: ok / warn / bad."""
    if lower_is_better:
        if value <= norm_threshold:
            return "ok"
        elif value <= norm_threshold * 1.5:
            return "warn"
        return "bad"
    else:
        if value >= norm_threshold:
            return "ok"
        elif value >= norm_threshold * 0.5:
            return "warn"
        return "bad"


def _calc_kpis(agg: dict) -> list:
    """Calculate KPI groups from balance aggregates.

    Returns list of groups with 'title', 'icon', 'metrics' array.
    Each metric has: key, label, value, formula, norm, status, standard.
    """
    ca = agg["current_assets"]
    cl = agg["st_liabilities"]
    inv = agg["inventories"]
    cash = agg["cash"]
    ta = agg["total_assets"]
    te = agg["total_equity"]
    tl = agg["total_liabilities"]
    np_ = agg["net_profit"]
    rev = agg["revenue"]
    exp = agg["expenses"]
    recv = agg["receivables"]

    current_ratio = _safe_div(ca, cl)
    quick_ratio = _safe_div(ca - inv, cl)
    cash_ratio = _safe_div(cash, cl)
    roa = _safe_div(np_, ta)
    roe = _safe_div(np_, te)
    net_margin = _safe_div(np_, rev)
    gross_margin = _safe_div(rev - exp, rev)
    debt_to_equity = _safe_div(tl, te)
    debt_ratio = _safe_div(tl, ta)
    equity_ratio = _safe_div(te, ta)
    asset_turnover = _safe_div(rev, ta)
    receivables_turnover = _safe_div(rev, recv) if recv else 0.0

    return [
        {
            "title": "Ликвидность",
            "icon": "💧",
            "metrics": [
                {"key": "current_ratio", "label": "Текущая ликвидность", "value": round(current_ratio, 2), "formula": "Оборотные активы / Краткосрочные обяз.", "norm": "> 2.0", "status": _kpi_status(current_ratio, 2.0), "standard": "both"},
                {"key": "quick_ratio", "label": "Быстрая ликвидность", "value": round(quick_ratio, 2), "formula": "(Оборотные - Запасы) / Краткосрочные обяз.", "norm": "> 1.0", "status": _kpi_status(quick_ratio, 1.0), "standard": "both"},
                {"key": "cash_ratio", "label": "Абсолютная ликвидность", "value": round(cash_ratio, 2), "formula": "Денежные средства / Краткосрочные обяз.", "norm": "> 0.2", "status": _kpi_status(cash_ratio, 0.2), "standard": "both"},
            ],
        },
        {
            "title": "Рентабельность",
            "icon": "📈",
            "metrics": [
                {"key": "roa", "label": "Рентабельность активов (ROA)", "value": round(roa, 4), "formula": "Чистая прибыль / Активы", "norm": "> 5%", "status": _kpi_status(roa, 0.05), "standard": "both"},
                {"key": "roe", "label": "Рентабельность капитала (ROE)", "value": round(roe, 4), "formula": "Чистая прибыль / Капитал", "norm": "> 15%", "status": _kpi_status(roe, 0.15), "standard": "both"},
                {"key": "net_margin", "label": "Чистая маржа", "value": round(net_margin, 4), "formula": "Чистая прибыль / Выручка", "norm": "> 10%", "status": _kpi_status(net_margin, 0.10), "standard": "both"},
                {"key": "gross_margin", "label": "Валовая маржа", "value": round(gross_margin, 4), "formula": "(Выручка - Себестоимость) / Выручка", "norm": "> 20%", "status": _kpi_status(gross_margin, 0.20), "standard": "both"},
            ],
        },
        {
            "title": "Левередж",
            "icon": "⚖️",
            "metrics": [
                {"key": "debt_to_equity", "label": "Долг / Капитал", "value": round(debt_to_equity, 2), "formula": "Обязательства / Капитал", "norm": "< 1.5", "status": _kpi_status(debt_to_equity, 1.5, lower_is_better=True), "standard": "both"},
                {"key": "debt_ratio", "label": "Коэффициент долга", "value": round(debt_ratio, 2), "formula": "Обязательства / Активы", "norm": "< 0.5", "status": _kpi_status(debt_ratio, 0.5, lower_is_better=True), "standard": "both"},
                {"key": "equity_ratio", "label": "Коэффициент автономии", "value": round(equity_ratio, 2), "formula": "Капитал / Активы", "norm": "> 0.5", "status": _kpi_status(equity_ratio, 0.5), "standard": "both"},
            ],
        },
        {
            "title": "Деловая активность",
            "icon": "🔄",
            "metrics": [
                {"key": "asset_turnover", "label": "Оборачиваемость активов", "value": round(asset_turnover, 2), "formula": "Выручка / Активы", "norm": "> 1.0", "status": _kpi_status(asset_turnover, 1.0), "standard": "both"},
                {"key": "receivables_turnover", "label": "Оборачиваемость дебиторки", "value": round(receivables_turnover, 2), "formula": "Выручка / Дебиторская задолж.", "norm": "> 4.0", "status": _kpi_status(receivables_turnover, 4.0), "standard": "both"},
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


def _kpi_flat(agg: dict) -> dict:
    """Return a flat dict of {key: value} from KPI groups for stress-test use."""
    result = {}
    for group in _calc_kpis(agg):
        for m in group["metrics"]:
            result[m["key"]] = m["value"]
    return result


def _kpi_labels() -> dict:
    """Return a flat dict of {key: label} for human-readable metric names."""
    # Use a dummy agg to get the structure
    dummy = {k: 1.0 for k in [
        "current_assets", "st_liabilities", "inventories", "cash",
        "total_assets", "total_equity", "total_liabilities",
        "net_profit", "revenue", "expenses", "receivables",
    ]}
    result = {}
    for group in _calc_kpis(dummy):
        for m in group["metrics"]:
            result[m["key"]] = m["label"]
    return result


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
    scenario: str = "crisis_2008"
    severity: str = "moderate"
    standard: str = "both"


_DEFAULT_SCENARIOS = {
    "crisis_2008": {"name": "Кризис 2008", "revenue_shock": -0.30, "cost_shock": 0.10, "interest_shock": 0, "fx_shock": 0},
    "covid_2020": {"name": "COVID-2020", "revenue_shock": -0.20, "cost_shock": 0.05, "interest_shock": 0, "fx_shock": 0},
    "rate_hike": {"name": "Рост ставок", "revenue_shock": 0, "cost_shock": 0, "interest_shock": 0.50, "fx_shock": 0},
    "currency_shock": {"name": "Валютный шок", "revenue_shock": 0, "cost_shock": 0, "interest_shock": 0, "fx_shock": 2.0},
    "commodity_drop": {"name": "Рост цен на сырьё", "revenue_shock": 0, "cost_shock": 0.25, "interest_shock": 0, "fx_shock": 0},
}

_SEVERITY_MULTIPLIERS = {"mild": 0.5, "moderate": 1.0, "severe": 1.5, "extreme": 2.0}


def _stress_status(delta_pct: float) -> str:
    """Determine stress-test status from delta percentage."""
    if abs(delta_pct) < 10:
        return "ok"
    elif abs(delta_pct) < 25:
        return "warn"
    return "bad"


@router.post("/analytics/stress-test")
async def run_stress_test(data: StressTestInput = StressTestInput()):
    """Stress test: apply single scenario shocks to baseline KPIs.

    Accepts: scenario (string id), severity (mild/moderate/severe/extreme), standard (nsbu/ifrs/both).
    Returns: flat results array with baseline/stressed values per standard.
    """
    agg = _get_balance_aggregates()
    if agg is None:
        return JSONResponse({"results": [], "ai_summary": []})

    sc = _DEFAULT_SCENARIOS.get(data.scenario, _DEFAULT_SCENARIOS["crisis_2008"])
    severity_mult = _SEVERITY_MULTIPLIERS.get(data.severity, 1.0)

    rev_shock = sc["revenue_shock"] * severity_mult
    cost_shock = sc["cost_shock"] * severity_mult
    interest_shock = sc["interest_shock"] * severity_mult
    fx_shock = sc["fx_shock"] * severity_mult

    stressed_rev = agg["revenue"] * (1 + rev_shock)
    stressed_exp = agg["expenses"] * (1 + cost_shock)
    interest_extra = agg["lt_liabilities"] * interest_shock * 0.10
    fx_extra = agg["total_assets"] * 0.05 * fx_shock
    stressed_np = stressed_rev - stressed_exp - interest_extra - fx_extra

    stressed_agg = dict(agg)
    stressed_agg["revenue"] = stressed_rev
    stressed_agg["expenses"] = stressed_exp
    stressed_agg["net_profit"] = stressed_np

    baseline_flat = _kpi_flat(agg)
    stressed_flat = _kpi_flat(stressed_agg)
    labels = _kpi_labels()

    results = []
    for key, base_val in baseline_flat.items():
        stressed_val = stressed_flat.get(key, 0)
        if base_val != 0:
            delta_pct = round((stressed_val - base_val) / base_val * 100, 1)
        else:
            delta_pct = 0.0
        results.append({
            "metric": labels.get(key, key),
            "baseline_nsbu": base_val,
            "baseline_ifrs": base_val,
            "stressed_nsbu": stressed_val,
            "stressed_ifrs": stressed_val,
            "delta_pct_nsbu": delta_pct,
            "delta_pct_ifrs": delta_pct,
            "status_nsbu": _stress_status(delta_pct),
            "status_ifrs": _stress_status(delta_pct),
        })

    ai_summary = [
        "Базовые KPI рассчитаны из загруженной ОСВ.",
        f"Чистая прибыль базового сценария: {agg['net_profit']:,.0f}",
        f"Сценарий: {sc['name']} (severity: {data.severity}).",
    ]
    if agg["revenue"] == 0 and agg["expenses"] == 0:
        ai_summary.append("⚠️ Данные P&L (выручка, расходы) отсутствуют — рентабельность = 0.")

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

    # Waterfall: balance change flow — start → revenue → expenses → asset changes → end
    inv_delta = (agg["non_current_assets"] - agg.get("non_current_assets_prev", 0))
    working_cap_delta = (agg["current_assets"] - agg.get("current_assets_prev", 0))
    waterfall = {
        "type": "waterfall",
        "title": "Движение баланса за период",
        "categories": [
            "Начало периода", "Выручка", "Расходы",
            "Инвестиции (ОС)", "Оборотный капитал", "Конец периода",
        ],
        "values": [
            agg["total_assets_prev"],
            agg["revenue"],
            -agg["expenses"],
            inv_delta,
            working_cap_delta - agg["revenue"] + agg["expenses"] - inv_delta,
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
    monthly_rev = agg["revenue"] / 12 if agg["revenue"] else 0
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


# ---------------------------------------------------------------------------
# POST /analytics/export/full-report — E2-08: Full NSBU+IFRS Excel export
# ---------------------------------------------------------------------------

@router.post("/analytics/export/full-report")
def export_full_report(
    portfolio_id: int = Form(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a comprehensive Excel report with NSBU balance, IFRS balance,
    adjustments, P&L, KPI summary, and stress-test sheets.
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
    from openpyxl.utils import get_column_letter

    # --- Styling helpers ---
    BLUE_FILL = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    PURPLE_FILL = PatternFill(start_color="5B2C6F", end_color="5B2C6F", fill_type="solid")
    GREEN_FILL = PatternFill(start_color="1E8449", end_color="1E8449", fill_type="solid")
    AMBER_FILL = PatternFill(start_color="B7950B", end_color="B7950B", fill_type="solid")
    RED_FILL = PatternFill(start_color="922B21", end_color="922B21", fill_type="solid")
    GRAY_FILL = PatternFill(start_color="566573", end_color="566573", fill_type="solid")
    LIGHT_BLUE = PatternFill(start_color="D6EAF8", end_color="D6EAF8", fill_type="solid")
    LIGHT_PURPLE = PatternFill(start_color="E8DAEF", end_color="E8DAEF", fill_type="solid")
    WHITE_FONT = Font(bold=True, color="FFFFFF", size=11)
    BOLD = Font(bold=True, size=10)
    NORMAL = Font(size=10)
    HEADER_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)
    THIN_BORDER = Border(
        left=Side(style="thin", color="D5D8DC"),
        right=Side(style="thin", color="D5D8DC"),
        top=Side(style="thin", color="D5D8DC"),
        bottom=Side(style="thin", color="D5D8DC"),
    )
    NUM_FMT = '#,##0'

    def style_header_row(ws, row_num, fill):
        for cell in ws[row_num]:
            cell.font = WHITE_FONT
            cell.fill = fill
            cell.alignment = HEADER_ALIGN
            cell.border = THIN_BORDER

    def style_data_cell(cell, is_number=False, is_bold=False):
        cell.font = BOLD if is_bold else NORMAL
        cell.border = THIN_BORDER
        if is_number and cell.value is not None:
            cell.number_format = NUM_FMT
            cell.alignment = Alignment(horizontal="right")

    def auto_width(ws):
        for col_cells in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col_cells[0].column)
            for cell in col_cells:
                val = str(cell.value) if cell.value is not None else ""
                max_len = max(max_len, len(val))
            ws.column_dimensions[col_letter].width = min(max_len + 4, 45)

    def write_no_data(ws, fill):
        ws.append(["Нет данных. Импортируйте файл 1С."])
        ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=4)
        ws[ws.max_row][0].font = Font(italic=True, size=11, color="7F8C8D")
        ws[ws.max_row][0].alignment = Alignment(horizontal="center")

    # --- Get cached data ---
    cache = _user_cache(current_user.id)
    accounts = cache.get("accounts")
    pnl = cache.get("pnl")
    company_info = cache.get("company_info", {})

    wb = Workbook()

    # ===================================================================
    # SHEET 1: Сводка (KPI НСБУ и МСФО)
    # ===================================================================
    ws_summary = wb.active
    ws_summary.title = "Сводка"
    ws_summary.sheet_properties.tabColor = "1F4E79"

    if company_info:
        ws_summary.append(["Организация:", company_info.get("name", "")])
        ws_summary[ws_summary.max_row][0].font = BOLD
        ws_summary[ws_summary.max_row][1].font = BOLD
        ws_summary.append(["Период:", company_info.get("period", "")])
        ws_summary[ws_summary.max_row][0].font = BOLD
        ws_summary.append([])

    ws_summary.append(["Показатель", "Группа", "Значение", "Норма", "Статус"])
    style_header_row(ws_summary, ws_summary.max_row, BLUE_FILL)

    agg = _get_balance_aggregates()
    if agg:
        for group in _calc_kpis(agg):
            for m in group["metrics"]:
                ws_summary.append([
                    m["label"], group["title"], m["value"], m["norm"], m["status"]
                ])
                r = ws_summary.max_row
                for ci in range(5):
                    style_data_cell(ws_summary.cell(r, ci + 1), is_number=(ci == 2))
                # Color status cell
                status_cell = ws_summary.cell(r, 5)
                if m["status"] == "ok":
                    status_cell.fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid")
                elif m["status"] == "warn":
                    status_cell.fill = PatternFill(start_color="FEF9E7", end_color="FEF9E7", fill_type="solid")
                elif m["status"] == "bad":
                    status_cell.fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
    else:
        write_no_data(ws_summary, BLUE_FILL)

    auto_width(ws_summary)

    # ===================================================================
    # SHEET 2: Баланс НСБУ
    # ===================================================================
    ws_nsbu = wb.create_sheet("Баланс НСБУ")
    ws_nsbu.sheet_properties.tabColor = "2E86C1"

    if company_info:
        ws_nsbu.append(["Компания:", company_info.get("name", "")])
        ws_nsbu[ws_nsbu.max_row][0].font = BOLD
        ws_nsbu.append(["ИНН:", company_info.get("inn", "")])
        ws_nsbu.append(["Период:", company_info.get("period", "")])
        ws_nsbu.append([])

    ws_nsbu.append(["Показатель", "Код", "Текущий период", "Предыдущий период"])
    style_header_row(ws_nsbu, ws_nsbu.max_row, BLUE_FILL)

    if accounts:
        for row in _build_nsbu_rows(accounts, pnl):
            ws_nsbu.append([row.get("label", ""), row.get("code", ""), row.get("current"), row.get("previous")])
            r = ws_nsbu.max_row
            is_hdr = row.get("isHeader") or row.get("isTotalAsset") or row.get("isTotalLiability")
            style_data_cell(ws_nsbu.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_nsbu.cell(r, 2))
            style_data_cell(ws_nsbu.cell(r, 3), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_nsbu.cell(r, 4), is_number=True, is_bold=is_hdr)
            if row.get("isHeader"):
                for ci in range(4):
                    ws_nsbu.cell(r, ci + 1).fill = LIGHT_BLUE
    else:
        write_no_data(ws_nsbu, BLUE_FILL)

    auto_width(ws_nsbu)

    # ===================================================================
    # SHEET 3: Баланс МСФО
    # ===================================================================
    ws_ifrs = wb.create_sheet("Баланс МСФО")
    ws_ifrs.sheet_properties.tabColor = "7D3C98"

    if company_info:
        ws_ifrs.append(["Компания:", company_info.get("name", "")])
        ws_ifrs[ws_ifrs.max_row][0].font = BOLD
        ws_ifrs.append(["ИНН:", company_info.get("inn", "")])
        ws_ifrs.append(["Период:", company_info.get("period", "")])
        ws_ifrs.append([])

    ws_ifrs.append(["Показатель", "Примечание", "Текущий период", "Предыдущий период"])
    style_header_row(ws_ifrs, ws_ifrs.max_row, PURPLE_FILL)

    if accounts:
        for row in _build_ifrs_rows(accounts, pnl):
            ws_ifrs.append([row.get("label", ""), row.get("note", ""), row.get("current"), row.get("previous")])
            r = ws_ifrs.max_row
            is_hdr = row.get("isHeader") or row.get("isTotal")
            style_data_cell(ws_ifrs.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_ifrs.cell(r, 2))
            style_data_cell(ws_ifrs.cell(r, 3), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_ifrs.cell(r, 4), is_number=True, is_bold=is_hdr)
            if row.get("isHeader"):
                for ci in range(4):
                    ws_ifrs.cell(r, ci + 1).fill = LIGHT_PURPLE
    else:
        write_no_data(ws_ifrs, PURPLE_FILL)

    auto_width(ws_ifrs)

    # ===================================================================
    # SHEET 4: Корректировки НСБУ → МСФО
    # ===================================================================
    ws_adj = wb.create_sheet("Корректировки")
    ws_adj.sheet_properties.tabColor = "B7950B"

    ws_adj.append(["Тип", "Счёт", "Сумма НСБУ", "Сумма МСФО", "Разница", "Описание"])
    style_header_row(ws_adj, ws_adj.max_row, AMBER_FILL)

    from app.db.models.ifrs import IFRSAdjustment
    adjustments = db.query(IFRSAdjustment).order_by(IFRSAdjustment.created_at.desc()).limit(200).all()

    adj_type_labels = {
        "ifrs16_lease": "МСФО 16 Аренда",
        "ias16_revaluation": "МСФО 16 Переоценка",
        "ias36_impairment": "МСФО 36 Обесценение",
        "oci": "Прочий совокупный доход",
    }

    if adjustments:
        for adj in adjustments:
            ws_adj.append([
                adj_type_labels.get(adj.adjustment_type, adj.adjustment_type or ""),
                adj.account_code or "",
                float(adj.nsbu_amount) if adj.nsbu_amount is not None else None,
                float(adj.ifrs_amount) if adj.ifrs_amount is not None else None,
                float(adj.difference) if adj.difference is not None else None,
                adj.description or "",
            ])
            r = ws_adj.max_row
            for ci in range(6):
                style_data_cell(ws_adj.cell(r, ci + 1), is_number=(ci in (2, 3, 4)))
    elif accounts:
        # Fall back to diff rows from cache
        for row in _build_diff_rows(accounts):
            diff_val = round(row["ifrs"] - row["nsbu"], 2) if row["nsbu"] is not None and row["ifrs"] is not None else None
            ws_adj.append(["", "", row["nsbu"], row["ifrs"], diff_val, row.get("reason", "")])
            r = ws_adj.max_row
            for ci in range(6):
                style_data_cell(ws_adj.cell(r, ci + 1), is_number=(ci in (2, 3, 4)))
    else:
        write_no_data(ws_adj, AMBER_FILL)

    auto_width(ws_adj)

    # ===================================================================
    # SHEET 5: ОПиУ (Отчёт о прибылях и убытках)
    # ===================================================================
    ws_pnl = wb.create_sheet("ОПиУ")
    ws_pnl.sheet_properties.tabColor = "1E8449"

    ws_pnl.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_pnl, ws_pnl.max_row, GREEN_FILL)

    from app.db.models.ifrs import FinancialStatement
    pnl_statements = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "P&L"
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    if pnl_statements and pnl_statements[0].data:
        stmt_data = pnl_statements[0].data
        if isinstance(stmt_data, list):
            for item in stmt_data:
                ws_pnl.append([
                    item.get("label", ""),
                    item.get("current", item.get("amount")),
                    item.get("previous", None),
                ])
                r = ws_pnl.max_row
                is_hdr = item.get("isHeader") or item.get("isTotal")
                style_data_cell(ws_pnl.cell(r, 1), is_bold=is_hdr)
                style_data_cell(ws_pnl.cell(r, 2), is_number=True, is_bold=is_hdr)
                style_data_cell(ws_pnl.cell(r, 3), is_number=True, is_bold=is_hdr)
        elif isinstance(stmt_data, dict):
            for key, val in stmt_data.items():
                ws_pnl.append([key, val, None])
                r = ws_pnl.max_row
                for ci in range(3):
                    style_data_cell(ws_pnl.cell(r, ci + 1), is_number=(ci > 0))
    elif pnl and (pnl.get("total_revenue_end", 0) or pnl.get("total_expenses_end", 0)):
        # Build from cache PnL data
        pnl_rows = [
            ("Выручка (доходы)", pnl.get("total_revenue_end", 0), pnl.get("total_revenue_begin", 0), True),
            ("Себестоимость (расходы)", pnl.get("total_expenses_end", 0), pnl.get("total_expenses_begin", 0), False),
            ("Валовая прибыль",
             pnl.get("total_revenue_end", 0) - pnl.get("total_expenses_end", 0),
             pnl.get("total_revenue_begin", 0) - pnl.get("total_expenses_begin", 0),
             True),
        ]
        for label, cur, prev, is_hdr in pnl_rows:
            ws_pnl.append([label, cur, prev])
            r = ws_pnl.max_row
            style_data_cell(ws_pnl.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_pnl.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_pnl.cell(r, 3), is_number=True, is_bold=is_hdr)
    else:
        write_no_data(ws_pnl, GREEN_FILL)

    auto_width(ws_pnl)

    # ===================================================================
    # SHEET 6: Стресс-тест
    # ===================================================================
    ws_stress = wb.create_sheet("Стресс-тест")
    ws_stress.sheet_properties.tabColor = "922B21"

    ws_stress.append(["Сценарий", "Стоимость до", "Стоимость после", "Потеря %", "Макс. потеря актива %", "Восстановление (мес.)"])
    style_header_row(ws_stress, ws_stress.max_row, RED_FILL)

    from app.db.models.stress_retrospective import StressTest as StressTestModel
    stress_tests = db.query(StressTestModel).order_by(StressTestModel.created_at.desc()).limit(20).all()

    if stress_tests:
        for st in stress_tests:
            ws_stress.append([
                st.scenario_name or "",
                st.portfolio_value_before,
                st.portfolio_value_after,
                round(st.total_loss_pct, 2) if st.total_loss_pct is not None else None,
                round(st.max_single_asset_loss_pct, 2) if st.max_single_asset_loss_pct is not None else None,
                round(st.recovery_time_months, 1) if st.recovery_time_months is not None else None,
            ])
            r = ws_stress.max_row
            for ci in range(6):
                style_data_cell(ws_stress.cell(r, ci + 1), is_number=(ci > 0))
    else:
        write_no_data(ws_stress, RED_FILL)

    auto_width(ws_stress)

    # --- Save and return ---
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    org_name = company_info.get("name", "portfolio") if company_info else "portfolio"
    safe_name = "".join(c for c in org_name if c.isalnum() or c in " _-").strip()[:30] or "report"
    filename = f"report_{safe_name}_{portfolio_id}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
