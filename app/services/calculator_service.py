"""
Инвестиционный калькулятор — DCF, NPV, IRR, Payback, WACC.

Фаза 3, CALC-001:
  - DCF (Discounted Cash Flow) с детализацией по периодам
  - NPV (Net Present Value)
  - IRR (Internal Rate of Return) через numpy-financial / scipy
  - Payback Period (простой + дисконтированный)
  - WACC (Weighted Average Cost of Capital)
  - Полный анализ инвестиции (все метрики)
"""

import logging
import math
import random
from typing import Optional

logger = logging.getLogger(__name__)

# ── Попытка импорта numpy-financial ──────────────────────────

try:
    import numpy_financial as npf
    NPF_AVAILABLE = True
except ImportError:
    NPF_AVAILABLE = False
    logger.warning("numpy-financial недоступен — IRR через приближение Ньютона")

try:
    from scipy.optimize import brentq
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


class InvestmentCalculatorService:
    """Сервис инвестиционных расчётов."""

    @staticmethod
    def calculate_dcf(
        cash_flows: list[float],
        discount_rate: float,
        terminal_growth: float = 0.0,
    ) -> dict:
        """
        Расчёт DCF (Discounted Cash Flow).

        Args:
            cash_flows: Денежные потоки [CF0, CF1, CF2, ...] (CF0 — начальная инвестиция, обычно отрицательна)
            discount_rate: Ставка дисконтирования (0.1 = 10%)
            terminal_growth: Ставка роста терминальной стоимости (0.02 = 2%)

        Returns:
            Детализация по периодам + итоговая DCF-стоимость.
        """
        if not cash_flows:
            return {"error": "Необходимо передать хотя бы один денежный поток"}

        periods = []
        total_pv = 0.0

        for t, cf in enumerate(cash_flows):
            discount_factor = 1 / ((1 + discount_rate) ** t) if t > 0 else 1.0
            pv = cf * discount_factor
            total_pv += pv
            periods.append({
                "period": t,
                "cash_flow": round(cf, 2),
                "discount_factor": round(discount_factor, 6),
                "present_value": round(pv, 2),
            })

        # Терминальная стоимость (Gordon Growth Model)
        terminal_value = 0.0
        if terminal_growth > 0 and len(cash_flows) > 1 and discount_rate > terminal_growth:
            last_cf = cash_flows[-1]
            terminal_value = (last_cf * (1 + terminal_growth)) / (discount_rate - terminal_growth)
            tv_pv = terminal_value / ((1 + discount_rate) ** (len(cash_flows) - 1))
            total_pv += tv_pv

        return {
            "dcf_value": round(total_pv, 2),
            "discount_rate": discount_rate,
            "terminal_growth": terminal_growth,
            "terminal_value": round(terminal_value, 2),
            "periods": periods,
            "num_periods": len(cash_flows),
        }

    @staticmethod
    def calculate_npv(
        cash_flows: list[float],
        discount_rate: float,
    ) -> dict:
        """
        Расчёт NPV (Net Present Value).

        Args:
            cash_flows: [CF0, CF1, CF2, ...] — CF0 обычно отрицательная инвестиция.
            discount_rate: Ставка дисконтирования.

        Returns:
            NPV и признак рентабельности.
        """
        if not cash_flows:
            return {"error": "Необходимо передать денежные потоки"}

        npv = sum(cf / ((1 + discount_rate) ** t) for t, cf in enumerate(cash_flows))

        return {
            "npv": round(npv, 2),
            "discount_rate": discount_rate,
            "is_profitable": npv > 0,
            "recommendation": "Проект рентабелен (NPV > 0)" if npv > 0 else "Проект нерентабелен (NPV < 0)",
        }

    @staticmethod
    def calculate_irr(cash_flows: list[float]) -> dict:
        """
        Расчёт IRR (Internal Rate of Return).

        Args:
            cash_flows: [CF0, CF1, CF2, ...].

        Returns:
            IRR в процентах.
        """
        if not cash_flows or len(cash_flows) < 2:
            return {"error": "Необходимо минимум 2 периода денежных потоков"}

        irr_value = None

        # Метод 1: numpy-financial
        if NPF_AVAILABLE:
            try:
                irr_value = float(npf.irr(cash_flows))
                if math.isnan(irr_value) or math.isinf(irr_value):
                    irr_value = None
            except Exception:
                irr_value = None

        # Метод 2: scipy brentq
        if irr_value is None and SCIPY_AVAILABLE:
            try:
                def npv_func(r):
                    return sum(cf / ((1 + r) ** t) for t, cf in enumerate(cash_flows))
                irr_value = brentq(npv_func, -0.99, 10.0)
            except Exception:
                irr_value = None

        # Метод 3: Приближение Ньютона
        if irr_value is None:
            irr_value = InvestmentCalculatorService._irr_newton(cash_flows)

        if irr_value is None:
            return {"error": "Не удалось рассчитать IRR — проверьте денежные потоки"}

        return {
            "irr": round(irr_value, 6),
            "irr_percent": round(irr_value * 100, 2),
            "recommendation": (
                f"IRR = {round(irr_value * 100, 2)}%. "
                "Сравните с WACC или требуемой доходностью."
            ),
        }

    @staticmethod
    def _irr_newton(cash_flows: list[float], tol: float = 1e-8, max_iter: int = 100) -> Optional[float]:
        """Приближение IRR методом Ньютона-Рафсона."""
        rate = 0.1  # начальное приближение

        for _ in range(max_iter):
            npv = sum(cf / ((1 + rate) ** t) for t, cf in enumerate(cash_flows))
            dnpv = sum(-t * cf / ((1 + rate) ** (t + 1)) for t, cf in enumerate(cash_flows))

            if abs(dnpv) < 1e-14:
                break

            new_rate = rate - npv / dnpv
            if abs(new_rate - rate) < tol:
                return new_rate
            rate = new_rate

        return rate if abs(sum(cf / ((1 + rate) ** t) for t, cf in enumerate(cash_flows))) < 1.0 else None

    @staticmethod
    def calculate_payback(
        cash_flows: list[float],
        discount_rate: float = 0.0,
    ) -> dict:
        """
        Расчёт срока окупаемости (простой + дисконтированный).

        Args:
            cash_flows: [CF0, CF1, CF2, ...].
            discount_rate: Для дисконтированного payback.

        Returns:
            Простой и дисконтированный сроки окупаемости.
        """
        if not cash_flows:
            return {"error": "Необходимо передать денежные потоки"}

        # Простой Payback
        cumulative = 0.0
        simple_payback = None
        for t, cf in enumerate(cash_flows):
            cumulative += cf
            if cumulative >= 0 and t > 0:
                # Интерполяция
                prev_cum = cumulative - cf
                fraction = (-prev_cum) / cf if cf != 0 else 0
                simple_payback = round(t - 1 + fraction, 2)
                break

        # Дисконтированный Payback
        cumulative_pv = 0.0
        discounted_payback = None
        if discount_rate > 0:
            for t, cf in enumerate(cash_flows):
                pv = cf / ((1 + discount_rate) ** t) if t > 0 else cf
                cumulative_pv += pv
                if cumulative_pv >= 0 and t > 0:
                    prev_cum = cumulative_pv - pv
                    fraction = (-prev_cum) / pv if pv != 0 else 0
                    discounted_payback = round(t - 1 + fraction, 2)
                    break

        return {
            "simple_payback_years": simple_payback,
            "discounted_payback_years": discounted_payback,
            "discount_rate": discount_rate,
            "total_investment": round(abs(cash_flows[0]), 2) if cash_flows else 0,
            "recommendation": (
                f"Простой срок: {simple_payback or 'не окупается'} лет. "
                + (f"Дисконтированный: {discounted_payback or 'не окупается'} лет." if discount_rate > 0 else "")
            ),
        }

    @staticmethod
    def calculate_wacc(
        equity: float,
        debt: float,
        cost_equity: float,
        cost_debt: float,
        tax_rate: float,
    ) -> dict:
        """
        Расчёт WACC (Weighted Average Cost of Capital).

        Args:
            equity: Объём собственного капитала.
            debt: Объём заёмного капитала.
            cost_equity: Стоимость собственного капитала (0.12 = 12%).
            cost_debt: Стоимость заёмного капитала (0.08 = 8%).
            tax_rate: Ставка налога на прибыль (0.15 = 15%).

        Returns:
            WACC и компоненты расчёта.
        """
        total_capital = equity + debt
        if total_capital <= 0:
            return {"error": "Общий капитал должен быть > 0"}

        weight_equity = equity / total_capital
        weight_debt = debt / total_capital

        wacc = (weight_equity * cost_equity) + (weight_debt * cost_debt * (1 - tax_rate))

        return {
            "wacc": round(wacc, 6),
            "wacc_percent": round(wacc * 100, 2),
            "weight_equity": round(weight_equity, 4),
            "weight_debt": round(weight_debt, 4),
            "cost_equity": cost_equity,
            "cost_debt": cost_debt,
            "tax_rate": tax_rate,
            "total_capital": round(total_capital, 2),
            "recommendation": f"WACC = {round(wacc * 100, 2)}%. Используйте как ставку дисконтирования для NPV/DCF.",
        }

    @staticmethod
    def full_analysis(
        cash_flows: list[float],
        discount_rate: float,
        equity: float = 0,
        debt: float = 0,
        cost_equity: float = 0.12,
        cost_debt: float = 0.08,
        tax_rate: float = 0.15,
        terminal_growth: float = 0.0,
    ) -> dict:
        """
        Полный инвестиционный анализ — все метрики одним запросом.

        Returns:
            Комплексный результат: DCF, NPV, IRR, Payback, WACC.
        """
        calc = InvestmentCalculatorService

        result = {
            "dcf": calc.calculate_dcf(cash_flows, discount_rate, terminal_growth),
            "npv": calc.calculate_npv(cash_flows, discount_rate),
            "irr": calc.calculate_irr(cash_flows),
            "payback": calc.calculate_payback(cash_flows, discount_rate),
        }

        # WACC — только если указан капитал
        if equity > 0 or debt > 0:
            result["wacc"] = calc.calculate_wacc(equity, debt, cost_equity, cost_debt, tax_rate)
        else:
            result["wacc"] = {"note": "Не указаны equity/debt — WACC не рассчитан"}

        # Общая рекомендация
        npv_val = result["npv"].get("npv", 0)
        irr_val = result["irr"].get("irr_percent")
        payback = result["payback"].get("simple_payback_years")

        signals = []
        if npv_val > 0:
            signals.append("NPV положительный ✅")
        else:
            signals.append("NPV отрицательный ⚠️")

        if irr_val and irr_val > discount_rate * 100:
            signals.append(f"IRR ({irr_val}%) > ставка дисконтирования ({discount_rate*100}%) ✅")
        elif irr_val:
            signals.append(f"IRR ({irr_val}%) < ставка дисконтирования ({discount_rate*100}%) ⚠️")

        if payback and payback <= 5:
            signals.append(f"Окупаемость {payback} лет ✅")
        elif payback:
            signals.append(f"Окупаемость {payback} лет (долгая) ⚠️")

        result["overall"] = {
            "signals": signals,
            "invest_score": sum(1 for s in signals if "✅" in s) / max(len(signals), 1) * 100,
            "recommendation": (
                "Рекомендация: ИНВЕСТИРОВАТЬ"
                if sum(1 for s in signals if "✅" in s) >= 2
                else "Рекомендация: ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНЫЙ АНАЛИЗ"
            ),
        }

        return result

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
        """
        Monte Carlo simulation for NPV.
        Returns distribution of NPV outcomes with P10, P50, P90, VaR, CVaR.
        """
        npv_results = []
        for _ in range(n_simulations):
            revenue_shock = random.gauss(1.0, revenue_std)
            cost_shock = random.gauss(1.0, cost_std)
            rate_shock = random.gauss(0, rate_std)
            adjusted_cfs = [cf * revenue_shock * cost_shock for cf in base_cash_flows]
            adjusted_rate = max(discount_rate + rate_shock, 0.01)
            npv = -initial_investment + sum(
                cf / ((1 + adjusted_rate) ** t)
                for t, cf in enumerate(adjusted_cfs, 1)
            )
            npv_results.append(round(npv, 2))

        npv_results.sort()
        n = len(npv_results)
        mean_npv = sum(npv_results) / n
        p10 = npv_results[int(n * 0.10)]
        p50 = npv_results[int(n * 0.50)]
        p90 = npv_results[int(n * 0.90)]
        prob_positive = sum(1 for x in npv_results if x > 0) / n
        var_95 = npv_results[int(n * 0.05)]
        cvar_95_vals = [x for x in npv_results if x <= var_95]
        cvar_95 = sum(cvar_95_vals) / max(len(cvar_95_vals), 1)

        # Histogram bins (20 buckets)
        min_v, max_v = npv_results[0], npv_results[-1]
        bucket_size = (max_v - min_v) / 20 if max_v > min_v else 1
        histogram = []
        for i in range(20):
            lo = min_v + i * bucket_size
            hi = lo + bucket_size
            count = sum(1 for x in npv_results if lo <= x < hi)
            histogram.append({"bin_start": round(lo, 0), "bin_end": round(hi, 0), "count": count})

        return {
            "n_simulations": n_simulations,
            "mean_npv": round(mean_npv, 2),
            "std_npv": round((sum((x - mean_npv) ** 2 for x in npv_results) / n) ** 0.5, 2),
            "p10": round(p10, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "prob_positive": round(prob_positive * 100, 1),
            "var_95": round(var_95, 2),
            "cvar_95": round(cvar_95, 2),
            "histogram": histogram,
            "min_npv": round(npv_results[0], 2),
            "max_npv": round(npv_results[-1], 2),
        }

    @staticmethod
    def sensitivity_analysis(
        cash_flows: list,
        discount_rate: float,
        initial_investment: float,
        variables: dict = None,
        variation_pct: float = 20.0,
        steps: int = 11,
    ) -> dict:
        """
        Sensitivity analysis: varies each input +/- variation_pct.
        Returns tornado data and spider chart data.
        """
        if variables is None:
            variables = {
                "revenue": 1.0,
                "costs": 1.0,
                "discount_rate": discount_rate,
                "growth": 0.05,
            }

        def calc_npv(cfs, rate):
            return -initial_investment + sum(
                cf / ((1 + rate) ** t) for t, cf in enumerate(cfs, 1)
            )

        base_npv = calc_npv(cash_flows, discount_rate)
        tornado = []
        spider = []

        for var_name, base_val in variables.items():
            low_val = base_val * (1 - variation_pct / 100)
            high_val = base_val * (1 + variation_pct / 100)

            if var_name == "discount_rate":
                npv_low = calc_npv(cash_flows, max(low_val, 0.01))
                npv_high = calc_npv(cash_flows, high_val)
            elif var_name == "revenue":
                npv_low = calc_npv([cf * low_val for cf in cash_flows], discount_rate)
                npv_high = calc_npv([cf * high_val for cf in cash_flows], discount_rate)
            elif var_name == "costs":
                npv_low = calc_npv([cf / low_val if low_val else cf for cf in cash_flows], discount_rate)
                npv_high = calc_npv([cf / high_val if high_val else cf for cf in cash_flows], discount_rate)
            else:
                npv_low = base_npv * (1 - variation_pct / 100)
                npv_high = base_npv * (1 + variation_pct / 100)

            tornado.append({
                "variable": var_name,
                "base_value": round(base_val, 4),
                "npv_low": round(npv_low, 2),
                "npv_high": round(npv_high, 2),
                "npv_range": round(abs(npv_high - npv_low), 2),
            })

            # Spider chart points
            spider_points = []
            for i in range(steps):
                pct = -variation_pct + (2 * variation_pct * i / (steps - 1))
                factor = 1 + pct / 100
                if var_name == "discount_rate":
                    npv_pt = calc_npv(cash_flows, max(base_val * factor, 0.01))
                elif var_name == "revenue":
                    npv_pt = calc_npv([cf * factor for cf in cash_flows], discount_rate)
                else:
                    npv_pt = base_npv * factor
                spider_points.append({"pct_change": round(pct, 1), "npv": round(npv_pt, 2)})
            spider.append({"variable": var_name, "points": spider_points})

        tornado.sort(key=lambda x: x["npv_range"], reverse=True)

        return {
            "base_npv": round(base_npv, 2),
            "variation_pct": variation_pct,
            "tornado": tornado,
            "spider": spider,
        }

    @staticmethod
    def get_benchmarks(
        npv: float = 0,
        irr_pct: float = 0,
        investment_usd: float = 0,
        horizon_years: int = 3,
    ) -> dict:
        """
        Compare project metrics vs Uzbekistan market benchmarks 2026.
        """
        BENCHMARKS = {
            "uzs_deposit": {"name": "Депозит UZS", "rate": 22.5, "type": "deposit"},
            "usd_deposit": {"name": "Депозит USD", "rate": 6.0, "type": "deposit"},
            "gov_bond_3y": {"name": "Гособлигации 3Y UZS", "rate": 15.8, "type": "bond"},
            "gov_bond_10y": {"name": "Гособлигации 10Y UZS", "rate": 15.0, "type": "bond"},
            "gov_bond_usd_7y": {"name": "Евробонды 7Y USD", "rate": 6.95, "type": "bond"},
            "tsmi_index": {"name": "Индекс TSMI", "rate": 12.0, "type": "equity"},
            "real_estate": {"name": "Недвижимость", "rate": 10.0, "type": "real_estate"},
            "inflation": {"name": "Инфляция", "rate": 7.2, "type": "macro"},
        }

        comparisons = []
        for key, bm in BENCHMARKS.items():
            bm_return = investment_usd * ((1 + bm["rate"] / 100) ** horizon_years - 1) if investment_usd else 0
            delta = irr_pct - bm["rate"]
            comparisons.append({
                "benchmark": bm["name"],
                "benchmark_rate": bm["rate"],
                "type": bm["type"],
                "project_irr": round(irr_pct, 2),
                "delta": round(delta, 2),
                "benchmark_return_usd": round(bm_return, 2),
                "beats_benchmark": delta > 0,
            })

        beaten = sum(1 for c in comparisons if c["beats_benchmark"])

        return {
            "project_npv": round(npv, 2),
            "project_irr": round(irr_pct, 2),
            "investment_usd": round(investment_usd, 2),
            "horizon_years": horizon_years,
            "comparisons": comparisons,
            "benchmarks_beaten": beaten,
            "total_benchmarks": len(comparisons),
            "score_pct": round(beaten / len(comparisons) * 100, 1),
        }
