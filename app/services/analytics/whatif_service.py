"""
What-If анализ — сценарии (базовый/оптимистичный/пессимистичный) + торнадо.
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

from .dcf_service import _npv, _irr_bisection


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

    # Spider: терминальный рост (CALC-17: handle zero base value)
    spider_data["terminal_growth"] = []
    for step in spider_steps:
        if terminal_growth == 0:
            # Additive steps when base is 0: use 0.01 as delta unit
            adj_tg = step * 0.01
        else:
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


