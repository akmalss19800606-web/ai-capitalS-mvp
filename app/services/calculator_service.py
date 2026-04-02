"""
Investment Calculator Pro - CALC-003
DCF, NPV, IRR, XIRR, MIRR, Payback, WACC, PI, ROI
Monte Carlo, Sensitivity, Benchmarks UZ 2026
"""

import logging
import math
import random
from typing import Optional, List, Dict
from decimal import Decimal

logger = logging.getLogger(__name__)

try:
    import numpy_financial as npf
    NPF_AVAILABLE = True
except ImportError:
    NPF_AVAILABLE = False
    logger.warning("numpy-financial unavailable")

try:
    from scipy.optimize import brentq
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


# --- UZ Tax Regimes 2026 ---
TAX_REGIMES = {
    "general": {"name": "General", "cit": 0.15, "vat": 0.12, "social": 0.12},
    "simplified": {"name": "Simplified", "cit": 0.04, "vat": 0.0, "social": 0.12},
    "sez": {"name": "SEZ", "cit": 0.0, "vat": 0.0, "social": 0.12},
    "custom": {"name": "Custom", "cit": 0.15, "vat": 0.12, "social": 0.12},
}

# --- UZ Benchmarks 2026 ---
BENCHMARKS_UZ_2026 = {
    "uzs_deposit": {"name": "Deposit UZS", "rate": 22.5, "type": "deposit"},
    "usd_deposit": {"name": "Deposit USD", "rate": 6.0, "type": "deposit"},
    "gov_bond_3y": {"name": "Gov Bond 3Y UZS", "rate": 15.8, "type": "bond"},
    "gov_bond_10y": {"name": "Gov Bond 10Y UZS", "rate": 15.0, "type": "bond"},
    "eurobond_7y": {"name": "Eurobond 7Y USD", "rate": 6.95, "type": "bond"},
    "tsmi_index": {"name": "TSMI Index", "rate": 12.0, "type": "equity"},
    "real_estate": {"name": "Real Estate", "rate": 10.0, "type": "real_estate"},
    "inflation": {"name": "Inflation", "rate": 7.2, "type": "macro"},
    "cb_rate": {"name": "CB Rate", "rate": 14.0, "type": "macro"},
}

# --- WACC Defaults (UZ 2026) ---
WACC_DEFAULTS = {
    "rf": 0.043,
    "erp": 0.055,
    "crp": 0.055,
    "scp": 0.025,
    "beta": 1.0,
    "rd": 0.228,
    "tax": 0.15,
}


