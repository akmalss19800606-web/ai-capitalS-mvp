"""
Сервис портфельной аналитики — DCF/NPV/IRR, What-If, Монте-Карло, бизнес-кейсы.

Модули:
  1. DCF-калькулятор  — расчёт NPV, IRR (бисекция), payback, profitability index
  2. What-If анализ   — сценарии (базовый/оптимистичный/пессимистичный) + торнадо
  3. Монте-Карло      — симуляция на чистом Python (random.gauss), калибровка под Узбекистан
  4. Бизнес-кейсы     — 50+ шаблонов инвестиционных проектов для рынка Узбекистана

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

# ═══════════════════════════════════════════════════════════════════════════════
# 1. DCF / NPV / IRR КАЛЬКУЛЯТОР
# ═══════════════════════════════════════════════════════════════════════════════


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


# ═══════════════════════════════════════════════════════════════════════════════
# 2. WHAT-IF АНАЛИЗ (сценарии, торнадо, паук)
# ═══════════════════════════════════════════════════════════════════════════════


async def what_if_analysis(
    base_cash_flows: List[float],
    base_discount_rate: float,
    initial_investment: float = 0,
    terminal_growth: float = 0.03,
    scenarios: Optional[List[Dict]] = None,
    variables: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Сценарный анализ инвестиционного проекта.

    Включает:
    - Три встроенных сценария: базовый, оптимистичный, пессимистичный
    - Пользовательские сценарии
    - Торнадо-анализ (чувствительность каждой переменной ±20%)
    - Данные для паутинного графика (spider plot)
    - Анализ безубыточности (ставка при NPV=0 → IRR)

    Аргументы:
        base_cash_flows: Базовые прогнозные денежные потоки
        base_discount_rate: Базовая ставка дисконтирования
        initial_investment: Начальная инвестиция
        terminal_growth: Терминальный рост
        scenarios: Пользовательские сценарии [{name, cf_multiplier, discount_delta}]
        variables: Переменные для анализа чувствительности
    """
    logger.info(
        "What-If анализ: %d потоков, ставка=%.2f%%",
        len(base_cash_flows), base_discount_rate * 100,
    )

    # ── Вспомогательная функция: NPV с терминальной стоимостью ──
    def _full_npv(flows: List[float], rate: float, inv: float, tg: float) -> float:
        full = [-abs(inv)] + list(flows) if inv else list(flows)
        result = _npv(rate, full)
        if flows and rate > tg:
            tv = (flows[-1] * (1 + tg)) / (rate - tg)
            tv_pv = tv / ((1.0 + rate) ** len(flows))
            result += tv_pv
        return result

    # ── Базовый NPV ──
    base_npv = _full_npv(base_cash_flows, base_discount_rate, initial_investment, terminal_growth)

    # ── Встроенные сценарии ──
    built_in_scenarios = [
        {
            "name": "Базовый",
            "name_en": "base",
            "cf_multiplier": 1.0,
            "discount_delta": 0.0,
            "description": "Текущие параметры без изменений",
        },
        {
            "name": "Оптимистичный",
            "name_en": "optimistic",
            "cf_multiplier": 1.2,
            "discount_delta": -0.02,
            "description": "Денежные потоки +20%, ставка дисконтирования -2%",
        },
        {
            "name": "Пессимистичный",
            "name_en": "pessimistic",
            "cf_multiplier": 0.8,
            "discount_delta": 0.02,
            "description": "Денежные потоки -20%, ставка дисконтирования +2%",
        },
    ]

    # ── Расчёт сценариев ──
    scenario_results = []
    for sc in built_in_scenarios:
        adj_flows = [cf * sc["cf_multiplier"] for cf in base_cash_flows]
        adj_rate = base_discount_rate + sc["discount_delta"]
        if adj_rate <= -1.0:
            adj_rate = 0.01
        sc_npv = _full_npv(adj_flows, adj_rate, initial_investment, terminal_growth)
        full_sc = [-abs(initial_investment)] + adj_flows if initial_investment else adj_flows
        sc_irr = _irr_bisection(full_sc)
        scenario_results.append({
            "name": sc["name"],
            "name_en": sc["name_en"],
            "description": sc["description"],
            "cf_multiplier": sc["cf_multiplier"],
            "discount_rate": round(adj_rate, 4),
            "npv": round(sc_npv, 2),
            "npv_delta": round(sc_npv - base_npv, 2),
            "irr": round(sc_irr, 6) if sc_irr is not None else None,
            "irr_pct": f"{sc_irr * 100:.2f}%" if sc_irr is not None else None,
        })

    # ── Пользовательские сценарии ──
    if scenarios:
        for sc in scenarios:
            cf_mult = sc.get("cf_multiplier", 1.0)
            disc_delta = sc.get("discount_delta", 0.0)
            adj_flows = [cf * cf_mult for cf in base_cash_flows]
            adj_rate = base_discount_rate + disc_delta
            if adj_rate <= -1.0:
                adj_rate = 0.01
            sc_npv = _full_npv(adj_flows, adj_rate, initial_investment, terminal_growth)
            full_sc = [-abs(initial_investment)] + adj_flows if initial_investment else adj_flows
            sc_irr = _irr_bisection(full_sc)
            scenario_results.append({
                "name": sc.get("name", "Пользовательский"),
                "name_en": "custom",
                "description": sc.get("description", ""),
                "cf_multiplier": cf_mult,
                "discount_rate": round(adj_rate, 4),
                "npv": round(sc_npv, 2),
                "npv_delta": round(sc_npv - base_npv, 2),
                "irr": round(sc_irr, 6) if sc_irr is not None else None,
                "irr_pct": f"{sc_irr * 100:.2f}%" if sc_irr is not None else None,
            })

    # ── Торнадо-анализ: каждый параметр ±20%, измерение дельты NPV ──
    tornado_items = []

    # Чувствительность к денежным потокам
    for mult_label, mult in [("-20%", 0.8), ("+20%", 1.2)]:
        adj_flows = [cf * mult for cf in base_cash_flows]
        t_npv = _full_npv(adj_flows, base_discount_rate, initial_investment, terminal_growth)
        tornado_items.append({
            "variable": "cash_flows",
            "variation": mult_label,
            "multiplier": mult,
            "npv": round(t_npv, 2),
            "npv_delta": round(t_npv - base_npv, 2),
        })

    # Чувствительность к ставке дисконтирования
    for delta_label, delta in [("-20%", -0.2), ("+20%", 0.2)]:
        adj_rate = base_discount_rate * (1 + delta)
        if adj_rate <= -1.0:
            adj_rate = 0.01
        t_npv = _full_npv(base_cash_flows, adj_rate, initial_investment, terminal_growth)
        tornado_items.append({
            "variable": "discount_rate",
            "variation": delta_label,
            "value": round(adj_rate, 4),
            "npv": round(t_npv, 2),
            "npv_delta": round(t_npv - base_npv, 2),
        })

    # Чувствительность к терминальному росту
    for delta_label, delta in [("-20%", -0.2), ("+20%", 0.2)]:
        adj_tg = terminal_growth * (1 + delta)
        t_npv = _full_npv(base_cash_flows, base_discount_rate, initial_investment, adj_tg)
        tornado_items.append({
            "variable": "terminal_growth",
            "variation": delta_label,
            "value": round(adj_tg, 4),
            "npv": round(t_npv, 2),
            "npv_delta": round(t_npv - base_npv, 2),
        })

    # Чувствительность к начальной инвестиции
    if initial_investment:
        for delta_label, delta in [("-20%", 0.8), ("+20%", 1.2)]:
            adj_inv = initial_investment * delta
            t_npv = _full_npv(base_cash_flows, base_discount_rate, adj_inv, terminal_growth)
            tornado_items.append({
                "variable": "initial_investment",
                "variation": delta_label,
                "value": round(adj_inv, 2),
                "npv": round(t_npv, 2),
                "npv_delta": round(t_npv - base_npv, 2),
            })

    # Сортировка торнадо по абсолютной дельте (наибольшее влияние первым)
    tornado_data = []
    var_names = list({item["variable"] for item in tornado_items})
    for var_name in var_names:
        items = [i for i in tornado_items if i["variable"] == var_name]
        low = min(items, key=lambda x: x["npv"])
        high = max(items, key=lambda x: x["npv"])
        spread = high["npv"] - low["npv"]
        tornado_data.append({
            "variable": var_name,
            "low_npv": low["npv"],
            "high_npv": high["npv"],
            "spread": round(spread, 2),
            "base_npv": round(base_npv, 2),
        })
    tornado_data.sort(key=lambda x: x["spread"], reverse=True)

    # ── Spider plot данные: вариация каждого параметра от -30% до +30% ──
    spider_steps = [-0.30, -0.20, -0.10, 0.0, 0.10, 0.20, 0.30]
    spider_data = {}

    # Spider: денежные потоки
    spider_data["cash_flows"] = []
    for step in spider_steps:
        adj_flows = [cf * (1 + step) for cf in base_cash_flows]
        s_npv = _full_npv(adj_flows, base_discount_rate, initial_investment, terminal_growth)
        spider_data["cash_flows"].append({
            "variation_pct": round(step * 100, 0),
            "npv": round(s_npv, 2),
        })

    # Spider: ставка дисконтирования
    spider_data["discount_rate"] = []
    for step in spider_steps:
        adj_rate = base_discount_rate * (1 + step)
        if adj_rate <= -1.0:
            continue
        s_npv = _full_npv(base_cash_flows, adj_rate, initial_investment, terminal_growth)
        spider_data["discount_rate"].append({
            "variation_pct": round(step * 100, 0),
            "npv": round(s_npv, 2),
        })

    # Spider: терминальный рост
    spider_data["terminal_growth"] = []
    for step in spider_steps:
        adj_tg = terminal_growth * (1 + step)
        s_npv = _full_npv(base_cash_flows, base_discount_rate, initial_investment, adj_tg)
        spider_data["terminal_growth"].append({
            "variation_pct": round(step * 100, 0),
            "npv": round(s_npv, 2),
        })

    # ── Анализ безубыточности: ставка при NPV=0 (= IRR) ──
    full_flows = [-abs(initial_investment)] + list(base_cash_flows) if initial_investment else list(base_cash_flows)
    breakeven_rate = _irr_bisection(full_flows)

    result = {
        "base_npv": round(base_npv, 2),
        "scenarios": scenario_results,
        "tornado": tornado_data,
        "tornado_items": tornado_items,
        "spider_data": spider_data,
        "breakeven_discount_rate": round(breakeven_rate, 6) if breakeven_rate is not None else None,
        "breakeven_pct": f"{breakeven_rate * 100:.2f}%" if breakeven_rate is not None else None,
    }

    logger.info("What-If завершён: %d сценариев, базовый NPV=%.2f", len(scenario_results), base_npv)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 3. МОНТЕ-КАРЛО СИМУЛЯЦИЯ (калибровка под Узбекистан)
