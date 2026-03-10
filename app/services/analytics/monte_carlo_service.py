"""
Монте-Карло симуляция — калибровка под Узбекистан.
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


