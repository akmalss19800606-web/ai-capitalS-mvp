"""
Analytics chapter API — KPI, DCF, multiples, stress-test, visualizations, decisions.
Uses real data from _portfolio_cache when available.
E2-08: Full NSBU+IFRS Excel export endpoint.
"""
import io
import math
from fastapi import APIRouter, Depends, HTTPException
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
    """Chart/visualization data from real balance data.

    Returns arrays ready for Recharts consumption:
    - waterfall: WaterfallItem[] with cumulative values
    - tornado: TornadoItem[] with impact percentages
    - bubble: BubbleItem[] with x/y/size
    - heatmap: { data: (string|number)[][], months: string[] }
    """
    agg = _get_balance_aggregates()
    if agg is None:
        return JSONResponse({})

    # --- Waterfall: balance movement (UZS) ---
    start_balance = agg["total_assets_prev"]
    revenue = agg["revenue"]
    costs = -agg["expenses"]
    inv_delta = -(agg["non_current_assets"] - agg.get("non_current_assets_prev", 0))
    end_balance = agg["total_assets"]

    cum = start_balance
    waterfall = [
        {"name": "Начальный баланс", "value": start_balance, "cumulative": cum, "type": "start"},
    ]
    cum += revenue
    waterfall.append({"name": "Выручка", "value": revenue, "cumulative": cum, "type": "positive"})
    cum += costs
    waterfall.append({"name": "Себестоимость", "value": costs, "cumulative": cum, "type": "negative"})
    # Operating expenses = difference not explained by other items
    op_exp = end_balance - cum - inv_delta
    if op_exp < 0:
        cum += op_exp
        waterfall.append({"name": "Операционные расходы", "value": op_exp, "cumulative": cum, "type": "negative"})
    if abs(inv_delta) > 0:
        cum += inv_delta
        waterfall.append({"name": "Инвестиции", "value": inv_delta, "cumulative": cum, "type": "negative" if inv_delta < 0 else "positive"})
    waterfall.append({"name": "Итоговый баланс", "value": end_balance, "cumulative": end_balance, "type": "total"})

    # --- Tornado: sensitivity analysis (impact on net profit ±10%) ---
    base_np = agg["net_profit"]
    rev_impact = agg["revenue"] * 0.10
    cost_impact = agg["expenses"] * 0.10
    interest_impact = agg["lt_liabilities"] * 0.01
    fx_impact = agg["total_assets"] * 0.005
    tornado = []
    if rev_impact:
        tornado.append({"factor": "Выручка ±10%", "impact": round(rev_impact / max(abs(base_np), 1) * 100, 1)})
    if cost_impact:
        tornado.append({"factor": "Себестоимость ±10%", "impact": round(-cost_impact / max(abs(base_np), 1) * 100, 1)})
    if interest_impact:
        tornado.append({"factor": "Процентные расходы ±10%", "impact": round(-interest_impact / max(abs(base_np), 1) * 100, 1)})
    if fx_impact:
        tornado.append({"factor": "Курсовые разницы", "impact": round(-fx_impact / max(abs(base_np), 1) * 100, 1)})
    # Add operating expense sensitivity
    if agg["expenses"]:
        overhead = agg["expenses"] * 0.05  # 5% overhead change
        tornado.append({"factor": "Накладные расходы ±5%", "impact": round(-overhead / max(abs(base_np), 1) * 100, 1)})

    # --- Bubble: revenue vs profitability vs total assets ---
    ta = agg["total_assets"]
    profitability = round(base_np / max(agg["revenue"], 1) * 100, 1) if agg["revenue"] else 0
    bubble = [
        {"name": "Основные средства", "x": round(agg["net_fa"]), "y": 5, "size": round(agg["net_fa"])},
        {"name": "Запасы", "x": round(agg["inventories"]), "y": 12, "size": round(agg["inventories"])},
        {"name": "Дебиторская задолженность", "x": round(agg["receivables"]), "y": 8, "size": round(agg["receivables"])},
        {"name": "Денежные средства", "x": round(agg["cash"]), "y": 2, "size": round(agg["cash"])},
        {"name": "Капитальные вложения", "x": round(agg["capex"]), "y": 15, "size": round(agg["capex"])},
    ]
    # Filter out zero-value bubbles
    bubble = [b for b in bubble if b["size"] > 0]

    # --- Heatmap: correlation matrix of financial metrics ---

    metrics = {
        "Выручка": agg["revenue"],
        "Себестоимость": agg["expenses"],
        "Чист. прибыль": base_np,
        "Активы": ta,
        "Капитал": agg["total_equity"],
        "Обязательства": agg["total_liabilities"],
    }
    metric_names = list(metrics.keys())
    metric_vals = list(metrics.values())
    n = len(metric_names)

    # Build correlation-like heatmap based on normalized ratios
    heatmap_data = []
    for i in range(n):
        row = [metric_names[i]]
        for j in range(n):
            if i == j:
                row.append(100.0)
            else:
                vi, vj = metric_vals[i], metric_vals[j]
                if vi != 0 and vj != 0:
                    ratio = min(abs(vi), abs(vj)) / max(abs(vi), abs(vj)) * 100
                    sign = 1 if (vi > 0) == (vj > 0) else -1
                    row.append(round(ratio * sign, 1))
                else:
                    row.append(0.0)
        heatmap_data.append(row)

    return JSONResponse({
        "waterfall": waterfall,
        "tornado": tornado,
        "bubble": bubble,
        "heatmap": heatmap_data,
        "heatmap_months": metric_names,
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

class ExportRequest(BaseModel):
    portfolio_id: int = 0


@router.post("/analytics/export/full-report")
def export_full_report(
    req: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a comprehensive 15-sheet Excel report covering NSBU + IFRS
    balance, P&L, cash flow, equity, fixed assets, adjustments, KPIs,
    stress tests, and investment decisions.
    """
    from datetime import date as _date
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.hyperlink import Hyperlink

    # --- Styling constants ---
    BLUE_FILL = PatternFill(start_color="1D4ED8", end_color="1D4ED8", fill_type="solid")
    PURPLE_FILL = PatternFill(start_color="8B5CF6", end_color="8B5CF6", fill_type="solid")
    GREEN_FILL = PatternFill(start_color="1E8449", end_color="1E8449", fill_type="solid")
    AMBER_FILL = PatternFill(start_color="B7950B", end_color="B7950B", fill_type="solid")
    RED_FILL = PatternFill(start_color="922B21", end_color="922B21", fill_type="solid")
    GRAY_FILL = PatternFill(start_color="374151", end_color="374151", fill_type="solid")
    LIGHT_BLUE = PatternFill(start_color="D6EAF8", end_color="D6EAF8", fill_type="solid")
    LIGHT_PURPLE = PatternFill(start_color="E8DAEF", end_color="E8DAEF", fill_type="solid")
    WHITE_FONT = Font(bold=True, color="FFFFFF", size=11)
    TITLE_FONT = Font(bold=True, size=14)
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

    def write_no_data(ws, _fill=None):
        ws.append(["Нет данных. Импортируйте файл 1С и запустите конвертацию МСФО."])
        ws.merge_cells(start_row=ws.max_row, start_column=1, end_row=ws.max_row, end_column=4)
        ws[ws.max_row][0].font = Font(italic=True, size=11, color="7F8C8D")
        ws[ws.max_row][0].alignment = Alignment(horizontal="center")

    def write_sheet_header(ws, title, fill, company_info_d):
        """Write standard rows 1-3 (title, org+period, blank) then row 4 handled by caller."""
        ws.append([title])
        ws[ws.max_row][0].font = TITLE_FONT
        org = company_info_d.get("name", "") if company_info_d else ""
        period = company_info_d.get("period", "") if company_info_d else ""
        ws.append([f"Организация: {org}   |   Период: {period}"])
        ws[ws.max_row][0].font = BOLD
        ws.append([])  # blank row 3

    def _write_financial_stmt(ws, fill, light_fill, stmt_type, standard, headers, row_builder_fn, row_builder_args):
        """Generic helper to write a financial statement sheet from DB or cache."""
        from app.db.models.ifrs import FinancialStatement as FS
        ws.append(headers)
        style_header_row(ws, ws.max_row, fill)
        stmts = db.query(FS).filter(FS.statement_type == stmt_type, FS.standard == standard).order_by(FS.created_at.desc()).limit(2).all()
        if stmts and stmts[0].data:
            data = stmts[0].data
            rows_list = data if isinstance(data, list) else [{k: v} for k, v in data.items()] if isinstance(data, dict) else []
            for item in rows_list:
                if isinstance(item, dict):
                    ws.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
                    r = ws.max_row
                    is_hdr = item.get("isHeader") or item.get("isTotal")
                    style_data_cell(ws.cell(r, 1), is_bold=is_hdr)
                    style_data_cell(ws.cell(r, 2), is_number=True, is_bold=is_hdr)
                    style_data_cell(ws.cell(r, 3), is_number=True, is_bold=is_hdr)
                    if item.get("isHeader") and light_fill:
                        for ci in range(len(headers)):
                            ws.cell(r, ci + 1).fill = light_fill
        elif row_builder_fn:
            row_builder_fn(ws, *row_builder_args)
        else:
            write_no_data(ws, fill)

    # --- Get cached data ---
    cache = _user_cache(current_user.id)
    accounts = cache.get("accounts")
    pnl = cache.get("pnl")
    company_info = cache.get("company_info", {})

    wb = Workbook()

    # Sheet names (15 total) — order matters for hyperlinks in TOC
    SHEET_NAMES = [
        "Содержание",
        "Баланс НСБУ",
        "ОПиУ НСБУ",
        "ДДС НСБУ",
        "Капитал НСБУ",
        "Движение ОС",
        "Баланс МСФО",
        "Совокупный доход",
        "ДДС МСФО",
        "Капитал МСФО",
        "Корректировки",
        "Коэффициенты",
        "Стресс-тест НСБУ",
        "Стресс-тест МСФО",
        "Решения",
    ]

    # ===================================================================
    # SHEET 1: Содержание (Table of Contents)
    # ===================================================================
    ws_toc = wb.active
    ws_toc.title = "Содержание"
    ws_toc.sheet_properties.tabColor = "374151"

    ws_toc.append(["Полный финансовый отчёт"])
    ws_toc[1][0].font = Font(bold=True, size=16)
    org_name_display = company_info.get("name", "—") if company_info else "—"
    inn_display = company_info.get("inn", "—") if company_info else "—"
    period_display = company_info.get("period", "—") if company_info else "—"
    ws_toc.append([f"Организация: {org_name_display}"])
    ws_toc[2][0].font = BOLD
    ws_toc.append([f"ИНН: {inn_display}"])
    ws_toc[3][0].font = BOLD
    ws_toc.append([f"Период: {period_display}"])
    ws_toc[4][0].font = BOLD
    ws_toc.append([f"Дата генерации: {_date.today().strftime('%d.%m.%Y')}"])
    ws_toc[5][0].font = BOLD
    ws_toc.append([])
    ws_toc.append(["Содержание:"])
    ws_toc[7][0].font = Font(bold=True, size=12)

    for idx, sname in enumerate(SHEET_NAMES):
        row_num = 8 + idx
        ws_toc.append([f"{idx + 1}. {sname}"])
        cell = ws_toc.cell(row=row_num, column=1)
        cell.font = Font(color="1D4ED8", underline="single", size=11)
        cell.hyperlink = Hyperlink(ref=cell.coordinate, location=f"'{sname}'!A1", display=f"{idx + 1}. {sname}")

    ws_toc.column_dimensions["A"].width = 50
    auto_width(ws_toc)

    # ===================================================================
    # SHEET 2: Баланс НСБУ (Form 1)
    # ===================================================================
    ws_nsbu = wb.create_sheet("Баланс НСБУ")
    ws_nsbu.sheet_properties.tabColor = "1D4ED8"
    write_sheet_header(ws_nsbu, "Баланс (Форма 1) — НСБУ", BLUE_FILL, company_info)

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
    # SHEET 3: ОПиУ НСБУ (Form 2)
    # ===================================================================
    ws_pnl_nsbu = wb.create_sheet("ОПиУ НСБУ")
    ws_pnl_nsbu.sheet_properties.tabColor = "1D4ED8"
    write_sheet_header(ws_pnl_nsbu, "Отчёт о прибылях и убытках (Форма 2) — НСБУ", BLUE_FILL, company_info)

    ws_pnl_nsbu.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_pnl_nsbu, ws_pnl_nsbu.max_row, BLUE_FILL)

    from app.db.models.ifrs import FinancialStatement
    pnl_nsbu_stmts = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "P&L",
        FinancialStatement.standard == "nsbu",
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    pnl_nsbu_written = False
    if pnl_nsbu_stmts and pnl_nsbu_stmts[0].data:
        stmt_data = pnl_nsbu_stmts[0].data
        if isinstance(stmt_data, list):
            for item in stmt_data:
                ws_pnl_nsbu.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
                r = ws_pnl_nsbu.max_row
                is_hdr = item.get("isHeader") or item.get("isTotal")
                style_data_cell(ws_pnl_nsbu.cell(r, 1), is_bold=is_hdr)
                style_data_cell(ws_pnl_nsbu.cell(r, 2), is_number=True, is_bold=is_hdr)
                style_data_cell(ws_pnl_nsbu.cell(r, 3), is_number=True, is_bold=is_hdr)
            pnl_nsbu_written = True

    if not pnl_nsbu_written:
        # Also try generic P&L statements or cache
        pnl_generic = db.query(FinancialStatement).filter(
            FinancialStatement.statement_type == "P&L"
        ).order_by(FinancialStatement.created_at.desc()).limit(2).all()
        if pnl_generic and pnl_generic[0].data:
            stmt_data = pnl_generic[0].data
            if isinstance(stmt_data, list):
                for item in stmt_data:
                    ws_pnl_nsbu.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
                    r = ws_pnl_nsbu.max_row
                    is_hdr = item.get("isHeader") or item.get("isTotal")
                    style_data_cell(ws_pnl_nsbu.cell(r, 1), is_bold=is_hdr)
                    style_data_cell(ws_pnl_nsbu.cell(r, 2), is_number=True, is_bold=is_hdr)
                    style_data_cell(ws_pnl_nsbu.cell(r, 3), is_number=True, is_bold=is_hdr)
                pnl_nsbu_written = True

    if not pnl_nsbu_written and pnl and (pnl.get("total_revenue_end", 0) or pnl.get("total_expenses_end", 0)):
        pnl_rows = [
            ("Выручка (доходы)", pnl.get("total_revenue_end", 0), pnl.get("total_revenue_begin", 0), True),
            ("Себестоимость (расходы)", pnl.get("total_expenses_end", 0), pnl.get("total_expenses_begin", 0), False),
            ("Валовая прибыль",
             pnl.get("total_revenue_end", 0) - pnl.get("total_expenses_end", 0),
             pnl.get("total_revenue_begin", 0) - pnl.get("total_expenses_begin", 0),
             True),
        ]
        for label, cur, prev, is_hdr in pnl_rows:
            ws_pnl_nsbu.append([label, cur, prev])
            r = ws_pnl_nsbu.max_row
            style_data_cell(ws_pnl_nsbu.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_pnl_nsbu.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_pnl_nsbu.cell(r, 3), is_number=True, is_bold=is_hdr)
        pnl_nsbu_written = True

    if not pnl_nsbu_written:
        write_no_data(ws_pnl_nsbu, BLUE_FILL)
    auto_width(ws_pnl_nsbu)

    # ===================================================================
    # SHEET 4: ДДС НСБУ (Form 4 — Cash Flow Statement)
    # ===================================================================
    ws_cf_nsbu = wb.create_sheet("ДДС НСБУ")
    ws_cf_nsbu.sheet_properties.tabColor = "1D4ED8"
    write_sheet_header(ws_cf_nsbu, "Отчёт о движении денежных средств (Форма 4) — НСБУ", BLUE_FILL, company_info)

    ws_cf_nsbu.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_cf_nsbu, ws_cf_nsbu.max_row, BLUE_FILL)

    cf_nsbu_stmts = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "CF",
        FinancialStatement.standard == "nsbu",
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    if cf_nsbu_stmts and cf_nsbu_stmts[0].data and isinstance(cf_nsbu_stmts[0].data, list):
        for item in cf_nsbu_stmts[0].data:
            ws_cf_nsbu.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
            r = ws_cf_nsbu.max_row
            is_hdr = item.get("isHeader") or item.get("isTotal")
            style_data_cell(ws_cf_nsbu.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_cf_nsbu.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_cf_nsbu.cell(r, 3), is_number=True, is_bold=is_hdr)
    else:
        write_no_data(ws_cf_nsbu, BLUE_FILL)
    auto_width(ws_cf_nsbu)

    # ===================================================================
    # SHEET 5: Капитал НСБУ (Form 5 — Changes in Equity)
    # ===================================================================
    ws_eq_nsbu = wb.create_sheet("Капитал НСБУ")
    ws_eq_nsbu.sheet_properties.tabColor = "1D4ED8"
    write_sheet_header(ws_eq_nsbu, "Отчёт об изменениях в капитале (Форма 5) — НСБУ", BLUE_FILL, company_info)

    ws_eq_nsbu.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_eq_nsbu, ws_eq_nsbu.max_row, BLUE_FILL)

    eq_nsbu_stmts = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "Equity",
        FinancialStatement.standard == "nsbu",
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    if eq_nsbu_stmts and eq_nsbu_stmts[0].data and isinstance(eq_nsbu_stmts[0].data, list):
        for item in eq_nsbu_stmts[0].data:
            ws_eq_nsbu.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
            r = ws_eq_nsbu.max_row
            is_hdr = item.get("isHeader") or item.get("isTotal")
            style_data_cell(ws_eq_nsbu.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_eq_nsbu.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_eq_nsbu.cell(r, 3), is_number=True, is_bold=is_hdr)
    else:
        write_no_data(ws_eq_nsbu, BLUE_FILL)
    auto_width(ws_eq_nsbu)

    # ===================================================================
    # SHEET 6: Движение ОС (Form 3 — Fixed Assets Movement)
    # ===================================================================
    ws_fa = wb.create_sheet("Движение ОС")
    ws_fa.sheet_properties.tabColor = "1D4ED8"
    write_sheet_header(ws_fa, "Движение основных средств (Форма 3) — НСБУ", BLUE_FILL, company_info)

    ws_fa.append(["Группа ОС", "На начало", "Поступило", "Выбыло", "На конец", "Амортизация"])
    style_header_row(ws_fa, ws_fa.max_row, BLUE_FILL)

    if accounts:
        gross_fa = accounts.get("0100", {})
        depr = accounts.get("0200", {})
        capex_acc = accounts.get("0800", {})
        fa_begin = (gross_fa.get("previous") or 0)
        fa_end = (gross_fa.get("current") or 0)
        depr_begin = (depr.get("previous") or 0)
        depr_end = (depr.get("current") or 0)
        capex_val = (capex_acc.get("current") or 0) - (capex_acc.get("previous") or 0)
        disposed = fa_begin + capex_val - fa_end if fa_begin + capex_val > fa_end else 0
        ws_fa.append(["Основные средства", fa_begin, max(capex_val, 0), disposed, fa_end, depr_end])
        r = ws_fa.max_row
        for ci in range(6):
            style_data_cell(ws_fa.cell(r, ci + 1), is_number=(ci > 0))
        ws_fa.append(["Начислено амортизации за период", None, None, None, None, depr_end - depr_begin])
        r = ws_fa.max_row
        style_data_cell(ws_fa.cell(r, 1), is_bold=True)
        style_data_cell(ws_fa.cell(r, 6), is_number=True, is_bold=True)
    else:
        write_no_data(ws_fa, BLUE_FILL)
    auto_width(ws_fa)

    # ===================================================================
    # SHEET 7: Баланс МСФО (IAS 1 — Financial Position)
    # ===================================================================
    ws_ifrs = wb.create_sheet("Баланс МСФО")
    ws_ifrs.sheet_properties.tabColor = "8B5CF6"
    write_sheet_header(ws_ifrs, "Отчёт о финансовом положении (IAS 1) — МСФО", PURPLE_FILL, company_info)

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
    # SHEET 8: Совокупный доход (IAS 1 — P&L + OCI)
    # ===================================================================
    ws_oci = wb.create_sheet("Совокупный доход")
    ws_oci.sheet_properties.tabColor = "8B5CF6"
    write_sheet_header(ws_oci, "Отчёт о совокупном доходе (IAS 1) — МСФО", PURPLE_FILL, company_info)

    ws_oci.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_oci, ws_oci.max_row, PURPLE_FILL)

    oci_stmts = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "P&L",
        FinancialStatement.standard == "ifrs",
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    if oci_stmts and oci_stmts[0].data and isinstance(oci_stmts[0].data, list):
        for item in oci_stmts[0].data:
            ws_oci.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
            r = ws_oci.max_row
            is_hdr = item.get("isHeader") or item.get("isTotal")
            style_data_cell(ws_oci.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_oci.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_oci.cell(r, 3), is_number=True, is_bold=is_hdr)
            if item.get("isHeader"):
                for ci in range(3):
                    ws_oci.cell(r, ci + 1).fill = LIGHT_PURPLE
    elif pnl and (pnl.get("total_revenue_end", 0) or pnl.get("total_expenses_end", 0)):
        rev_e = pnl.get("total_revenue_end", 0)
        exp_e = pnl.get("total_expenses_end", 0)
        rev_b = pnl.get("total_revenue_begin", 0)
        exp_b = pnl.get("total_expenses_begin", 0)
        for label, cur, prev, hdr in [
            ("Выручка", rev_e, rev_b, True),
            ("Себестоимость", exp_e, exp_b, False),
            ("Операционная прибыль", rev_e - exp_e, rev_b - exp_b, True),
            ("Прочий совокупный доход (OCI)", 0, 0, False),
            ("Итого совокупный доход", rev_e - exp_e, rev_b - exp_b, True),
        ]:
            ws_oci.append([label, cur, prev])
            r = ws_oci.max_row
            style_data_cell(ws_oci.cell(r, 1), is_bold=hdr)
            style_data_cell(ws_oci.cell(r, 2), is_number=True, is_bold=hdr)
            style_data_cell(ws_oci.cell(r, 3), is_number=True, is_bold=hdr)
    else:
        write_no_data(ws_oci, PURPLE_FILL)
    auto_width(ws_oci)

    # ===================================================================
    # SHEET 9: ДДС МСФО (IAS 7)
    # ===================================================================
    ws_cf_ifrs = wb.create_sheet("ДДС МСФО")
    ws_cf_ifrs.sheet_properties.tabColor = "8B5CF6"
    write_sheet_header(ws_cf_ifrs, "Отчёт о движении денежных средств (IAS 7) — МСФО", PURPLE_FILL, company_info)

    ws_cf_ifrs.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_cf_ifrs, ws_cf_ifrs.max_row, PURPLE_FILL)

    cf_ifrs_stmts = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "CF",
        FinancialStatement.standard == "ifrs",
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    if cf_ifrs_stmts and cf_ifrs_stmts[0].data and isinstance(cf_ifrs_stmts[0].data, list):
        for item in cf_ifrs_stmts[0].data:
            ws_cf_ifrs.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
            r = ws_cf_ifrs.max_row
            is_hdr = item.get("isHeader") or item.get("isTotal")
            style_data_cell(ws_cf_ifrs.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_cf_ifrs.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_cf_ifrs.cell(r, 3), is_number=True, is_bold=is_hdr)
    else:
        write_no_data(ws_cf_ifrs, PURPLE_FILL)
    auto_width(ws_cf_ifrs)

    # ===================================================================
    # SHEET 10: Капитал МСФО (IAS 1 — Changes in Equity)
    # ===================================================================
    ws_eq_ifrs = wb.create_sheet("Капитал МСФО")
    ws_eq_ifrs.sheet_properties.tabColor = "8B5CF6"
    write_sheet_header(ws_eq_ifrs, "Отчёт об изменениях в капитале (IAS 1) — МСФО", PURPLE_FILL, company_info)

    ws_eq_ifrs.append(["Показатель", "Текущий период", "Предыдущий период"])
    style_header_row(ws_eq_ifrs, ws_eq_ifrs.max_row, PURPLE_FILL)

    eq_ifrs_stmts = db.query(FinancialStatement).filter(
        FinancialStatement.statement_type == "Equity",
        FinancialStatement.standard == "ifrs",
    ).order_by(FinancialStatement.created_at.desc()).limit(2).all()

    if eq_ifrs_stmts and eq_ifrs_stmts[0].data and isinstance(eq_ifrs_stmts[0].data, list):
        for item in eq_ifrs_stmts[0].data:
            ws_eq_ifrs.append([item.get("label", ""), item.get("current", item.get("amount")), item.get("previous")])
            r = ws_eq_ifrs.max_row
            is_hdr = item.get("isHeader") or item.get("isTotal")
            style_data_cell(ws_eq_ifrs.cell(r, 1), is_bold=is_hdr)
            style_data_cell(ws_eq_ifrs.cell(r, 2), is_number=True, is_bold=is_hdr)
            style_data_cell(ws_eq_ifrs.cell(r, 3), is_number=True, is_bold=is_hdr)
    else:
        write_no_data(ws_eq_ifrs, PURPLE_FILL)
    auto_width(ws_eq_ifrs)

    # ===================================================================
    # SHEET 11: Корректировки НСБУ → МСФО
    # ===================================================================
    ws_adj = wb.create_sheet("Корректировки")
    ws_adj.sheet_properties.tabColor = "B7950B"
    write_sheet_header(ws_adj, "Корректировки НСБУ → МСФО", AMBER_FILL, company_info)

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
    # SHEET 12: Коэффициенты (KPIs — НСБУ и МСФО рядом)
    # ===================================================================
    ws_kpi = wb.create_sheet("Коэффициенты")
    ws_kpi.sheet_properties.tabColor = "1E8449"
    write_sheet_header(ws_kpi, "Финансовые коэффициенты (НСБУ и МСФО)", GREEN_FILL, company_info)

    ws_kpi.append(["Показатель", "Группа", "Значение", "Норма", "Статус"])
    style_header_row(ws_kpi, ws_kpi.max_row, GREEN_FILL)

    agg = _get_balance_aggregates()
    if agg:
        for group in _calc_kpis(agg):
            for m in group["metrics"]:
                ws_kpi.append([
                    m["label"], group["title"], m["value"], m["norm"], m["status"]
                ])
                r = ws_kpi.max_row
                for ci in range(5):
                    style_data_cell(ws_kpi.cell(r, ci + 1), is_number=(ci == 2))
                status_cell = ws_kpi.cell(r, 5)
                if m["status"] == "ok":
                    status_cell.fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid")
                elif m["status"] == "warn":
                    status_cell.fill = PatternFill(start_color="FEF9E7", end_color="FEF9E7", fill_type="solid")
                elif m["status"] == "bad":
                    status_cell.fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
    else:
        write_no_data(ws_kpi, GREEN_FILL)
    auto_width(ws_kpi)

    # ===================================================================
    # SHEET 13: Стресс-тест НСБУ
    # ===================================================================
    ws_stress_nsbu = wb.create_sheet("Стресс-тест НСБУ")
    ws_stress_nsbu.sheet_properties.tabColor = "922B21"
    write_sheet_header(ws_stress_nsbu, "Стресс-тест — НСБУ", RED_FILL, company_info)

    ws_stress_nsbu.append(["Показатель", "Базовое значение", "Стресс-значение", "Изменение %", "Статус"])
    style_header_row(ws_stress_nsbu, ws_stress_nsbu.max_row, RED_FILL)

    if agg:
        for sc_key, sc in _DEFAULT_SCENARIOS.items():
            ws_stress_nsbu.append([f"--- {sc['name']} ---", "", "", "", ""])
            r = ws_stress_nsbu.max_row
            for ci in range(5):
                ws_stress_nsbu.cell(r, ci + 1).font = BOLD
                ws_stress_nsbu.cell(r, ci + 1).fill = PatternFill(start_color="F5B7B1", end_color="F5B7B1", fill_type="solid")

            stressed_rev = agg["revenue"] * (1 + sc["revenue_shock"])
            stressed_exp = agg["expenses"] * (1 + sc["cost_shock"])
            interest_extra = agg["lt_liabilities"] * sc["interest_shock"] * 0.10
            fx_extra = agg["total_assets"] * 0.05 * sc["fx_shock"]
            stressed_np = stressed_rev - stressed_exp - interest_extra - fx_extra
            stressed_agg = dict(agg)
            stressed_agg["revenue"] = stressed_rev
            stressed_agg["expenses"] = stressed_exp
            stressed_agg["net_profit"] = stressed_np

            baseline_flat = _kpi_flat(agg)
            stressed_flat = _kpi_flat(stressed_agg)
            labels = _kpi_labels()

            for key, base_val in baseline_flat.items():
                stressed_val = stressed_flat.get(key, 0)
                delta_pct = round((stressed_val - base_val) / base_val * 100, 1) if base_val != 0 else 0.0
                ws_stress_nsbu.append([
                    labels.get(key, key), round(base_val, 4), round(stressed_val, 4),
                    delta_pct, _stress_status(delta_pct),
                ])
                r = ws_stress_nsbu.max_row
                for ci in range(5):
                    style_data_cell(ws_stress_nsbu.cell(r, ci + 1), is_number=(ci in (1, 2, 3)))
                st_cell = ws_stress_nsbu.cell(r, 5)
                status_val = _stress_status(delta_pct)
                if status_val == "ok":
                    st_cell.fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid")
                elif status_val == "warn":
                    st_cell.fill = PatternFill(start_color="FEF9E7", end_color="FEF9E7", fill_type="solid")
                elif status_val == "bad":
                    st_cell.fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
    else:
        # Fallback: DB stress tests
        from app.db.models.stress_retrospective import StressTest as StressTestModel
        stress_tests = db.query(StressTestModel).order_by(StressTestModel.created_at.desc()).limit(20).all()
        if stress_tests:
            # Rewrite headers for DB data
            ws_stress_nsbu.delete_rows(ws_stress_nsbu.max_row)
            ws_stress_nsbu.append(["Сценарий", "Стоимость до", "Стоимость после", "Потеря %", "Макс. потеря актива %"])
            style_header_row(ws_stress_nsbu, ws_stress_nsbu.max_row, RED_FILL)
            for st in stress_tests:
                ws_stress_nsbu.append([
                    st.scenario_name or "", st.portfolio_value_before, st.portfolio_value_after,
                    round(st.total_loss_pct, 2) if st.total_loss_pct is not None else None,
                    round(st.max_single_asset_loss_pct, 2) if st.max_single_asset_loss_pct is not None else None,
                ])
                r = ws_stress_nsbu.max_row
                for ci in range(5):
                    style_data_cell(ws_stress_nsbu.cell(r, ci + 1), is_number=(ci > 0))
        else:
            write_no_data(ws_stress_nsbu, RED_FILL)
    auto_width(ws_stress_nsbu)

    # ===================================================================
    # SHEET 14: Стресс-тест МСФО
    # ===================================================================
    ws_stress_ifrs = wb.create_sheet("Стресс-тест МСФО")
    ws_stress_ifrs.sheet_properties.tabColor = "922B21"
    write_sheet_header(ws_stress_ifrs, "Стресс-тест — МСФО", RED_FILL, company_info)

    ws_stress_ifrs.append(["Показатель", "Базовое значение", "Стресс-значение", "Изменение %", "Статус"])
    style_header_row(ws_stress_ifrs, ws_stress_ifrs.max_row, RED_FILL)

    if agg:
        for sc_key, sc in _DEFAULT_SCENARIOS.items():
            ws_stress_ifrs.append([f"--- {sc['name']} ---", "", "", "", ""])
            r = ws_stress_ifrs.max_row
            for ci in range(5):
                ws_stress_ifrs.cell(r, ci + 1).font = BOLD
                ws_stress_ifrs.cell(r, ci + 1).fill = PatternFill(start_color="E8DAEF", end_color="E8DAEF", fill_type="solid")

            stressed_rev = agg["revenue"] * (1 + sc["revenue_shock"])
            stressed_exp = agg["expenses"] * (1 + sc["cost_shock"])
            interest_extra = agg["lt_liabilities"] * sc["interest_shock"] * 0.10
            fx_extra = agg["total_assets"] * 0.05 * sc["fx_shock"]
            stressed_np = stressed_rev - stressed_exp - interest_extra - fx_extra
            stressed_agg = dict(agg)
            stressed_agg["revenue"] = stressed_rev
            stressed_agg["expenses"] = stressed_exp
            stressed_agg["net_profit"] = stressed_np

            baseline_flat = _kpi_flat(agg)
            stressed_flat = _kpi_flat(stressed_agg)
            labels = _kpi_labels()

            for key, base_val in baseline_flat.items():
                stressed_val = stressed_flat.get(key, 0)
                delta_pct = round((stressed_val - base_val) / base_val * 100, 1) if base_val != 0 else 0.0
                ws_stress_ifrs.append([
                    labels.get(key, key), round(base_val, 4), round(stressed_val, 4),
                    delta_pct, _stress_status(delta_pct),
                ])
                r = ws_stress_ifrs.max_row
                for ci in range(5):
                    style_data_cell(ws_stress_ifrs.cell(r, ci + 1), is_number=(ci in (1, 2, 3)))
                st_cell = ws_stress_ifrs.cell(r, 5)
                status_val = _stress_status(delta_pct)
                if status_val == "ok":
                    st_cell.fill = PatternFill(start_color="D5F5E3", end_color="D5F5E3", fill_type="solid")
                elif status_val == "warn":
                    st_cell.fill = PatternFill(start_color="FEF9E7", end_color="FEF9E7", fill_type="solid")
                elif status_val == "bad":
                    st_cell.fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
    else:
        write_no_data(ws_stress_ifrs, RED_FILL)
    auto_width(ws_stress_ifrs)

    # ===================================================================
    # SHEET 15: Решения (Investment Decisions)
    # ===================================================================
    ws_dec = wb.create_sheet("Решения")
    ws_dec.sheet_properties.tabColor = "374151"
    write_sheet_header(ws_dec, "Инвестиционные решения", GRAY_FILL, company_info)

    ws_dec.append(["Актив", "Тип", "Статус", "Приоритет", "Категория", "Сумма", "Цена", "Итого", "Дата"])
    style_header_row(ws_dec, ws_dec.max_row, GRAY_FILL)

    from app.db.models.investment_decision import InvestmentDecision
    decisions = db.query(InvestmentDecision).filter(
        InvestmentDecision.created_by == current_user.id,
    ).order_by(InvestmentDecision.created_at.desc()).limit(100).all()

    if decisions:
        for d in decisions:
            total_val = (d.amount or 0) * (d.price or 0)
            ws_dec.append([
                d.asset_name or "",
                d.decision_type.value if d.decision_type else "",
                d.status.value if d.status else "",
                d.priority.value if d.priority else "",
                d.category.value if d.category else "",
                d.amount,
                d.price,
                round(total_val, 2) if total_val else None,
                d.created_at.strftime("%d.%m.%Y") if d.created_at else "",
            ])
            r = ws_dec.max_row
            for ci in range(9):
                style_data_cell(ws_dec.cell(r, ci + 1), is_number=(ci in (5, 6, 7)))
    else:
        write_no_data(ws_dec, GRAY_FILL)
    auto_width(ws_dec)

    # --- Save and return ---
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    org_name = company_info.get("name", "portfolio") if company_info else "portfolio"
    safe_name = "".join(c for c in org_name if c.isalnum() or c in " _-").strip()[:30] or "report"
    filename = f"report_{safe_name}_{req.portfolio_id}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