# ═══════════════════════════════════════════════════════════════════════════════


async def monte_carlo_simulation(
    base_cash_flows: List[float],
    base_discount_rate: float,
    initial_investment: float = 0,
    terminal_growth: float = 0.03,
    num_simulations: int = 5000,
    volatility: float = 0.25,
    discount_volatility: float = 0.05,
    uz_calibration: bool = True,
    autocorrelation: float = 0.0,
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Монте-Карло симуляция инвестиционного проекта.

    Использует чистый Python (random.gauss) — без numpy/scipy.
    При uz_calibration=True корректирует волатильность с учётом инфляции
    и ставки рефинансирования ЦБ Узбекистана.

    Аргументы:
        base_cash_flows: Базовые прогнозные денежные потоки
        base_discount_rate: Базовая ставка дисконтирования
        initial_investment: Начальная инвестиция
        terminal_growth: Терминальный рост
        num_simulations: Количество симуляций (макс. 50000)
        volatility: Волатильность денежных потоков (σ)
        discount_volatility: Волатильность ставки дисконтирования
        uz_calibration: Калибровка под параметры Узбекистана
        autocorrelation: Автокорреляция между потоками (0.0 — нет)
        seed: Зерно генератора случайных чисел (для воспроизводимости)

    Возвращает:
        Статистику NPV: среднее, медиана, std, мин, макс, перцентили,
        VaR, вероятность прибыли, гистограмму (20 бинов).
    """
    num_simulations = min(num_simulations, 50000)
    logger.info(
        "Монте-Карло: %d симуляций, волатильность=%.2f, UZ-калибровка=%s",
        num_simulations, volatility, uz_calibration,
    )

    if seed is not None:
        random.seed(seed)

    # ── Калибровка под Узбекистан ──
    cf_volatility = volatility
    disc_volatility = discount_volatility
    if uz_calibration:
        # Увеличиваем волатильность с учётом инфляции и страновых рисков
        inflation_adj = 1.0 + UZ_INFLATION_RATE * 0.5  # Инфляция добавляет неопределённости
        cf_volatility = volatility * inflation_adj
        # Ставка дисконтирования варьируется вокруг ставки рефинансирования
        disc_volatility = discount_volatility * (1.0 + UZ_RISK_PREMIUM)
        logger.info(
            "UZ-калибровка: vol=%.3f→%.3f, disc_vol=%.3f→%.3f",
            volatility, cf_volatility, discount_volatility, disc_volatility,
        )

    n_years = len(base_cash_flows)
    npv_results: List[float] = []

    for _ in range(num_simulations):
        # Генерация случайных денежных потоков
        sim_flows: List[float] = []
        prev_shock = 0.0
        for t in range(n_years):
            # Случайный шок с опциональной автокорреляцией
            independent_shock = random.gauss(0, cf_volatility)
            shock = autocorrelation * prev_shock + (1 - abs(autocorrelation)) * independent_shock
            prev_shock = shock

            sim_cf = base_cash_flows[t] * (1.0 + shock)
            sim_flows.append(sim_cf)

        # Случайная ставка дисконтирования (не может быть ≤ 0)
        sim_discount = base_discount_rate + random.gauss(0, disc_volatility)
        sim_discount = max(sim_discount, 0.01)

        # Расчёт NPV для данной симуляции
        full = [-abs(initial_investment)] + sim_flows if initial_investment else sim_flows
        sim_npv = _npv(sim_discount, full)

        # Терминальная стоимость
        if sim_flows and sim_discount > terminal_growth:
            tv = (sim_flows[-1] * (1 + terminal_growth)) / (sim_discount - terminal_growth)
            tv_pv = tv / ((1.0 + sim_discount) ** n_years)
            sim_npv += tv_pv

        npv_results.append(sim_npv)

    # ── Статистика ──
    npv_results.sort()
    n = len(npv_results)

    mean_npv = sum(npv_results) / n
    median_npv = npv_results[n // 2] if n % 2 == 1 else (npv_results[n // 2 - 1] + npv_results[n // 2]) / 2

    variance = sum((x - mean_npv) ** 2 for x in npv_results) / n
    std_npv = math.sqrt(variance)

    min_npv = npv_results[0]
    max_npv = npv_results[-1]

    # ── Перцентили ──
    def _percentile(data: List[float], pct: float) -> float:
        idx = pct / 100.0 * (len(data) - 1)
        lower = int(math.floor(idx))
        upper = min(lower + 1, len(data) - 1)
        frac = idx - lower
        return data[lower] * (1 - frac) + data[upper] * frac

    percentiles = {}
    for p in [5, 10, 25, 50, 75, 90, 95]:
        percentiles[f"P{p}"] = round(_percentile(npv_results, p), 2)

    # ── VaR (Value at Risk) ──
    var_95 = _percentile(npv_results, 5)   # 5-й перцентиль = VaR 95%
    var_99 = _percentile(npv_results, 1)   # 1-й перцентиль = VaR 99%

    # ── Вероятность положительного NPV ──
    positive_count = sum(1 for x in npv_results if x > 0)
    probability_profit = round(positive_count / n, 4)

    # ── Гистограмма: 20 бинов ──
    num_bins = 20
    bin_width = (max_npv - min_npv) / num_bins if max_npv != min_npv else 1.0
    histogram = []
    for i in range(num_bins):
        bin_start = min_npv + i * bin_width
        bin_end = bin_start + bin_width
        count = sum(1 for x in npv_results if bin_start <= x < bin_end)
        # Последний бин включает правую границу
        if i == num_bins - 1:
            count = sum(1 for x in npv_results if x >= bin_start)
        histogram.append({
            "bin_start": round(bin_start, 2),
            "bin_end": round(bin_end, 2),
            "count": count,
            "frequency": round(count / n, 4),
        })

    result = {
        "num_simulations": n,
        "statistics": {
            "mean": round(mean_npv, 2),
            "median": round(median_npv, 2),
            "std": round(std_npv, 2),
            "min": round(min_npv, 2),
            "max": round(max_npv, 2),
            "skewness": _calc_skewness(npv_results, mean_npv, std_npv),
        },
        "percentiles": percentiles,
        "var": {
            "var_95": round(var_95, 2),
            "var_99": round(var_99, 2),
            "var_95_description": "Максимальный убыток с 95% вероятностью",
            "var_99_description": "Максимальный убыток с 99% вероятностью",
        },
        "probability_profit": probability_profit,
        "probability_profit_pct": f"{probability_profit * 100:.1f}%",
        "histogram": histogram,
        "calibration": {
            "uz_calibration": uz_calibration,
            "cf_volatility_used": round(cf_volatility, 4),
            "discount_volatility_used": round(disc_volatility, 4),
            "autocorrelation": autocorrelation,
        },
    }

    logger.info(
        "Монте-Карло завершён: среднее NPV=%.2f, вероятность прибыли=%s",
        mean_npv, result["probability_profit_pct"],
    )
    return result


def _calc_skewness(data: List[float], mean: float, std: float) -> Optional[float]:
    """Расчёт коэффициента асимметрии распределения."""
    if std == 0 or len(data) < 3:
        return None
    n = len(data)
    skew = sum(((x - mean) / std) ** 3 for x in data) * n / ((n - 1) * (n - 2))
    return round(skew, 4)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. БИБЛИОТЕКА БИЗНЕС-КЕЙСОВ (50+ шаблонов для Узбекистана)
# ═══════════════════════════════════════════════════════════════════════════════

# Суммы в миллионах UZS.
# Ставки дисконтирования 14-22% — отражают реалии UZ рынка.

_BUSINESS_CASES: List[Dict[str, Any]] = [
    # ─── СЕЛЬСКОЕ ХОЗЯЙСТВО ────────────────────────────────────────────────
    {
        "id": "agro_cotton",
        "name": "Хлопкоперерабатывающий завод",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Переработка хлопка",
        "description": "Завод первичной переработки хлопка-сырца (очистка, прессовка). "
                       "Мощность 5 000 тонн/год. Ферганская долина.",
        "initial_investment": 8_000,
        "cash_flows": [1_200, 1_800, 2_400, 2_600, 2_800, 3_000, 3_200],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Ферганская область",
    },
    {
        "id": "agro_fruits",
        "name": "Фруктовый сад (интенсивный)",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Садоводство",
        "description": "Интенсивный яблоневый сад 20 га с капельным орошением и холодильным складом. "
                       "Сорта: Golden Delicious, Fuji.",
        "initial_investment": 3_500,
        "cash_flows": [200, 500, 1_200, 1_800, 2_200, 2_500, 2_600, 2_700],
        "discount_rate": 0.16,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Самаркандская область",
    },
    {
        "id": "agro_greenhouse",
        "name": "Тепличный комплекс (овощи)",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Тепличное хозяйство",
        "description": "Теплица 1 га с автоматикой для выращивания томатов и огурцов. "
                       "Круглогодичное производство, экспортный потенциал.",
        "initial_investment": 5_000,
        "cash_flows": [800, 1_500, 2_000, 2_200, 2_400, 2_500, 2_600],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкентская область",
    },
    {
        "id": "agro_livestock",
        "name": "Молочная ферма (200 голов)",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Животноводство",
        "description": "Молочная ферма на 200 голов КРС с доильным залом и танком-охладителем. "
                       "Производительность 1 200 тонн молока/год.",
        "initial_investment": 6_500,
        "cash_flows": [800, 1_400, 1_800, 2_000, 2_200, 2_400, 2_500],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Кашкадарьинская область",
    },
    {
        "id": "agro_poultry",
        "name": "Птицефабрика (бройлеры)",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Птицеводство",
        "description": "Птицефабрика мощностью 500 000 бройлеров/цикл. "
                       "6 циклов в год, автоматическая система кормления и микроклимата.",
        "initial_investment": 12_000,
        "cash_flows": [2_500, 3_200, 3_800, 4_200, 4_500, 4_800, 5_000],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкентская область",
    },
    {
        "id": "agro_grain",
        "name": "Зерноперерабатывающий комплекс",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Зернопереработка",
        "description": "Элеватор + мельничный комплекс мощностью 50 тонн/сутки. "
                       "Хранение 10 000 тонн зерна.",
        "initial_investment": 10_000,
        "cash_flows": [1_500, 2_200, 2_800, 3_200, 3_500, 3_800, 4_000],
        "discount_rate": 0.17,
        "risk_level": "low",
        "typical_payback": "4-5 лет",
        "region": "Сырдарьинская область",
    },
    {
        "id": "agro_beekeeping",
        "name": "Пасека промышленная (500 ульев)",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Пчеловодство",
        "description": "Промышленная пасека на 500 ульев с цехом фасовки мёда. "
                       "Дополнительный доход от пыльцы, воска, маточного молочка.",
        "initial_investment": 800,
        "cash_flows": [180, 280, 350, 400, 420, 450],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Сурхандарьинская область",
    },
    {
        "id": "agro_fish",
        "name": "Рыбоводное хозяйство (садковое)",
        "category": "agriculture",
        "category_name": "Сельское хозяйство",
        "industry": "Рыбоводство",
        "description": "Садковое рыбоводство на водохранилище: форель, карп. "
                       "Мощность 100 тонн/год с цехом переработки.",
        "initial_investment": 2_500,
        "cash_flows": [400, 700, 1_000, 1_200, 1_400, 1_500],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Бухарская область",
    },

    # ─── ПИЩЕВАЯ ПРОМЫШЛЕННОСТЬ ─────────────────────────────────────────────
    {
        "id": "food_flour_mill",
        "name": "Мукомольный завод",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Мукомольное производство",
        "description": "Мукомольный завод мощностью 100 тонн/сутки. "
                       "Производство муки высшего, первого сорта и отрубей.",
        "initial_investment": 7_000,
        "cash_flows": [1_200, 1_800, 2_200, 2_500, 2_700, 2_900, 3_000],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "4-5 лет",
        "region": "Ташкентская область",
    },
    {
        "id": "food_bakery",
        "name": "Пекарня (хлебозавод мини)",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Хлебопекарное производство",
        "description": "Мини-хлебозавод мощностью 5 тонн хлебобулочных изделий/сутки. "
                       "Традиционные лепёшки + европейский ассортимент.",
        "initial_investment": 1_500,
        "cash_flows": [350, 500, 650, 720, 780, 820],
        "discount_rate": 0.15,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "food_dairy",
        "name": "Молочный цех",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Молочная продукция",
        "description": "Цех переработки молока: пастеризация, кисломолочные продукты, творог. "
                       "Мощность 10 тонн/сутки.",
        "initial_investment": 4_000,
        "cash_flows": [600, 1_000, 1_400, 1_700, 1_900, 2_000, 2_100],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Самаркандская область",
    },
    {
        "id": "food_juice",
        "name": "Завод соков и нектаров",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Производство соков",
        "description": "Линия розлива соков и нектаров (яблоко, персик, гранат). "
                       "Мощность 2 000 литров/час. Тетрапак-упаковка.",
        "initial_investment": 6_000,
        "cash_flows": [800, 1_400, 2_000, 2_400, 2_700, 2_900, 3_000],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Наманганская область",
    },
    {
        "id": "food_canning",
        "name": "Консервный завод",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Консервирование",
        "description": "Завод консервирования овощей и фруктов. Томатная паста, маринады, компоты. "
                       "Мощность 5 000 банок/сутки.",
        "initial_investment": 5_500,
        "cash_flows": [700, 1_200, 1_700, 2_000, 2_300, 2_500, 2_600],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Андижанская область",
    },
    {
        "id": "food_meat",
        "name": "Мясоперерабатывающий цех",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Мясопереработка",
        "description": "Цех переработки мяса: колбасные изделия, полуфабрикаты, копчёности. "
                       "Мощность 3 тонны/сутки. Халяль-сертификация.",
        "initial_investment": 4_500,
        "cash_flows": [700, 1_100, 1_500, 1_800, 2_000, 2_200, 2_300],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Ташкент",
    },
    {
        "id": "food_confectionery",
        "name": "Кондитерский цех",
        "category": "food_processing",
        "category_name": "Пищевая промышленность",
        "industry": "Кондитерское производство",
        "description": "Цех производства восточных и европейских сладостей. "
                       "Навот, халва, печенье. Мощность 1 тонна/сутки.",
        "initial_investment": 2_000,
        "cash_flows": [350, 550, 750, 900, 1_000, 1_050, 1_100],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Самарканд",
    },

    # ─── ТОРГОВЛЯ ───────────────────────────────────────────────────────────
    {
        "id": "trade_wholesale",
        "name": "Оптовая база (продукты питания)",
        "category": "trade",
        "category_name": "Торговля",
        "industry": "Оптовая торговля",
        "description": "Оптово-распределительный центр продуктов питания. "
                       "Склад 2 000 м², холодильная камера 500 м².",
        "initial_investment": 5_000,
        "cash_flows": [900, 1_400, 1_800, 2_100, 2_300, 2_500, 2_600],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "trade_retail_chain",
        "name": "Сеть продуктовых магазинов (5 точек)",
        "category": "trade",
        "category_name": "Торговля",
        "industry": "Розничная торговля",
        "description": "Сеть из 5 мини-маркетов формата «у дома» площадью 100-150 м² каждый. "
                       "Единая закупка, брендирование.",
        "initial_investment": 3_000,
        "cash_flows": [500, 900, 1_200, 1_400, 1_500, 1_600],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "trade_market_stall",
        "name": "Торговое место на дехканском базаре",
        "category": "trade",
        "category_name": "Торговля",
        "industry": "Розничная торговля",
        "description": "Аренда и оборудование торгового места на крупном базаре. "
                       "Фрукты, овощи, сухофрукты. Низкий порог входа.",
        "initial_investment": 150,
        "cash_flows": [60, 80, 95, 100, 105, 110],
        "discount_rate": 0.15,
        "risk_level": "low",
        "typical_payback": "2-3 года",
        "region": "Ташкент",
    },
    {
        "id": "trade_ecommerce",
        "name": "Интернет-магазин (маркетплейс)",
        "category": "trade",
        "category_name": "Торговля",
        "industry": "Электронная коммерция",
        "description": "Онлайн-маркетплейс бытовой техники и электроники. "
                       "Мобильное приложение + веб-сайт + доставка.",
        "initial_investment": 2_000,
        "cash_flows": [200, 600, 1_200, 1_800, 2_400, 3_000, 3_500],
        "discount_rate": 0.20,
        "risk_level": "high",
        "typical_payback": "3-4 года",
        "region": "Ташкент (онлайн)",
    },
    {
        "id": "trade_pharmacy",
        "name": "Сеть аптек (3 точки)",
        "category": "trade",
        "category_name": "Торговля",
        "industry": "Аптечный бизнес",
        "description": "3 аптеки в жилых районах с лицензией. "
                       "Лекарства, БАД, медтехника, космецевтика.",
        "initial_investment": 2_500,
        "cash_flows": [450, 700, 900, 1_050, 1_150, 1_200],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "trade_auto_parts",
        "name": "Магазин автозапчастей",
        "category": "trade",
        "category_name": "Торговля",
        "industry": "Автозапчасти",
        "description": "Магазин запчастей для Chevrolet (Cobalt, Spark, Malibu) — "
                       "самые популярные авто Узбекистана. Склад + торговый зал 200 м².",
        "initial_investment": 1_800,
        "cash_flows": [350, 550, 700, 800, 850, 900],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },

    # ─── СТРОИТЕЛЬСТВО И НЕДВИЖИМОСТЬ ───────────────────────────────────────
    {
        "id": "realty_apartment",
        "name": "Многоэтажный жилой дом (60 квартир)",
        "category": "construction",
        "category_name": "Строительство и недвижимость",
        "industry": "Жилищное строительство",
        "description": "9-этажный жилой дом на 60 квартир в пригороде Ташкента. "
                       "Продажа квартир в рассрочку и по ипотеке.",
        "initial_investment": 35_000,
        "cash_flows": [5_000, 12_000, 18_000, 15_000, 8_000],
        "discount_rate": 0.20,
        "risk_level": "high",
        "typical_payback": "3-4 года",
        "region": "Ташкентская область",
    },
    {
        "id": "realty_warehouse",
        "name": "Промышленный склад (логистика)",
        "category": "construction",
        "category_name": "Строительство и недвижимость",
        "industry": "Складская недвижимость",
        "description": "Складской комплекс 5 000 м² класса B+. Аренда логистическим компаниям. "
                       "Рампа, офисный блок, охрана.",
        "initial_investment": 15_000,
        "cash_flows": [2_000, 3_000, 3_500, 3_800, 4_000, 4_200, 4_400, 4_500],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "5-6 лет",
        "region": "Ташкент, трасса M39",
    },
    {
        "id": "realty_office_renovation",
        "name": "Офисный центр (реновация)",
        "category": "construction",
        "category_name": "Строительство и недвижимость",
        "industry": "Коммерческая недвижимость",
        "description": "Реновация здания под бизнес-центр класса B, 2 000 м². "
                       "Аренда офисов, коворкинг-зона.",
        "initial_investment": 8_000,
        "cash_flows": [1_000, 1_800, 2_200, 2_500, 2_700, 2_900, 3_000],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Ташкент, Мирабадский район",
    },
    {
        "id": "realty_hotel",
        "name": "Гостиница 3* (50 номеров)",
        "category": "construction",
        "category_name": "Строительство и недвижимость",
        "industry": "Гостиничный бизнес",
        "description": "Гостиница категории 3 звезды на 50 номеров в историческом центре. "
                       "Ресторан, конференц-зал, парковка.",
        "initial_investment": 20_000,
        "cash_flows": [2_000, 3_500, 4_500, 5_200, 5_800, 6_200, 6_500, 6_800],
        "discount_rate": 0.19,
        "risk_level": "high",
        "typical_payback": "5-6 лет",
        "region": "Самарканд",
    },
    {
        "id": "realty_mini_hotel",
        "name": "Мини-гостиница / гостевой дом (15 номеров)",
        "category": "construction",
        "category_name": "Строительство и недвижимость",
        "industry": "Гостиничный бизнес",
        "description": "Гостевой дом в старом городе: 15 номеров в национальном стиле. "
                       "Бронирование через Booking.com. Завтрак включён.",
        "initial_investment": 3_000,
        "cash_flows": [400, 700, 1_000, 1_200, 1_350, 1_450, 1_500],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Бухара",
    },

    # ─── ПРОМЫШЛЕННОСТЬ ─────────────────────────────────────────────────────
    {
        "id": "mfg_textile",
        "name": "Текстильная фабрика (трикотаж)",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Текстильное производство",
        "description": "Фабрика по производству трикотажных изделий на экспорт. "
                       "Пряжа → вязание → пошив. 500 рабочих мест.",
        "initial_investment": 18_000,
        "cash_flows": [2_500, 4_000, 5_500, 6_500, 7_200, 7_800, 8_000, 8_200],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Наманганская область (СЭЗ)",
    },
    {
        "id": "mfg_furniture",
        "name": "Мебельная фабрика",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Мебельное производство",
        "description": "Производство мебели из МДФ и натурального дерева. "
                       "Кухни, шкафы-купе, офисная мебель. Цех 1 500 м².",
        "initial_investment": 3_500,
        "cash_flows": [500, 900, 1_300, 1_600, 1_800, 1_900, 2_000],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "mfg_building_materials",
        "name": "Завод стройматериалов (кирпич)",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Стройматериалы",
        "description": "Кирпичный завод мощностью 20 млн штук/год. "
                       "Керамический кирпич М150-М200. Тоннельная печь.",
        "initial_investment": 12_000,
        "cash_flows": [1_800, 2_800, 3_500, 4_000, 4_300, 4_500, 4_700],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Навоийская область",
    },
    {
        "id": "mfg_plastic",
        "name": "Завод пластиковых изделий",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Производство пластмасс",
        "description": "Завод литья пластмасс под давлением. "
                       "ПЭТ-преформы, ПП-контейнеры, вёдра, тазы. 8 термопласт-автоматов.",
        "initial_investment": 5_000,
        "cash_flows": [800, 1_300, 1_800, 2_100, 2_300, 2_500, 2_600],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкентская область",
    },
    {
        "id": "mfg_packaging",
        "name": "Упаковочное производство",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Упаковка",
        "description": "Производство гофрокартона и картонной упаковки. "
                       "Мощность 3 000 тонн/год. Заказчики — пищевая промышленность.",
        "initial_investment": 6_000,
        "cash_flows": [900, 1_500, 2_000, 2_400, 2_700, 2_900, 3_000],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "mfg_ceramics",
        "name": "Керамическая плитка (производство)",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Керамика",
        "description": "Линия по производству керамической плитки для стен и пола. "
                       "Мощность 1 млн м²/год. Импортозамещение.",
        "initial_investment": 15_000,
        "cash_flows": [2_000, 3_500, 4_500, 5_200, 5_800, 6_200, 6_500],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Навоийская область",
    },

    # ─── IT И УСЛУГИ ────────────────────────────────────────────────────────
    {
        "id": "it_software",
        "name": "Компания по разработке ПО",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Разработка ПО",
        "description": "Аутсорсинговая компания: мобильные и веб-приложения. "
                       "Команда 20 разработчиков. IT Park резидент (0% налог).",
        "initial_investment": 1_000,
        "cash_flows": [300, 600, 1_000, 1_500, 2_000, 2_500, 3_000],
        "discount_rate": 0.20,
        "risk_level": "medium",
        "typical_payback": "2-3 года",
        "region": "Ташкент (IT Park)",
    },
    {
        "id": "it_outsourcing",
        "name": "IT-аутсорсинг (BPO-центр)",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "IT-аутсорсинг",
        "description": "Центр аутсорсинга бизнес-процессов: техподдержка, data entry, QA-тестирование. "
                       "100 рабочих мест, клиенты из РФ/ЕС.",
        "initial_investment": 2_000,
        "cash_flows": [400, 800, 1_200, 1_600, 1_900, 2_100, 2_300],
        "discount_rate": 0.19,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент (IT Park)",
    },
    {
        "id": "it_mobile_app",
        "name": "Мобильное приложение (fintech)",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Финтех",
        "description": "Мобильное приложение для микрокредитования и P2P-платежей. "
                       "Лицензия ЦБ, интеграция с Humo/UzCard.",
        "initial_investment": 3_000,
        "cash_flows": [200, 800, 1_800, 3_000, 4_500, 5_500, 6_500],
        "discount_rate": 0.22,
        "risk_level": "high",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "it_data_center",
        "name": "Дата-центр (колокация)",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Дата-центры",
        "description": "Мини дата-центр на 50 стоек. Tier II, UPS, дизель-генератор. "
                       "Услуги: колокация, облачный хостинг, VPS.",
        "initial_investment": 8_000,
        "cash_flows": [800, 1_500, 2_200, 2_800, 3_200, 3_500, 3_700],
        "discount_rate": 0.19,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Ташкент",
    },
    {
        "id": "it_training",
        "name": "Учебный IT-центр",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Образование",
        "description": "Учебный центр программирования и IT-навыков. "
                       "10 аудиторий, 200 студентов/поток. Python, Java, тестирование.",
        "initial_investment": 1_200,
        "cash_flows": [250, 500, 750, 900, 1_000, 1_100],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "svc_beauty_salon",
        "name": "Салон красоты премиум",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Бьюти-индустрия",
        "description": "Салон красоты премиум-сегмента: парикмахерские услуги, маникюр, "
                       "косметология, массаж. 8 мастеров.",
        "initial_investment": 800,
        "cash_flows": [200, 350, 450, 500, 530, 560],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "2-3 года",
        "region": "Ташкент",
    },
    {
        "id": "svc_dental",
        "name": "Стоматологическая клиника",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Стоматология",
        "description": "Клиника на 5 кресел: терапия, хирургия, ортодонтия, имплантация. "
                       "Рентген-аппарат, 3D-сканер.",
        "initial_investment": 3_000,
        "cash_flows": [500, 900, 1_300, 1_600, 1_800, 1_900, 2_000],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "svc_fitness",
        "name": "Фитнес-клуб",
        "category": "it_services",
        "category_name": "IT и услуги",
        "industry": "Фитнес",
        "description": "Фитнес-клуб 800 м²: тренажёрный зал, групповые программы, "
                       "сайкл, бассейн (мини). Абонементная модель.",
        "initial_investment": 4_000,
        "cash_flows": [600, 1_000, 1_400, 1_700, 1_900, 2_000, 2_100],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },

    # ─── ТРАНСПОРТ И ЛОГИСТИКА ──────────────────────────────────────────────
    {
        "id": "transport_freight",
        "name": "Грузоперевозки (автопарк)",
        "category": "transport",
        "category_name": "Транспорт и логистика",
        "industry": "Грузоперевозки",
        "description": "Автопарк 10 грузовиков (Isuzu NPR, 5 тонн). "
                       "Доставка по Узбекистану и в Казахстан/Кыргызстан.",
        "initial_investment": 6_000,
        "cash_flows": [1_000, 1_600, 2_000, 2_300, 2_500, 2_600, 2_700],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "transport_taxi",
        "name": "Таксопарк (50 машин)",
        "category": "transport",
        "category_name": "Транспорт и логистика",
        "industry": "Такси",
        "description": "Таксопарк из 50 автомобилей Chevrolet Cobalt. "
                       "Работа через Yandex Go / MyTaxi. Аренда водителям.",
        "initial_investment": 5_000,
        "cash_flows": [1_200, 1_600, 1_800, 1_900, 1_800, 1_500],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "transport_courier",
        "name": "Курьерская служба",
        "category": "transport",
        "category_name": "Транспорт и логистика",
        "industry": "Курьерские услуги",
        "description": "Курьерская доставка по Ташкенту: e-commerce, документы, еда. "
                       "50 курьеров на скутерах + диспетчерская.",
        "initial_investment": 1_500,
        "cash_flows": [300, 600, 900, 1_100, 1_300, 1_400, 1_500],
        "discount_rate": 0.19,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "transport_warehouse_logistics",
        "name": "3PL-логистика (фулфилмент)",
        "category": "transport",
        "category_name": "Транспорт и логистика",
        "industry": "Логистика",
        "description": "Склад 3 000 м² с услугами фулфилмента для интернет-магазинов. "
                       "Приём, хранение, комплектация, отгрузка.",
        "initial_investment": 4_000,
        "cash_flows": [500, 1_000, 1_500, 1_900, 2_200, 2_400, 2_500],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },

    # ─── ТУРИЗМ И ОБЩЕПИТ ──────────────────────────────────────────────────
    {
        "id": "tourism_restaurant",
        "name": "Ресторан (узбекская кухня, премиум)",
        "category": "tourism",
        "category_name": "Туризм и общепит",
        "industry": "Общественное питание",
        "description": "Ресторан узбекской кухни на 120 посадочных мест. "
                       "Премиум-сегмент, обслуживание банкетов и туристов.",
        "initial_investment": 4_000,
        "cash_flows": [600, 1_000, 1_400, 1_700, 1_900, 2_000, 2_100],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "tourism_cafe",
        "name": "Кофейня-кондитерская",
        "category": "tourism",
        "category_name": "Туризм и общепит",
        "industry": "Общественное питание",
        "description": "Кофейня с собственной выпечкой: specialty coffee, десерты, лёгкие завтраки. "
                       "80 м², 30 посадочных мест.",
        "initial_investment": 600,
        "cash_flows": [120, 220, 300, 350, 380, 400],
        "discount_rate": 0.16,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "tourism_travel_agency",
        "name": "Туристическое агентство (инкаминг)",
        "category": "tourism",
        "category_name": "Туризм и общепит",
        "industry": "Туризм",
        "description": "Инкаминг-агентство: приём иностранных туристов на Великом Шёлковом пути. "
                       "Туры: Ташкент-Самарканд-Бухара-Хива. 2 000 туристов/год.",
        "initial_investment": 800,
        "cash_flows": [200, 400, 600, 800, 950, 1_050, 1_100],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент / Самарканд",
    },
    {
        "id": "tourism_ecotourism",
        "name": "Эко-туризм (горный лагерь)",
        "category": "tourism",
        "category_name": "Туризм и общепит",
        "industry": "Экотуризм",
        "description": "Горный эко-лагерь на 30 гостей: глэмпинг, треккинг, рафтинг. "
                       "Чимганский регион, сезон май-октябрь.",
        "initial_investment": 1_500,
        "cash_flows": [200, 400, 600, 750, 850, 900],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Чимган, Бостанлыкский район",
    },
    {
        "id": "tourism_catering",
        "name": "Кейтеринговая компания",
        "category": "tourism",
        "category_name": "Туризм и общепит",
        "industry": "Кейтеринг",
        "description": "Кейтеринг для корпоративных мероприятий и свадеб (тўй). "
                       "Промышленная кухня 300 м², обслуживание до 500 гостей.",
        "initial_investment": 2_000,
        "cash_flows": [400, 700, 1_000, 1_200, 1_350, 1_450, 1_500],
        "discount_rate": 0.17,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "tourism_street_food",
        "name": "Стрит-фуд корнер (фуд-трак)",
        "category": "tourism",
        "category_name": "Туризм и общепит",
        "industry": "Стрит-фуд",
        "description": "Два фуд-трака с самсой, шаурмой, лимонадами. "
                       "Локации: бизнес-центры и парки Ташкента.",
        "initial_investment": 300,
        "cash_flows": [80, 150, 200, 230, 250, 260],
        "discount_rate": 0.16,
        "risk_level": "low",
        "typical_payback": "2-3 года",
        "region": "Ташкент",
    },
    {
        "id": "transport_car_rental",
        "name": "Прокат автомобилей (туристы)",
        "category": "transport",
        "category_name": "Транспорт и логистика",
        "industry": "Аренда авто",
        "description": "Прокат 20 автомобилей для туристов и деловых поездок. "
                       "Chevrolet Malibu, Tracker. Офис у аэропорта.",
        "initial_investment": 3_500,
        "cash_flows": [500, 900, 1_200, 1_400, 1_500, 1_300],
        "discount_rate": 0.18,
        "risk_level": "medium",
        "typical_payback": "3-4 года",
        "region": "Ташкент",
    },
    {
        "id": "mfg_solar_panels",
        "name": "Сборка солнечных панелей",
        "category": "manufacturing",
        "category_name": "Промышленность",
        "industry": "Возобновляемая энергетика",
        "description": "Сборочная линия солнечных панелей из импортных ячеек. "
                       "Мощность 50 МВт/год. Льготы СЭЗ «Навои».",
        "initial_investment": 10_000,
        "cash_flows": [1_200, 2_200, 3_200, 4_000, 4_500, 5_000, 5_200],
        "discount_rate": 0.19,
        "risk_level": "medium",
        "typical_payback": "4-5 лет",
        "region": "Навои (СЭЗ)",
    },
]


def get_business_cases() -> List[Dict[str, Any]]:
    """
    Получение списка всех инвестиционных бизнес-кейсов.

    Возвращает 50+ шаблонов для рынка Узбекистана с реалистичными
    финансовыми параметрами. Суммы в миллионах UZS.
    """
    return [
        {
            "id": case["id"],
            "name": case["name"],
            "category": case["category"],
            "category_name": case["category_name"],
            "industry": case["industry"],
            "description": case["description"],
            "initial_investment_mln": case["initial_investment"],
            "discount_rate": case["discount_rate"],
            "risk_level": case["risk_level"],
            "typical_payback": case["typical_payback"],
            "region": case["region"],
            "years": len(case["cash_flows"]),
        }
        for case in _BUSINESS_CASES
    ]


def get_business_case_by_id(case_id: str) -> Optional[Dict[str, Any]]:
    """Получение одного бизнес-кейса по ID."""
    for case in _BUSINESS_CASES:
        if case["id"] == case_id:
            return dict(case)
    return None


def get_business_cases_by_category(category: str) -> List[Dict[str, Any]]:
    """Получение бизнес-кейсов по категории."""
    return [dict(c) for c in _BUSINESS_CASES if c["category"] == category]


def get_categories() -> List[Dict[str, Any]]:
    """Получение списка категорий с количеством кейсов."""
    cats: Dict[str, Dict[str, Any]] = {}
    for case in _BUSINESS_CASES:
        cat = case["category"]
        if cat not in cats:
            cats[cat] = {"category": cat, "name": case["category_name"], "count": 0}
        cats[cat]["count"] += 1
    return list(cats.values())
