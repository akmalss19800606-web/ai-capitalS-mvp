"""Calculator Frontend Adapter -- accepts frontend request format,
converts to InvestmentCalculatorService calls, returns frontend-expected response."""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api.v1.deps import get_current_user
from app.services.calculator_service import InvestmentCalculatorService, TAX_REGIMES, BENCHMARKS_UZ_2026
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calculator", tags=["Calculator Frontend"])
calc = InvestmentCalculatorService


def build_cash_flows(p: dict) -> List[float]:
    """Build cash_flows array from frontend DCF params."""
    inv = p.get("initial_investment", 0)
    rev = p.get("revenue_year1", 0)
    growth_raw = p.get("revenue_growth_rate", 0); growth = growth_raw / 100 if growth_raw > 1 else growth_raw
    margin_raw = p.get("operating_margin", 20); margin = margin_raw / 100 if margin_raw > 1 else margin_raw
    horizon = p.get("horizon_years", 5)
    tax_regime = p.get("tax_regime", "general")
    tax_rate = TAX_REGIMES.get(tax_regime, TAX_REGIMES["general"])["cit"]
    cfs = [-inv]
    for yr in range(1, horizon + 1):
        r = rev * ((1 + growth) ** (yr - 1))
        ebit = r * margin
        tax = max(0, ebit * tax_rate)
        cf = ebit - tax
        cfs.append(round(cf, 2))
    return cfs


def adapt_dcf_response(raw: dict, params: dict) -> dict:
    """Map service response to frontend-expected field names."""
    tax_regime = params.get("tax_regime", "general")
    tax_rate = TAX_REGIMES.get(tax_regime, TAX_REGIMES["general"])["cit"]
    yearly = []
    periods = raw.get("periods", [])
    for p in periods:
        if p["period"] == 0:
            continue
        cf = p.get("cash_flow", 0)
        ebit = cf / max((1 - tax_rate), 0.01) if tax_rate < 1 else cf
        margin_val = params.get("operating_margin", 20) / 100 if params.get("operating_margin", 20) > 1 else params.get("operating_margin", 0.20)
        revenue = ebit / max(margin_val, 0.01)
        taxes = ebit * tax_rate
        yearly.append({
            "year": p["period"],
            "revenue": revenue,
            "ebit": ebit,
            "taxes": taxes,
            "free_cash_flow": cf,
            "discounted_cf": p.get("present_value", 0),
            "cumulative_dcf": p.get("cumulative_pv", 0),
        })
    return {
        "npv": raw.get("npv", 0),
        "irr": raw.get("irr"),
        "mirr": raw.get("mirr"),
        "payback_period": raw.get("payback_years"),
        "discounted_payback": raw.get("discounted_payback"),
        "profitability_index": raw.get("profitability_index"),
        "roi_pct": raw.get("roi_pct"),
        "dcf_value": raw.get("dcf_value", 0),
        "terminal_value": raw.get("terminal_value", 0),
        "currency": raw.get("currency", "USD"),
        "initial_investment": raw.get("initial_investment", 0),
        "tax_regime": raw.get("tax_regime", "general"),
        "tax_savings": raw.get("tax_savings", 0),
        "discount_rate_pct": raw.get("discount_rate_pct", 0),
        "yearly_breakdown": yearly,
        "wacc_breakdown": None,
        "id": "calc_" + str(hash(str(raw.get("npv", 0))))[:8],
    }


