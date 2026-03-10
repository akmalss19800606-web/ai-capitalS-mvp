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
