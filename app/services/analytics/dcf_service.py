"""
DCF/NPV/IRR калькулятор — расчёт NPV, IRR (бисекция), payback, profitability index.
Зависимости: только stdlib (math, random, logging). Без numpy/scipy.
"""

import logging
import math
import random
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─── Константы калибровки (Узбекистан, 2025) ────────────────────────────────

UZ_INFLATION_RATE = 0.10        # ~10% инфляция
UZ_REFINANCING_RATE = 0.14      # Ставка рефинансирования ЦБ
UZ_GDP_GROWTH = 0.06            # Рост ВВП ~6%
UZ_RISK_PREMIUM = 0.05          # Премия за страновой риск
UZ_DEFAULT_DISCOUNT = 0.18      # Типичная ставка дисконтирования


def _npv(rate: float, cash_flows: List[float]) -> float:
    """Расчёт чистой приведённой стоимости (NPV) по заданной ставке."""
    if rate <= -1.0:
        return float("inf")
    total = 0.0
    for t, cf in enumerate(cash_flows):
        total += cf / ((1.0 + rate) ** t)
    return total


def _irr_bisection(
    cash_flows: List[float],
    lo: float = -0.5,
    hi: float = 5.0,
    tol: float = 1e-8,
    max_iter: int = 300,
) -> Optional[float]:
    """
    Расчёт внутренней нормы доходности (IRR) методом бисекции.

    Обрабатывает краевые случаи:
    - Если NPV > 0 при обоих границах — IRR > верхней границы (возвращает None)
    - Если NPV < 0 при обоих границах — IRR < нижней границы (возвращает None)
    - Если нет смены знака — нет решения
    """
    npv_lo = _npv(lo, cash_flows)
    npv_hi = _npv(hi, cash_flows)

    # Нет смены знака — пробуем расширить диапазон
    if npv_lo * npv_hi > 0:
        # Попытка расширить вверх
        for extended_hi in [10.0, 50.0, 100.0]:
            npv_ext = _npv(extended_hi, cash_flows)
            if npv_lo * npv_ext <= 0:
                hi = extended_hi
                npv_hi = npv_ext
                break
        else:
            # Попытка расширить вниз
            for extended_lo in [-0.8, -0.9, -0.99]:
                npv_ext = _npv(extended_lo, cash_flows)
                if npv_ext * npv_hi <= 0:
                    lo = extended_lo
                    npv_lo = npv_ext
                    break
            else:
                logger.warning("IRR: смена знака не найдена в диапазоне [%.2f, %.2f]", lo, hi)
                return None

    for _ in range(max_iter):
        mid = (lo + hi) / 2.0
        npv_mid = _npv(mid, cash_flows)

        if abs(npv_mid) < tol or (hi - lo) / 2.0 < tol:
            return mid

        if npv_lo * npv_mid < 0:
            hi = mid
            npv_hi = npv_mid
        else:
            lo = mid
            npv_lo = npv_mid

    return (lo + hi) / 2.0


def _payback_period(cash_flows: List[float]) -> Dict[str, Optional[float]]:
    """Расчёт простого и дисконтированного периода окупаемости."""
    if not cash_flows:
        return {"simple": None, "discounted": None}

    # Простой период окупаемости
    cumulative = 0.0
    simple_payback = None
    for t, cf in enumerate(cash_flows):
        cumulative += cf
        if cumulative >= 0 and simple_payback is None:
            # Интерполяция внутри периода
            if t == 0:
                simple_payback = 0.0
            else:
                prev_cum = cumulative - cf
                if cf != 0:
                    simple_payback = t - 1 + abs(prev_cum) / abs(cf)
                else:
                    simple_payback = float(t)

    return {"simple": simple_payback}


def _discounted_payback(cash_flows: List[float], rate: float) -> Optional[float]:
    """Дисконтированный период окупаемости."""
    cumulative_pv = 0.0
    for t, cf in enumerate(cash_flows):
        pv = cf / ((1.0 + rate) ** t) if rate > -1.0 else cf
        cumulative_pv += pv
        if cumulative_pv >= 0:
            if t == 0:
                return 0.0
            prev_cum = cumulative_pv - pv
            if pv != 0:
                return t - 1 + abs(prev_cum) / abs(pv)
            return float(t)
    return None


