"""Calculator Frontend Adapter — accepts frontend request format,
converts to InvestmentCalculatorService calls, returns frontend-expected response."""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api.v1.deps import get_current_user
from app.services.calculator_service import InvestmentCalculatorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calc", tags=["Calculator Frontend"])
calc = InvestmentCalculatorService


def build_cash_flows(p: dict) -> List[float]:
    """Build cash_flows array from frontend DCF params."""
    inv = p.get("initial_investment", 0)
    rev = p.get("revenue_year1", 0)
    growth = p.get("revenue_growth_rate", 0) / 100
    margin = p.get("operating_margin", 20) / 100
    horizon = p.get("horizon_years", 5)
    cfs = [-inv]
    for yr in range(1, horizon + 1):
        r = rev * ((1 + growth) ** (yr - 1))
        cf = r * margin
        cfs.append(round(cf, 2))
    return cfs


def adapt_dcf_response(raw: dict, params: dict) -> dict:
    """Map service response to frontend-expected field names."""
    # Build yearly_breakdown from periods
    yearly = []
    periods = raw.get("periods", [])
    for p in periods:
        if p["period"] == 0:
            continue
        yearly.append({
            "year": p["period"],
            "revenue": p.get("cash_flow", 0) / max(params.get("operating_margin", 20) / 100, 0.01),
            "ebit": p.get("cash_flow", 0),
            "taxes": 0,
            "free_cash_flow": p.get("cash_flow", 0),
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
            cash_flows=cfs,
            discount_rate=dr,
            terminal_growth=body.get("terminal_growth", 0),
            initial_investment=body.get("initial_investment", 0),
            tax_regime=body.get("tax_regime", "general"),
            custom_tax_rate=body.get("custom_tax_rate"),
            currency=body.get("currency", "USD"),
        )
        # WACC if requested
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
            r = {"name": name, "npv": raw.get("npv", 0), "irr": raw.get("irr"), "mirr": raw.get("mirr"), "payback_period": raw.get("payback_years"), "profitability_index": raw.get("profitability_index"), "roi_pct": raw.get("roi_pct")}
            results.append(r)
            if raw.get("npv", 0) > best_npv_val:
                best_npv_val = raw["npv"]; best_npv_name = name
            if (raw.get("irr") or 0) > best_irr_val:
                best_irr_val = raw.get("irr", 0); best_irr_name = name
            pb = raw.get("payback_years") or 999
            if pb < best_pb_val:
                best_pb_val = pb; best_pb_name = name
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
        if not pos_cfs:
            pos_cfs = [10000]
        raw = calc.sensitivity_analysis(cash_flows=pos_cfs, discount_rate=dr, initial_investment=inv, variation_pct=body.get("variation_range_pct", 20))
        mode = body.get("mode", "tornado")
        base_npv = raw.get("base_npv", 0)
        result = {"mode": mode, "base_npv": base_npv}
        if mode == "tornado":
            tornado_items = []
            for t in raw.get("tornado", []):
                tornado_items.append({"label": t["variable"], "impact": t["npv_range"], "low_npv": t["npv_low"], "high_npv": t["npv_high"]})
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


@router.post("/monte-carlo", summary="Monte Carlo (frontend format)")
async def fe_monte_carlo(body: dict = Body(...), _u=Depends(get_current_user)):
    try:
        base = body.get("base_params", body)
        cfs = base.get("cash_flows") or build_cash_flows(base)
        inv = base.get("initial_investment", 0)
        dr = base.get("discount_rate", 20) / 100 if base.get("discount_rate", 20) > 1 else base.get("discount_rate", 0.10)
        pos_cfs = [c for c in cfs if c > 0]
        if not pos_cfs:
            pos_cfs = [10000]
        n_sim = body.get("n_simulations", 10000)
        raw = calc.monte_carlo_npv(initial_investment=inv, base_cash_flows=pos_cfs, discount_rate=dr, n_simulations=min(n_sim, 50000))
        prob = raw.get("prob_positive", 0)
        p50 = raw.get("p50", 0)
        interp = "High confidence" if prob > 70 else "Moderate confidence" if prob > 40 else "Low confidence"
        interp += f": {prob}% probability of positive NPV."
        if p50 > 0:
            interp += f" Median NPV is positive ({p50:,.0f})."
        else:
            interp += f" Median NPV is negative ({p50:,.0f})."
        return {
            "n_simulations": raw.get("n_simulations", n_sim),
            "mean_npv": raw.get("mean_npv", 0),
            "std_npv": raw.get("std_npv", 0),
            "prob_positive": prob / 100,
            "p10": raw.get("p10", 0),
            "p25": raw.get("p5", 0),
            "p50": raw.get("p50", 0),
            "p75": raw.get("p95", 0),
            "p90": raw.get("p90", 0),
            "var_95": raw.get("var_95", 0),
            "cvar_95": raw.get("cvar_95", 0),
            "min_npv": raw.get("min_npv", 0),
            "max_npv": raw.get("max_npv", 0),
            "interpretation": interp,
        }
    except Exception as e:
        logger.error("FE Monte Carlo error: %s", e)
        raise HTTPException(status_code=500, detail="Monte Carlo error")
