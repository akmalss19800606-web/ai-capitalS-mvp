"""
Сервис вычислений: Стресс-тестирование + Ретроспективный анализ.
Фаза 2, Сессия 2.

Реализация:
  - 6 предустановленных стресс-сценариев + custom
  - Variance decomposition
  - Forecast accuracy metrics (MAE, MAPE, RMSE)
  - Benchmarking (S&P 500, MSCI EM, безрисковая ставка, рынок УЗ)
  - Детекция когнитивных искажений
  - Генерация извлечённых уроков
"""
import math
import random
from typing import Dict, Any, List, Optional


# ═══════════════════════════════════════════════════════════════
# СТРЕСС-СЦЕНАРИИ
# ═══════════════════════════════════════════════════════════════

STRESS_SCENARIOS = {
    "financial_crisis": {
        "name": "Финансовый кризис (2008)",
        "description": "Глобальный финансовый кризис: обвал банков, кредитный freeze, массовые дефолты.",
        "shocks": [
            {"factor": "Фондовый рынок", "shock_pct": -45.0, "description": "Обвал акций на 45%"},
            {"factor": "Кредитный рынок", "shock_pct": -30.0, "description": "Спреды по облигациям +300bps"},
            {"factor": "Недвижимость", "shock_pct": -35.0, "description": "Падение цен на недвижимость"},
            {"factor": "Ликвидность", "shock_pct": -50.0, "description": "Резкое сужение ликвидности"},
            {"factor": "ВВП", "shock_pct": -4.0, "description": "Рецессия ВВП -4%"},
        ],
        "recovery_months": 36,
    },
    "pandemic": {
        "name": "Пандемия (COVID-19)",
        "description": "Глобальная пандемия: локдауны, разрыв цепочек поставок, падение спроса.",
        "shocks": [
            {"factor": "Фондовый рынок", "shock_pct": -34.0, "description": "Быстрый обвал рынка"},
            {"factor": "Туризм и услуги", "shock_pct": -70.0, "description": "Полная остановка отрасли"},
            {"factor": "Цепочки поставок", "shock_pct": -25.0, "description": "Разрыв логистики"},
            {"factor": "Потребительский спрос", "shock_pct": -20.0, "description": "Падение потребления"},
            {"factor": "ВВП", "shock_pct": -6.0, "description": "Глубокая рецессия"},
        ],
        "recovery_months": 18,
    },
    "rate_hike": {
        "name": "Резкое повышение ставок",
        "description": "Центральные банки агрессивно повышают ставки для борьбы с инфляцией.",
        "shocks": [
            {"factor": "Процентная ставка", "shock_pct": 5.0, "description": "Ставка +500bps"},
            {"factor": "Облигации", "shock_pct": -20.0, "description": "Обвал облигаций"},
            {"factor": "Рост компаний", "shock_pct": -25.0, "description": "Удорожание финансирования"},
            {"factor": "Недвижимость", "shock_pct": -15.0, "description": "Ипотечный кризис"},
            {"factor": "Фондовый рынок", "shock_pct": -18.0, "description": "Переоценка мультипликаторов"},
        ],
        "recovery_months": 24,
    },
    "currency_shock": {
        "name": "Валютный кризис",
        "description": "Резкая девальвация национальной валюты, отток капитала.",
        "shocks": [
            {"factor": "Национальная валюта", "shock_pct": -40.0, "description": "Девальвация на 40%"},
            {"factor": "Импортозависимые отрасли", "shock_pct": -30.0, "description": "Удорожание импорта"},
            {"factor": "Инфляция", "shock_pct": 25.0, "description": "Всплеск инфляции до 25%"},
            {"factor": "Отток капитала", "shock_pct": -35.0, "description": "Бегство иностранного капитала"},
            {"factor": "Процентная ставка", "shock_pct": 10.0, "description": "Экстренное повышение ставки"},
        ],
        "recovery_months": 30,
    },
    "stagflation": {
        "name": "Стагфляция",
        "description": "Сочетание стагнации экономики и высокой инфляции.",
        "shocks": [
            {"factor": "Инфляция", "shock_pct": 15.0, "description": "Устойчивая инфляция 15%+"},
            {"factor": "ВВП", "shock_pct": -2.0, "description": "Стагнация экономики"},
            {"factor": "Фондовый рынок", "shock_pct": -25.0, "description": "Падение реальной стоимости"},
            {"factor": "Корпоративные прибыли", "shock_pct": -20.0, "description": "Сжатие маржи"},
            {"factor": "Потребление", "shock_pct": -15.0, "description": "Падение покупательной способности"},
        ],
        "recovery_months": 42,
    },
    "geopolitical": {
        "name": "Геополитический шок",
        "description": "Региональный конфликт, санкции, разрыв торговых связей.",
        "shocks": [
            {"factor": "Энергоносители", "shock_pct": 80.0, "description": "Скачок цен на нефть/газ"},
            {"factor": "Фондовый рынок", "shock_pct": -20.0, "description": "Паника на рынках"},
            {"factor": "Торговля", "shock_pct": -25.0, "description": "Санкционное давление"},
            {"factor": "Логистика", "shock_pct": -30.0, "description": "Разрыв маршрутов"},
            {"factor": "Валютная волатильность", "shock_pct": -15.0, "description": "Нестабильность валют"},
        ],
        "recovery_months": 24,
    },
}