async def calculate_dcf(
    cash_flows: List[float],
    discount_rate: float,
    terminal_growth: float = 0.03,
    initial_investment: float = 0,
    currency: str = "UZS",
) -> Dict[str, Any]:
    """
    Модель дисконтированных денежных потоков (DCF).

    Аргументы:
        cash_flows: Прогнозные денежные потоки по годам (без начальной инвестиции)
        discount_rate: Ставка дисконтирования (WACC), например 0.15
        terminal_growth: Темп терминального роста (модель Гордона), по умолчанию 3%
        initial_investment: Начальная инвестиция (положительное число — будет вычтено)
        currency: Валюта расчёта (UZS/USD)

    Возвращает:
        NPV, IRR, период окупаемости, индекс рентабельности,
        годовую разбивку PV, терминальную стоимость, таблицу чувствительности.
    """
    logger.info(
        "DCF расчёт: %d потоков, ставка=%.2f%%, терминальный рост=%.2f%%",
        len(cash_flows), discount_rate * 100, terminal_growth * 100,
    )

    if discount_rate <= terminal_growth:
        logger.warning("Ставка дисконтирования ≤ терминального роста, терминальная стоимость не рассчитывается")

    # Полный массив потоков: [-инвестиция, CF1, CF2, ...]
    full_flows = [-abs(initial_investment)] + list(cash_flows) if initial_investment else list(cash_flows)

    # ── Годовая разбивка PV ──
    yearly_breakdown = []
    total_pv_inflows = 0.0
    for t, cf in enumerate(full_flows):
        discount_factor = 1.0 / ((1.0 + discount_rate) ** t) if discount_rate > -1.0 else 1.0
        pv = cf * discount_factor
        yearly_breakdown.append({
            "year": t,
            "cash_flow": round(cf, 2),
            "discount_factor": round(discount_factor, 6),
            "present_value": round(pv, 2),
        })
        if t > 0 and cf > 0:
            total_pv_inflows += pv

    # ── NPV ──
    npv = _npv(discount_rate, full_flows)

    # ── Терминальная стоимость (модель Гордона) ──
    terminal_value = 0.0
    terminal_value_pv = 0.0
    if cash_flows and discount_rate > terminal_growth:
        last_cf = cash_flows[-1]
        n = len(cash_flows)
        terminal_value = (last_cf * (1 + terminal_growth)) / (discount_rate - terminal_growth)
        terminal_value_pv = terminal_value / ((1.0 + discount_rate) ** n)
        npv += terminal_value_pv

    # ── IRR ──
    irr = _irr_bisection(full_flows)

    # ── Период окупаемости ──
    payback = _payback_period(full_flows)
    discounted_pb = _discounted_payback(full_flows, discount_rate)

    # ── Индекс рентабельности (PI) ──
    profitability_index = None
    if initial_investment and initial_investment != 0:
        profitability_index = round((total_pv_inflows + terminal_value_pv) / abs(initial_investment), 4)

    # ── Таблица чувствительности: NPV при ставках ±5% с шагом 1% ──
    sensitivity = []
    for delta_pct in range(-5, 6):
        test_rate = discount_rate + delta_pct / 100.0
        if test_rate <= -1.0:
            continue
        test_npv = _npv(test_rate, full_flows)
        # Добавляем терминальную стоимость
        if cash_flows and test_rate > terminal_growth:
            last_cf = cash_flows[-1]
            tv = (last_cf * (1 + terminal_growth)) / (test_rate - terminal_growth)
            tv_pv = tv / ((1.0 + test_rate) ** len(cash_flows))
            test_npv += tv_pv
        sensitivity.append({
            "discount_rate": round(test_rate, 4),
            "discount_rate_pct": f"{test_rate * 100:.1f}%",
            "npv": round(test_npv, 2),
        })

    result = {
        "npv": round(npv, 2),
        "irr": round(irr, 6) if irr is not None else None,
        "irr_pct": f"{irr * 100:.2f}%" if irr is not None else None,
        "payback_simple": round(payback["simple"], 2) if payback["simple"] is not None else None,
        "payback_discounted": round(discounted_pb, 2) if discounted_pb is not None else None,
        "profitability_index": profitability_index,
        "terminal_value": round(terminal_value, 2),
        "terminal_value_pv": round(terminal_value_pv, 2),
        "yearly_breakdown": yearly_breakdown,
        "sensitivity_table": sensitivity,
        "discount_rate": discount_rate,
        "terminal_growth": terminal_growth,
        "initial_investment": initial_investment,
        "currency": currency,
        "total_cash_flows": len(cash_flows),
    }

    logger.info("DCF результат: NPV=%.2f, IRR=%s", npv, result["irr_pct"])
    return result