@router.post("/dcf", summary="DCF / ROI (frontend format)")
async def fe_dcf(body: dict = Body(...), _u=Depends(get_current_user)):
    try:
        cfs = body.get("cash_flows") or build_cash_flows(body)
        dr = body.get("discount_rate", 20) / 100 if body.get("discount_rate", 20) > 1 else body.get("discount_rate", 0.10)
        raw = calc.calculate_dcf(
            cash_flows=cfs, discount_rate=dr,
            terminal_growth=body.get("terminal_growth", 0),
            initial_investment=body.get("initial_investment", 0),
            tax_regime=body.get("tax_regime", "general"),
            custom_tax_rate=body.get("custom_tax_rate"),
            currency=body.get("currency", "USD"),
        )
        wacc_data = None
        if body.get("discount_rate_mode") == "wacc" and body.get("wacc_params"):
            wp = body["wacc_params"]
            wacc_data = calc.calculate_wacc_capm(
                equity_weight=wp.get("equity_weight", 0.7),
                debt_weight=wp.get("debt_weight", 0.3),
                risk_free_rate=wp.get("risk_free_rate", 4.3) / 100 if wp.get("risk_free_rate", 4.3) > 1 else wp.get("risk_free_rate", 0.043),
                beta=wp.get("beta", 1.0),
                equity_risk_premium=wp.get("equity_risk_premium", 5.5) / 100 if wp.get("equity_risk_premium", 5.5) > 1 else wp.get("equity_risk_premium", 0.055),
                country_risk_premium=wp.get("country_risk_premium", 5.5) / 100 if wp.get("country_risk_premium", 5.5) > 1 else wp.get("country_risk_premium", 0.055),
                size_premium=wp.get("size_premium", 2.5) / 100 if wp.get("size_premium", 2.5) > 1 else wp.get("size_premium", 0.025),
                cost_of_debt=wp.get("cost_of_debt", 22.8) / 100 if wp.get("cost_of_debt", 22.8) > 1 else wp.get("cost_of_debt", 0.228),
                tax_rate=wp.get("tax_rate", 15) / 100 if wp.get("tax_rate", 15) > 1 else wp.get("tax_rate", 0.15),
            )
        result = adapt_dcf_response(raw, body)
        if wacc_data:
            result["wacc_breakdown"] = {
                "wacc": wacc_data.get("wacc_pct"),
                "cost_of_equity": wacc_data.get("ke_pct"),
                "after_tax_cost_of_debt": wacc_data.get("kd_after_tax"),
            }
        return result
    except Exception as e:
        logger.error("FE DCF error: %s", e)
        raise HTTPException(status_code=500, detail="DCF calculation error")


@router.post("/compare", summary="Compare projects (frontend format)")
async def fe_compare(body: dict = Body(...), _u=Depends(get_current_user)):
    try:
        projects = body.get("projects", body.get("scenarios", []))
        names = body.get("project_names", [f"Project {i+1}" for i in range(len(projects))])
        results = []
        best_npv_val, best_irr_val, best_pb_val = -1e18, -1e18, 1e18
        best_npv_name = best_irr_name = best_pb_name = ""
        for i, proj in enumerate(projects):
            cfs = proj.get("cash_flows") or build_cash_flows(proj)
            dr = proj.get("discount_rate", 20) / 100 if proj.get("discount_rate", 20) > 1 else proj.get("discount_rate", 0.10)
            raw = calc.calculate_dcf(cash_flows=cfs, discount_rate=dr, initial_investment=proj.get("initial_investment", 0), tax_regime=proj.get("tax_regime", "general"), currency=proj.get("currency", "USD"))
            name = names[i] if i < len(names) else f"Project {i+1}"
            r = {"name": name, "npv": raw.get("npv", 0), "irr": raw.get("irr"), "mirr": raw.get("mirr"), "payback_period": raw.get("payback_years"), "profitability_index": raw.get("profitability_index"), "roi_pct": raw.get("roi_pct"), "discounted_payback": raw.get("discounted_payback"), "total_revenue": sum(p.get("cash_flow", 0) for p in raw.get("periods", []) if p.get("cash_flow", 0) > 0), "total_profit": raw.get("npv", 0), "yearly_cashflows": [p.get("cash_flow", 0) for p in raw.get("periods", [])]}
            results.append(r)
            if raw.get("npv", 0) > best_npv_val: best_npv_val = raw["npv"]; best_npv_name = name
            if (raw.get("irr") or 0) > best_irr_val: best_irr_val = raw.get("irr", 0); best_irr_name = name
            pb = raw.get("payback_years") or 999
            if pb < best_pb_val: best_pb_val = pb; best_pb_name = name
        return {"projects": results, "best_npv": best_npv_name, "best_irr": best_irr_name, "best_payback": best_pb_name}
    except Exception as e:
        logger.error("FE Compare error: %s", e)
        raise HTTPException(status_code=500, detail="Compare error")