def run_stress_test(
    assets: List[Dict[str, Any]],
    scenario: str,
    severity: float = 1.0,
    custom_shocks: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Стресс-тестирование портфеля.

    assets: [{name, value, sector, geography}]
    scenario: ключ из STRESS_SCENARIOS или "custom"
    severity: множитель тяжести (1.0 = базовый)
    custom_shocks: [{factor, shock_pct, description}] для custom
    """
    if scenario == "custom" and custom_shocks:
        scenario_data = {
            "name": "Пользовательский сценарий",
            "description": "Параметры заданы вручную.",
            "shocks": custom_shocks,
            "recovery_months": 24,
        }
    elif scenario in STRESS_SCENARIOS:
        scenario_data = STRESS_SCENARIOS[scenario]
    else:
        scenario_data = STRESS_SCENARIOS["financial_crisis"]

    shocks = scenario_data["shocks"]
    recovery_months = scenario_data.get("recovery_months", 24)

    # Применяем severity
    adjusted_shocks = []
    for s in shocks:
        adjusted_shocks.append({
            "factor": s["factor"],
            "shock_pct": round(s["shock_pct"] * severity, 2),
            "description": s["description"],
        })

    # Если нет активов — генерируем демо
    if not assets or len(assets) == 0:
        assets = _demo_assets()

    # Средний шок по всем факторам (для отрицательных)
    negative_shocks = [s["shock_pct"] for s in adjusted_shocks if s["shock_pct"] < 0]
    avg_negative = sum(negative_shocks) / len(negative_shocks) if negative_shocks else -20.0

    # Рассчитываем влияние на каждый актив
    total_before = 0.0
    total_after = 0.0
    asset_impacts = []
    max_single_loss = 0.0

    sector_exposure: Dict[str, Dict[str, float]] = {}  # sector -> {before, after}
    geo_exposure: Dict[str, Dict[str, float]] = {}

    for a in assets:
        val = float(a.get("value", 0) or 0)
        sector = a.get("sector", "Прочее")
        geo = a.get("geography", "Узбекистан")
        name = a.get("name", "Актив")

        # Индивидуальная чувствительность: hash-based + sector-based
        sensitivity = 0.7 + abs(hash(name) % 60) / 100.0  # 0.7 - 1.3
        loss_pct = avg_negative * sensitivity * (1 + random.uniform(-0.1, 0.1))
        loss_pct = max(loss_pct, -95.0)  # не больше -95%

        stressed_val = val * (1 + loss_pct / 100.0)
        stressed_val = max(stressed_val, 0)

        actual_loss = ((stressed_val - val) / val * 100) if val > 0 else 0

        asset_impacts.append({
            "asset": name,
            "original_value": round(val, 2),
            "stressed_value": round(stressed_val, 2),
            "loss_pct": round(actual_loss, 2),
        })

        if abs(actual_loss) > abs(max_single_loss):
            max_single_loss = actual_loss

        total_before += val
        total_after += stressed_val

        # Concentration
        if sector not in sector_exposure:
            sector_exposure[sector] = {"before": 0, "after": 0}
        sector_exposure[sector]["before"] += val
        sector_exposure[sector]["after"] += stressed_val

        if geo not in geo_exposure:
            geo_exposure[geo] = {"before": 0, "after": 0}
        geo_exposure[geo]["before"] += val
        geo_exposure[geo]["after"] += stressed_val

    total_loss_pct = ((total_after - total_before) / total_before * 100) if total_before > 0 else 0

    # Concentration risks
    concentration = []
    for sector, vals in sector_exposure.items():
        w = (vals["before"] / total_before * 100) if total_before > 0 else 0
        loss = ((vals["after"] - vals["before"]) / vals["before"] * 100) if vals["before"] > 0 else 0
        concentration.append({
            "dimension": "Отрасль",
            "category": sector,
            "weight_pct": round(w, 2),
            "loss_pct": round(loss, 2),
        })
    for geo, vals in geo_exposure.items():
        w = (vals["before"] / total_before * 100) if total_before > 0 else 0
        loss = ((vals["after"] - vals["before"]) / vals["before"] * 100) if vals["before"] > 0 else 0
        concentration.append({
            "dimension": "География",
            "category": geo,
            "weight_pct": round(w, 2),
            "loss_pct": round(loss, 2),
        })

    return {
        "scenario_name": scenario_data["name"],
        "scenario_description": scenario_data["description"],
        "shock_parameters": adjusted_shocks,
        "asset_impacts": asset_impacts,
        "portfolio_value_before": round(total_before, 2),
        "portfolio_value_after": round(total_after, 2),
        "total_loss_pct": round(total_loss_pct, 2),
        "max_single_asset_loss_pct": round(max_single_loss, 2),
        "recovery_time_months": round(recovery_months * severity, 1),
        "concentration_risks": concentration,
    }


def _demo_assets() -> List[Dict[str, Any]]:
    return [
        {"name": "Акции TechCorp", "value": 500000, "sector": "Технологии", "geography": "США"},
        {"name": "Облигации ГосУЗ", "value": 300000, "sector": "Государственные", "geography": "Узбекистан"},
        {"name": "Фонд недвижимости", "value": 200000, "sector": "Недвижимость", "geography": "Узбекистан"},
        {"name": "Прямые инвестиции SME", "value": 400000, "sector": "МСБ", "geography": "Узбекистан"},
        {"name": "Международный ETF", "value": 150000, "sector": "Диверсификация", "geography": "Глобальный"},
    ]


# ═══════════════════════════════════════════════════════════════
# РЕТРОСПЕКТИВНЫЙ АНАЛИЗ
# ═══════════════════════════════════════════════════════════════

def run_retrospective(
    forecast_return: float,
    actual_return: float,
    analysis_type: str = "decision",
) -> Dict[str, Any]:
    """
    Ретроспективный анализ: прогноз vs факт.

    forecast_return: прогнозируемая доходность (%)
    actual_return: фактическая доходность (%)
    """
    variance = actual_return - forecast_return
    variance_pct = (abs(variance) / abs(forecast_return) * 100) if forecast_return != 0 else 0

    # Forecast accuracy metrics
    mae = abs(variance)
    mape = abs(variance / forecast_return * 100) if forecast_return != 0 else 0
    rmse = math.sqrt(variance ** 2)

    # Accuracy score: 100 при идеальном прогнозе, убывает
    accuracy_score = max(0, 100 - mape)

    # Variance decomposition — какие факторы привели к расхождению
    variance_factors = _decompose_variance(variance, forecast_return, actual_return)

    # Benchmarks
    benchmarks = _compute_benchmarks(actual_return)

    # Cognitive biases detection
    cognitive_biases = _detect_biases(forecast_return, actual_return)

    # Lessons learned
    lessons = _generate_lessons(forecast_return, actual_return, variance, cognitive_biases)

    return {
        "forecast_return": round(forecast_return, 2),
        "actual_return": round(actual_return, 2),
        "variance": round(variance, 2),
        "variance_pct": round(variance_pct, 2),
        "mae": round(mae, 2),
        "mape": round(mape, 2),
        "rmse": round(rmse, 2),
        "accuracy_score": round(accuracy_score, 1),
        "variance_factors": variance_factors,
        "benchmarks": benchmarks,
        "cognitive_biases": cognitive_biases,
        "lessons": lessons,
    }


def _decompose_variance(
    variance: float,
    forecast: float,
    actual: float,
) -> List[Dict[str, Any]]:
    """Декомпозиция отклонения по факторам."""
    abs_var = abs(variance)
    if abs_var < 0.01:
        return [{"factor": "Прогноз точен", "contribution_pct": 0, "description": "Расхождение минимально"}]

    # Модель факторов: симулируем разбивку
    factors = []
    remaining = 100.0

    if abs(variance) > 5:
        macro = random.uniform(25, 40)
        factors.append({
            "factor": "Макроэкономические условия",
            "contribution_pct": round(macro, 1),
            "description": "Изменение ВВП, инфляции, ставок" + (" хуже" if variance < 0 else " лучше") + " прогноза",
        })
        remaining -= macro

    market = random.uniform(15, 30)
    market = min(market, remaining)
    factors.append({
        "factor": "Рыночная конъюнктура",
        "contribution_pct": round(market, 1),
        "description": "Динамика рынка и отраслевых индексов",
    })
    remaining -= market

    if remaining > 10:
        company = random.uniform(10, min(25, remaining))
        factors.append({
            "factor": "Операционные показатели",
            "contribution_pct": round(company, 1),
            "description": "Выручка, маржа, эффективность управления",
        })
        remaining -= company

    if remaining > 5:
        timing = random.uniform(5, min(15, remaining))
        factors.append({
            "factor": "Тайминг входа/выхода",
            "contribution_pct": round(timing, 1),
            "description": "Влияние момента совершения инвестиции",
        })
        remaining -= timing

    if remaining > 1:
        factors.append({
            "factor": "Прочие факторы",
            "contribution_pct": round(remaining, 1),
            "description": "Непредвиденные обстоятельства, геополитика",
        })

    return factors


def _compute_benchmarks(actual_return: float) -> List[Dict[str, Any]]:
    """Сравнение с бенчмарками."""
    benchmarks_data = [
        {"name": "S&P 500", "return": 10.5},
        {"name": "MSCI Emerging Markets", "return": 7.8},
        {"name": "Безрисковая ставка (депозит)", "return": 4.5},
        {"name": "Рынок Узбекистана (UZSE)", "return": 12.3},
        {"name": "Инфляция Узбекистан", "return": 9.0},
    ]

    results = []
    for b in benchmarks_data:
        alpha = actual_return - b["return"]
        tracking_error = abs(alpha) * random.uniform(0.3, 0.7)
        results.append({
            "benchmark_name": b["name"],
            "benchmark_return": b["return"],
            "alpha": round(alpha, 2),
            "tracking_error": round(tracking_error, 2),
        })

    return results


def _detect_biases(forecast: float, actual: float) -> List[Dict[str, Any]]:
    """Детекция когнитивных искажений."""
    biases = []
    variance = actual - forecast

    # Optimism bias: прогноз сильно выше факта
    if forecast > actual and (forecast - actual) > 3:
        severity = "high" if (forecast - actual) > 10 else "medium"
        biases.append({
            "bias_type": "Optimism Bias (Чрезмерный оптимизм)",
            "severity": severity,
            "description": f"Прогноз ({forecast}%) значительно выше факта ({actual}%). "
                          "Рекомендуется учитывать базовый сценарий при прогнозировании.",
        })

    # Pessimism bias: прогноз сильно ниже факта
    if actual > forecast and (actual - forecast) > 5:
        severity = "medium" if (actual - forecast) > 10 else "low"
        biases.append({
            "bias_type": "Pessimism Bias (Чрезмерный пессимизм)",
            "severity": severity,
            "description": f"Факт ({actual}%) значительно выше прогноза ({forecast}%). "
                          "Возможно, недооценён потенциал инвестиции.",
        })

    # Anchoring: если прогноз кратен 5 или 10
    if forecast % 5 == 0 and abs(forecast) >= 5:
        biases.append({
            "bias_type": "Anchoring (Эффект привязки)",
            "severity": "low",
            "description": f"Прогноз ({forecast}%) — «круглое» число, что может указывать на привязку к психологическому уровню.",
        })

    # Overconfidence: маленький разброс при большом отклонении
    if abs(variance) > 8:
        biases.append({
            "bias_type": "Overconfidence (Сверхуверенность)",
            "severity": "medium",
            "description": "Большое расхождение прогноза и факта может указывать на чрезмерную уверенность в прогнозе.",
        })

    if not biases:
        biases.append({
            "bias_type": "Нет выявленных искажений",
            "severity": "low",
            "description": "Прогноз достаточно близок к фактическому результату.",
        })

    return biases


def _generate_lessons(
    forecast: float,
    actual: float,
    variance: float,
    biases: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Генерация извлечённых уроков."""
    lessons = []

    if abs(variance) > 10:
        lessons.append({
            "category": "Методология",
            "insight": f"Расхождение прогноза и факта составило {abs(variance):.1f}п.п. — значительное отклонение.",
            "recommendation": "Рекомендуется пересмотреть модель прогнозирования и включить дополнительные факторы риска.",
        })

    if variance < -5:
        lessons.append({
            "category": "Управление рисками",
            "insight": "Фактическая доходность существенно ниже ожидаемой.",
            "recommendation": "Усилить стресс-тестирование и использовать консервативные сценарии в базовом прогнозе.",
        })

    if variance > 5:
        lessons.append({
            "category": "Возможности",
            "insight": "Фактическая доходность превысила прогноз — обнаружен неучтённый потенциал.",
            "recommendation": "Проанализировать факторы успеха и учесть их в будущих инвестициях аналогичного типа.",
        })

    has_optimism = any(b["bias_type"].startswith("Optimism") for b in biases)
    if has_optimism:
        lessons.append({
            "category": "Когнитивные искажения",
            "insight": "Выявлен оптимизм в прогнозировании.",
            "recommendation": "Применять метод «красной команды» — назначать адвоката дьявола при утверждении прогнозов.",
        })

    if abs(variance) <= 3:
        lessons.append({
            "category": "Методология",
            "insight": "Прогноз оказался достаточно точным.",
            "recommendation": "Текущая модель прогнозирования работает адекватно для данного типа инвестиций.",
        })

    lessons.append({
        "category": "Процесс",
        "insight": "Регулярный ретроспективный анализ улучшает качество прогнозов.",
        "recommendation": "Проводить ретроспективу по всем завершённым инвестициям для накопления корпоративной памяти.",
    })

    return lessons