class InvestmentCalculatorService:
    """Production-grade investment calculator for UZ market."""

    @staticmethod
    def calculate_wacc_capm(
        equity_weight: float = 0.6,
        debt_weight: float = 0.4,
        risk_free_rate: float = 0.043,
        beta: float = 1.0,
        equity_risk_premium: float = 0.055,
        country_risk_premium: float = 0.055,
        size_premium: float = 0.025,
        cost_of_debt: float = 0.228,
        tax_rate: float = 0.15,
        cost_equity: float = None,
    ) -> dict:
        """WACC via CAPM: Re = Rf + Beta*(ERP+CRP) + SCP."""
        # Validate weights sum to 1.0
        total_weight = equity_weight + debt_weight
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"equity_weight + debt_weight must equal 1.0, got {total_weight}")
        if cost_equity is not None and cost_equity > 0:
            ke = cost_equity
        else:
            ke = risk_free_rate + beta * (equity_risk_premium + country_risk_premium) + size_premium
        wacc = equity_weight * ke + debt_weight * cost_of_debt * (1 - tax_rate)
        return {
            "wacc": round(wacc, 6),
            "wacc_pct": round(wacc * 100, 2),
            "ke": round(ke, 6),
            "ke_pct": round(ke * 100, 2),
            "kd_after_tax": round(cost_of_debt * (1 - tax_rate), 6),
            "equity_weight": equity_weight,
            "debt_weight": debt_weight,
            "components": {
                "rf": risk_free_rate, "beta": beta,
                "erp": equity_risk_premium, "crp": country_risk_premium,
                "scp": size_premium, "rd": cost_of_debt, "tax": tax_rate,
            },
        }
      
    @staticmethod
    def calculate_dcf(
        cash_flows: list,
        discount_rate: float,
        terminal_growth: float = 0.0,
        initial_investment: float = 0.0,
        tax_regime: str = "general",
        custom_tax_rate: float = None,
        currency: str = "USD",
    ) -> dict:
        """Enhanced DCF with NPV, IRR, XIRR, MIRR, PI, ROI, Payback."""
        if not cash_flows:
            return {"error": "Cash flows required"}
        tax_r = custom_tax_rate if custom_tax_rate is not None else TAX_REGIMES.get(tax_regime, TAX_REGIMES["general"])["cit"]
        inv = initial_investment if initial_investment > 0 else abs(cash_flows[0]) if cash_flows[0] < 0 else 0
        # Periods
        periods = []
        total_pv = 0.0
        cumulative_cf = 0.0
        cumulative_pv = 0.0
        simple_payback = None
        disc_payback = None
        for t, cf in enumerate(cash_flows):
            df = 1.0 / ((1 + discount_rate) ** t) if t > 0 else 1.0
            pv = cf * df
            total_pv += pv
            cumulative_cf += cf
            cumulative_pv += pv
            if simple_payback is None and cumulative_cf >= 0 and t > 0:
                prev = cumulative_cf - cf
                if cf > 0 and prev < 0:
                    simple_payback = round(t - 1 + (-prev / cf), 2)
                elif cf != 0:
                    simple_payback = float(t)
            if disc_payback is None and cumulative_pv >= 0 and t > 0:
                prev_pv = cumulative_pv - pv
                disc_payback = round(t - 1 + (-prev_pv / pv) if pv != 0 else t, 2)
            periods.append({"period": t, "cash_flow": round(cf, 2), "discount_factor": round(df, 6), "present_value": round(pv, 2), "cumulative_cf": round(cumulative_cf, 2), "cumulative_pv": round(cumulative_pv, 2)})
        # Terminal value
        tv = 0.0
        tv_pv = 0.0
        if terminal_growth > 0 and len(cash_flows) > 1 and discount_rate > terminal_growth:
            last_cf = cash_flows[-1]
            tv = (last_cf * (1 + terminal_growth)) / (discount_rate - terminal_growth)
            tv_pv = tv / ((1 + discount_rate) ** (len(cash_flows) - 1))
            total_pv += tv_pv
        npv = total_pv
        # IRR
        irr_val = InvestmentCalculatorService._calc_irr(cash_flows)
        irr_pct = round(irr_val * 100, 2) if irr_val is not None else None
        # MIRR
        mirr_val = InvestmentCalculatorService._calc_mirr(cash_flows, discount_rate, discount_rate)
        mirr_pct = round(mirr_val * 100, 2) if mirr_val is not None else None
        # PI: PV of future CFs / initial investment
        # npv already includes CF[0] at t=0 (the investment), so:
        # npv = -inv + PV_of_future → (npv + inv) / inv = PV_of_future / inv. Correct.
        pi = round((npv + inv) / inv, 4) if inv > 0 else None
        # NPV-based ROI (NPVI)
        roi_pct = round((npv / inv) * 100, 2) if inv > 0 else None
        # Simple ROI: (total undiscounted future CFs - investment) / investment
        simple_roi_pct = round((sum(cash_flows[1:]) - inv) / inv * 100, 2) if inv > 0 and len(cash_flows) > 1 else None
        # Tax savings: SEZ saves vs general regime CIT
        tax_savings = round(inv * TAX_REGIMES["general"]["cit"] * 0.1, 2) if tax_regime == "sez" else 0
        return {
            "npv": round(npv, 2), "irr": irr_pct, "mirr": mirr_pct,
            "payback_years": simple_payback, "discounted_payback": disc_payback,
            "profitability_index": pi, "roi_pct": roi_pct, "npv_roi_pct": roi_pct,
            "simple_roi_pct": simple_roi_pct,
            "dcf_value": round(total_pv, 2),
            "terminal_value": round(tv, 2), "tv_present_value": round(tv_pv, 2),
            "discount_rate": discount_rate, "discount_rate_pct": round(discount_rate * 100, 2),
            "initial_investment": round(inv, 2),
            "tax_regime": tax_regime, "tax_rate": tax_r, "tax_savings": tax_savings,
            "currency": currency, "num_periods": len(cash_flows),
            "periods": periods,
        }
      
    @staticmethod
    def _calc_irr(cash_flows: list) -> Optional[float]:
        if not cash_flows or len(cash_flows) < 2:
            return None
        if NPF_AVAILABLE:
            try:
                v = float(npf.irr(cash_flows))
                if not (math.isnan(v) or math.isinf(v)):
                    return v
            except Exception:
                pass
        if SCIPY_AVAILABLE:
            try:
                def f(r): return sum(cf / ((1 + r) ** t) for t, cf in enumerate(cash_flows))
                return brentq(f, -0.99, 10.0)
            except Exception:
                pass
        # Newton fallback
        rate = 0.1
        for _ in range(200):
            npv_v = sum(cf / ((1 + rate) ** t) for t, cf in enumerate(cash_flows))
            dnpv = sum(-t * cf / ((1 + rate) ** (t + 1)) for t, cf in enumerate(cash_flows))
            if abs(dnpv) < 1e-14:
                break
            nr = rate - npv_v / dnpv
            if abs(nr - rate) < 1e-10:
                return nr
            rate = nr
        return rate if abs(sum(cf / ((1 + rate) ** t) for t, cf in enumerate(cash_flows))) < 1.0 else None

    @staticmethod
    def _calc_mirr(cash_flows: list, finance_rate: float, reinvest_rate: float) -> Optional[float]:
        if not cash_flows or len(cash_flows) < 2:
            return None
        n = len(cash_flows) - 1
        neg_pv = sum(cf / ((1 + finance_rate) ** t) for t, cf in enumerate(cash_flows) if cf < 0)
        pos_fv = sum(cf * ((1 + reinvest_rate) ** (n - t)) for t, cf in enumerate(cash_flows) if cf > 0)
        if neg_pv >= 0 or pos_fv <= 0:
            return None
        return ((-pos_fv / neg_pv) ** (1.0 / n)) - 1
      
    @staticmethod
    def monte_carlo_npv(
        initial_investment: float,
        base_cash_flows: list,
        discount_rate: float,
        n_simulations: int = 10000,
        revenue_std: float = 0.15,
        cost_std: float = 0.10,
        rate_std: float = 0.02,
    ) -> dict:
        results = []
        for _ in range(n_simulations):
            rs = random.gauss(1.0, revenue_std)
            cs = random.gauss(1.0, cost_std)
            rts = random.gauss(0, rate_std)
            adj_cfs = [cf * rs / cs if cs != 0 else cf * rs for cf in base_cash_flows]
            adj_r = max(discount_rate + rts, 0.01)
            npv = sum(cf / ((1 + adj_r) ** t) for t, cf in enumerate(adj_cfs))
            results.append(round(npv, 2))
        results.sort()
        n = len(results)
        mean = sum(results) / n
        std = (sum((x - mean) ** 2 for x in results) / n) ** 0.5
        p10 = results[int(n * 0.10)]
        p50 = results[int(n * 0.50)]
        p90 = results[int(n * 0.90)]
        prob_pos = sum(1 for x in results if x > 0) / n
        var95 = results[int(n * 0.05)]
        cvar_vals = [x for x in results if x <= var95]
        cvar95 = sum(cvar_vals) / max(len(cvar_vals), 1)
        mn, mx = results[0], results[-1]
        bs = (mx - mn) / 20 if mx > mn else 1
        hist = []
        for i in range(20):
            lo = mn + i * bs
            hi = lo + bs
            c = sum(1 for x in results if lo <= x < hi)
            hist.append({"bin_start": round(lo, 0), "bin_end": round(hi, 0), "count": c})
        return {
            "n_simulations": n_simulations, "mean_npv": round(mean, 2),
            "std_npv": round(std, 2), "median_npv": round(p50, 2),
            "p10": round(p10, 2), "p50": round(p50, 2), "p90": round(p90, 2),
            "p5": round(results[int(n * 0.05)], 2), "p95": round(results[int(n * 0.95)], 2),
            "prob_positive": round(prob_pos * 100, 1),
            "var_95": round(var95, 2), "cvar_95": round(cvar95, 2),
            "min_npv": round(mn, 2), "max_npv": round(mx, 2),
            "histogram": hist,
        }
      
    @staticmethod
    def sensitivity_analysis(
        cash_flows: list, discount_rate: float, initial_investment: float,
        variables: dict = None, variation_pct: float = 20.0, steps: int = 11,
    ) -> dict:
        if variables is None:
            variables = {"revenue": 1.0, "costs": 1.0, "discount_rate": discount_rate, "growth": 0.05}
        def cn(cfs, r):
            return sum(cf / ((1 + r) ** t) for t, cf in enumerate(cfs))
        base = cn(cash_flows, discount_rate)
        tornado = []
        spider = []
        for vn, bv in variables.items():
            lo = bv * (1 - variation_pct / 100)
            hi = bv * (1 + variation_pct / 100)
            if vn == "discount_rate":
                nl = cn(cash_flows, max(lo, 0.01))
                nh = cn(cash_flows, hi)
            elif vn == "revenue":
                nl = cn([cf * lo for cf in cash_flows], discount_rate)
                nh = cn([cf * hi for cf in cash_flows], discount_rate)
            elif vn == "costs":
                # Higher costs = lower CF: CF_adjusted = CF * (2 - factor)
                nl = cn([cf * (2 - lo) for cf in cash_flows], discount_rate)
                nh = cn([cf * (2 - hi) for cf in cash_flows], discount_rate)
            else:
                nl = base * (1 - variation_pct / 100)
                nh = base * (1 + variation_pct / 100)
            tornado.append({"variable": vn, "base_value": round(bv, 4), "npv_low": round(nl, 2), "npv_high": round(nh, 2), "npv_range": round(abs(nh - nl), 2)})
            pts = []
            for i in range(steps):
                pct = -variation_pct + (2 * variation_pct * i / (steps - 1))
                fac = 1 + pct / 100
                if vn == "discount_rate":
                    v = cn(cash_flows, max(bv * fac, 0.01))
                elif vn == "revenue":
                    v = cn([cf * fac for cf in cash_flows], discount_rate)
                else:
                    v = base * fac
                pts.append({"pct_change": round(pct, 1), "npv": round(v, 2)})
            spider.append({"variable": vn, "points": pts})
        tornado.sort(key=lambda x: x["npv_range"], reverse=True)
        return {"base_npv": round(base, 2), "variation_pct": variation_pct, "tornado": tornado, "spider": spider}
      
    @staticmethod
    def get_benchmarks(npv: float = 0, irr_pct: float = 0, investment_usd: float = 0, horizon_years: int = 3) -> dict:
        comparisons = []
        for key, bm in BENCHMARKS_UZ_2026.items():
            bm_ret = investment_usd * ((1 + bm["rate"] / 100) ** horizon_years - 1) if investment_usd else 0
            delta = irr_pct - bm["rate"]
            comparisons.append({"benchmark": bm["name"], "benchmark_rate": bm["rate"], "type": bm["type"], "project_irr": round(irr_pct, 2), "delta": round(delta, 2), "benchmark_return_usd": round(bm_ret, 2), "beats_benchmark": delta > 0})
        beaten = sum(1 for c in comparisons if c["beats_benchmark"])
        return {"project_npv": round(npv, 2), "project_irr": round(irr_pct, 2), "investment_usd": round(investment_usd, 2), "horizon_years": horizon_years, "comparisons": comparisons, "benchmarks_beaten": beaten, "total_benchmarks": len(comparisons), "score_pct": round(beaten / len(comparisons) * 100, 1)}

    @staticmethod
    def full_analysis(
        cash_flows: list, discount_rate: float, initial_investment: float = 0,
        equity: float = 0, debt: float = 0, cost_equity: float = 0.12,
        cost_debt: float = 0.08, tax_rate: float = 0.15,
        terminal_growth: float = 0.0, tax_regime: str = "general",
        currency: str = "USD",
    ) -> dict:
        calc = InvestmentCalculatorService
        dcf = calc.calculate_dcf(cash_flows, discount_rate, terminal_growth, initial_investment, tax_regime, currency=currency)
        inv = dcf.get("initial_investment", 0)
        base_cfs = list(cash_flows) if cash_flows else []
        mc = calc.monte_carlo_npv(inv, base_cfs, discount_rate, n_simulations=5000) if inv > 0 and base_cfs else None
        sens = calc.sensitivity_analysis(base_cfs, discount_rate, inv) if inv > 0 and base_cfs else None
        irr_pct = dcf.get("irr", 0) or 0
        bench = calc.get_benchmarks(npv=dcf.get("npv", 0), irr_pct=irr_pct, investment_usd=inv, horizon_years=len(cash_flows) - 1)
        wacc_data = None
        if equity > 0 or debt > 0:
            total = equity + debt
            wacc_data = calc.calculate_wacc_capm(equity_weight=equity / total, debt_weight=debt / total, cost_of_debt=cost_debt, tax_rate=tax_rate, cost_equity=cost_equity)
        # Scoring
        npv_val = dcf.get("npv", 0)
        signals = []
        if npv_val > 0: signals.append("NPV > 0")
        else: signals.append("NPV < 0")
        if irr_pct and irr_pct > discount_rate * 100: signals.append(f"IRR {irr_pct}% > DR {discount_rate*100}%")
        pb = dcf.get("payback_years")
        if pb and pb <= 5: signals.append(f"Payback {pb}y")
        pi = dcf.get("profitability_index")
        if pi and pi > 1: signals.append(f"PI={pi}")
        score = sum(1 for s in signals if "<" not in s and "NPV < 0" not in s) / max(len(signals), 1) * 100
        rec = "INVEST" if score >= 60 else "ADDITIONAL ANALYSIS NEEDED"
        return {
            "dcf": dcf, "monte_carlo": mc, "sensitivity": sens, "benchmarks": bench, "wacc": wacc_data,
            "overall": {"invest_score": round(score, 1), "recommendation": rec, "signals": signals},
        }

    @staticmethod
    def compare_scenarios(scenarios: list) -> dict:
        calc = InvestmentCalculatorService
        results = []
        for i, sc in enumerate(scenarios):
            r = calc.full_analysis(**sc)
            r["scenario_index"] = i
            results.append(r)
        return {"scenarios": results, "count": len(results)}

    @staticmethod
    def get_tax_rates() -> dict:
        return TAX_REGIMES

    @staticmethod
    def get_wacc_defaults() -> dict:
        return WACC_DEFAULTS

    @staticmethod
    def get_benchmarks_list() -> dict:
        return BENCHMARKS_UZ_2026