@router.post("/sensitivity", summary="Sensitivity analysis (frontend format)")
async def fe_sensitivity(body: dict = Body(...), _u=Depends(get_current_user)):
    try:
        base = body.get("base_params", body)
        cfs = base.get("cash_flows") or build_cash_flows(base)
        inv = base.get("initial_investment", 0)
        dr = base.get("discount_rate", 20) / 100 if base.get("discount_rate", 20) > 1 else base.get("discount_rate", 0.10)
        pos_cfs = [c for c in cfs if c > 0]
        if not pos_cfs: pos_cfs = [10000]
        raw = calc.sensitivity_analysis(cash_flows=pos_cfs, discount_rate=dr, initial_investment=inv, variation_pct=body.get("variation_pct", 20))
        mode = body.get("mode", "tornado")
        base_npv = raw.get("base_npv", 0)
        result = {"mode": mode, "base_npv": base_npv}
        if mode == "tornado":
            tornado_items = []
            for t in raw.get("tornado", []):
                tornado_items.append({"variable": t["variable"], "npv_range": t["npv_range"], "npv_low": t["npv_low"], "npv_high": t["npv_high"], "base_value": t.get("base_value", 0)})
            result["tornado"] = tornado_items
        elif mode == "spider":
            spider_items = []
            for s in raw.get("spider", []):
                for pt in s.get("points", []):
                    spider_items.append({"variable": s["variable"], "pct_change": pt["pct_change"], "npv": pt["npv"]})
            result["spider"] = spider_items
        return result
    except Exception as e:
        logger.error("FE Sensitivity error: %s", e)
        raise HTTPException(status_code=500, detail="Sensitivity error")


@router.get("/benchmarks", summary="UZ Benchmarks List 2026")
async def fe_benchmarks_list(_u=Depends(get_current_user)):
    """Return benchmarks in frontend-expected format."""
    items = []
    risk_map = {"deposit": "Low", "bond": "Low-Medium", "equity": "High", "real_estate": "Medium", "macro": "N/A"}
    liq_map = {"deposit": "High", "bond": "Medium", "equity": "High", "real_estate": "Low", "macro": "N/A"}
    name_ru_map = {
        "Deposit UZS": "Depozit UZS (22.5%)",
        "Deposit USD": "Depozit USD (6%)",
        "Gov Bond 3Y UZS": "Gos. obligatsii 3Y UZS",
        "Gov Bond 10Y UZS": "Gos. obligatsii 10Y UZS",
        "Eurobond 7Y USD": "Yevrobond 7Y USD",
        "TSMI Index": "Indeks TSMI (birja)",
        "Real Estate": "Nedvijimost",
        "Inflation": "Inflyatsiya",
        "CB Rate": "Stavka CB",
    }
    for key, bm in BENCHMARKS_UZ_2026.items():
        items.append({
            "name_ru": name_ru_map.get(bm["name"], bm["name"]),
            "annual_return_pct": bm["rate"],
            "risk_level": risk_map.get(bm["type"], "Medium"),
            "liquidity": liq_map.get(bm["type"], "Medium"),
            "notes": bm["type"].replace("_", " ").title(),
        })
    return {"benchmarks": items}


@router.get("/tax-rates", summary="UZ Tax Rates 2026")
async def fe_tax_rates(_u=Depends(get_current_user)):
    """Return tax rates in frontend-expected format."""
    g = TAX_REGIMES.get("general", {})
    s = TAX_REGIMES.get("simplified", {})
    return {
        "cit_standard_pct": round(g.get("cit", 0.15) * 100),
        "vat_pct": round(g.get("vat", 0.12) * 100),
        "turnover_tax_simplified_pct": round(s.get("cit", 0.04) * 100),
        "personal_income_tax_pct": 12,
        "social_tax_pct": round(g.get("social", 0.12) * 100),
        "property_tax_pct": 2,
        "sez_exemption": {
            "navoi": {"note": "Navoi", "years": 10},
            "angren": {"note": "Angren", "years": 7},
            "jizzakh": {"note": "Jizzakh", "years": 7},
        },
        "source": "CB RUz, Minfin, Tax Code 2026",
    }


@router.post("/monte-carlo", summary="Monte Carlo simulation (frontend format)")
async def fe_monte_carlo(body: dict = Body(...), _u=Depends(get_current_user)):
    """Adapt frontend params and run Monte Carlo simulation."""
    try:
        base = body.get("base_params", body)
        cfs = base.get("cash_flows") or build_cash_flows(base)
        inv = base.get("initial_investment", 0)
        dr = base.get("discount_rate", 20) / 100 if base.get("discount_rate", 20) > 1 else base.get("discount_rate", 0.10)
        pos_cfs = [c for c in cfs if c > 0]
        if not pos_cfs:
            pos_cfs = [10000]
        n_sim = body.get("n_simulations", 10000)
        result = calc.monte_carlo_npv(
            initial_investment=inv,
            base_cash_flows=pos_cfs,
            discount_rate=dr,
            n_simulations=min(n_sim, 50000),
        )
        return result
    except Exception as e:
        logger.error("FE Monte Carlo error: %s", e)
        raise HTTPException(status_code=500, detail="Monte Carlo error")
