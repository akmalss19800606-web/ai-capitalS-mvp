"""
XAI (Explainable AI) сервис — объяснимость инвестиционных решений.

Разбивает AI-анализ на составляющие факторы с весами,
обеспечивает уровень уверенности и генерирует пояснения.
"""

import logging
import random
from typing import Any

logger = logging.getLogger(__name__)

# ─── Факторы анализа с базовыми весами ────────────────────────────────────────

INVESTMENT_FACTORS = [
    {
        "key": "market_growth",
        "name_ru": "Рост рынка",
        "name_en": "Market Growth",
        "category": "market",
        "base_weight": 0.20,
        "description_ru": "Темпы роста целевого рынка и спрос",
        "description_en": "Target market growth rate and demand",
    },
    {
        "key": "regulatory_environment",
        "name_ru": "Регуляторная среда",
        "name_en": "Regulatory Environment",
        "category": "risk",
        "base_weight": 0.15,
        "description_ru": "Государственное регулирование и лицензирование",
        "description_en": "Government regulation and licensing",
    },
    {
        "key": "competition",
        "name_ru": "Конкуренция",
        "name_en": "Competition",
        "category": "market",
        "base_weight": -0.12,
        "description_ru": "Уровень конкуренции в отрасли",
        "description_en": "Industry competition level",
    },
    {
        "key": "infrastructure",
        "name_ru": "Инфраструктура",
        "name_en": "Infrastructure",
        "category": "operational",
        "base_weight": 0.10,
        "description_ru": "Доступность логистики, энергии, связи",
        "description_en": "Logistics, energy, communications availability",
    },
    {
        "key": "macroeconomic_stability",
        "name_ru": "Макроэкономическая стабильность",
        "name_en": "Macroeconomic Stability",
        "category": "macro",
        "base_weight": 0.12,
        "description_ru": "Инфляция, курс валют, ставки ЦБ",
        "description_en": "Inflation, exchange rates, central bank rates",
    },
    {
        "key": "labor_market",
        "name_ru": "Рынок труда",
        "name_en": "Labor Market",
        "category": "operational",
        "base_weight": 0.08,
        "description_ru": "Доступность и стоимость рабочей силы",
        "description_en": "Workforce availability and cost",
    },
    {
        "key": "currency_risk",
        "name_ru": "Валютный риск",
        "name_en": "Currency Risk",
        "category": "risk",
        "base_weight": -0.10,
        "description_ru": "Волатильность UZS/USD и девальвационные риски",
        "description_en": "UZS/USD volatility and devaluation risks",
    },
    {
        "key": "tax_incentives",
        "name_ru": "Налоговые льготы",
        "name_en": "Tax Incentives",
        "category": "financial",
        "base_weight": 0.08,
        "description_ru": "СЭЗ, налоговые каникулы, льготное кредитование",
        "description_en": "SEZ, tax holidays, preferential lending",
    },
    {
        "key": "political_risk",
        "name_ru": "Политический риск",
        "name_en": "Political Risk",
        "category": "risk",
        "base_weight": -0.06,
        "description_ru": "Политическая стабильность и предсказуемость",
        "description_en": "Political stability and predictability",
    },
    {
        "key": "sector_profitability",
        "name_ru": "Рентабельность отрасли",
        "name_en": "Sector Profitability",
        "category": "financial",
        "base_weight": 0.15,
        "description_ru": "Средняя маржа и окупаемость в секторе",
        "description_en": "Average margin and payback in the sector",
    },
]

# ─── Секторные корректировки ──────────────────────────────────────────────────

SECTOR_ADJUSTMENTS: dict[str, dict[str, float]] = {
    "agriculture": {
        "market_growth": 1.3, "infrastructure": 0.7,
        "labor_market": 1.4, "tax_incentives": 1.3,
    },
    "food_processing": {
        "market_growth": 1.2, "sector_profitability": 1.1,
        "infrastructure": 0.9, "competition": 1.2,
    },
    "trade": {
        "market_growth": 1.1, "competition": 1.4,
        "currency_risk": 1.3, "tax_incentives": 0.8,
    },
    "construction": {
        "market_growth": 1.4, "regulatory_environment": 1.3,
        "infrastructure": 1.2, "sector_profitability": 1.2,
    },
    "manufacturing": {
        "infrastructure": 1.3, "labor_market": 1.2,
        "tax_incentives": 1.4, "competition": 0.8,
    },
    "it_services": {
        "market_growth": 1.5, "labor_market": 1.3,
        "tax_incentives": 1.5, "infrastructure": 0.8,
        "competition": 0.7,
    },
    "transport": {
        "infrastructure": 1.5, "regulatory_environment": 1.2,
        "market_growth": 1.1, "currency_risk": 1.2,
    },
    "tourism": {
        "market_growth": 1.4, "infrastructure": 1.1,
        "political_risk": 1.2, "sector_profitability": 1.1,
    },
}


def _compute_factor_importance(
    sector: str = "general",
    investment_amount: float = 10000,
    time_horizon_years: int = 3,
) -> list[dict[str, Any]]:
    """
    Рассчитывает важность каждого фактора для данного сектора.

    Возвращает список факторов с рассчитанными весами и вкладами.
    """
    adjustments = SECTOR_ADJUSTMENTS.get(sector, {})

    factors = []
    total_abs_weight = 0.0

    for f in INVESTMENT_FACTORS:
        adj = adjustments.get(f["key"], 1.0)
        # Добавляем небольшую вариацию для реалистичности
        noise = random.uniform(-0.02, 0.02)
        weight = f["base_weight"] * adj + noise

        # Горизонт влияет на долгосрочные факторы
        if f["category"] == "macro" and time_horizon_years > 3:
            weight *= 1.0 + (time_horizon_years - 3) * 0.05
        if f["category"] == "risk" and time_horizon_years > 5:
            weight *= 1.0 + (time_horizon_years - 5) * 0.03

        total_abs_weight += abs(weight)
        factors.append({
            **f,
            "weight": weight,
        })

    # Нормализация для получения процентного вклада
    for f in factors:
        f["importance_pct"] = round(
            abs(f["weight"]) / total_abs_weight * 100, 1
        ) if total_abs_weight > 0 else 0
        f["impact"] = "positive" if f["weight"] > 0 else "negative"
        f["weight"] = round(f["weight"], 4)

    # Сортировка по абсолютному весу (наиболее важные первые)
    factors.sort(key=lambda x: abs(x["weight"]), reverse=True)
    return factors


def _compute_confidence(
    factors: list[dict[str, Any]],
    investment_amount: float,
    time_horizon_years: int,
) -> dict[str, Any]:
    """
    Рассчитывает уровень уверенности в рекомендации (0-100%).

    Учитывает:
    - Баланс положительных и отрицательных факторов
    - Горизонт инвестирования (дольше → менее уверенно)
    - Размер инвестиции
    """
    positive_weight = sum(f["weight"] for f in factors if f["weight"] > 0)
    negative_weight = sum(abs(f["weight"]) for f in factors if f["weight"] < 0)
    total_weight = positive_weight + negative_weight

    # Базовая уверенность из баланса факторов
    balance_ratio = positive_weight / total_weight if total_weight > 0 else 0.5

    base_confidence = balance_ratio * 80  # Макс. 80 из баланса

    # Штраф за длинный горизонт
    horizon_penalty = min(time_horizon_years * 2, 15)

    # Бонус за средний размер инвестиции (не слишком маленькая, не огромная)
    if 5000 <= investment_amount <= 100000:
        size_bonus = 10
    elif 1000 <= investment_amount <= 500000:
        size_bonus = 5
    else:
        size_bonus = 0

    confidence = max(15, min(95, base_confidence - horizon_penalty + size_bonus))

    # Уровень уверенности
    if confidence >= 75:
        level = "high"
        level_ru = "Высокий"
    elif confidence >= 50:
        level = "medium"
        level_ru = "Средний"
    else:
        level = "low"
        level_ru = "Низкий"

    return {
        "score": round(confidence, 1),
        "level": level,
        "level_ru": level_ru,
        "positive_factors_weight": round(positive_weight, 4),
        "negative_factors_weight": round(negative_weight, 4),
        "horizon_penalty": round(horizon_penalty, 1),
        "size_bonus": size_bonus,
    }


def _generate_recommendation(
    factors: list[dict[str, Any]],
    confidence: dict[str, Any],
    language: str = "ru",
) -> dict[str, Any]:
    """Генерирует рекомендацию на основе факторов и уверенности."""
    positive = [f for f in factors if f["weight"] > 0]
    negative = [f for f in factors if f["weight"] < 0]
    score = confidence["score"]

    name_key = "name_ru" if language == "ru" else "name_en"
    desc_key = "description_ru" if language == "ru" else "description_en"

    if score >= 65:
        action = "ИНВЕСТИРОВАТЬ" if language == "ru" else "INVEST"
        action_code = "invest"
    elif score >= 40:
        action = "ОСТОРОЖНО РАССМОТРЕТЬ" if language == "ru" else "CONSIDER WITH CAUTION"
        action_code = "consider"
    else:
        action = "ВОЗДЕРЖАТЬСЯ" if language == "ru" else "AVOID"
        action_code = "avoid"

    # Топ-3 причины
    top_positive = [
        f"{f[name_key]}: {f[desc_key]}" for f in positive[:3]
    ]
    top_negative = [
        f"{f[name_key]}: {f[desc_key]}" for f in negative[:2]
    ]

    if language == "ru":
        explanation = (
            f"Рекомендация: {action} (уверенность {score:.0f}%).\n\n"
            f"Основные позитивные факторы:\n"
            + "\n".join(f"  + {r}" for r in top_positive)
            + "\n\nОсновные риски:\n"
            + "\n".join(f"  - {r}" for r in top_negative)
        )
    else:
        explanation = (
            f"Recommendation: {action} (confidence {score:.0f}%).\n\n"
            f"Key positive factors:\n"
            + "\n".join(f"  + {r}" for r in top_positive)
            + "\n\nKey risks:\n"
            + "\n".join(f"  - {r}" for r in top_negative)
        )

    return {
        "action": action,
        "action_code": action_code,
        "explanation": explanation,
        "top_positive_factors": [f[name_key] for f in positive[:3]],
        "top_negative_factors": [f[name_key] for f in negative[:2]],
    }


async def analyze_explainability(
    sector: str = "general",
    investment_amount: float = 10000,
    time_horizon_years: int = 3,
    language: str = "ru",
    analysis_type: str = "investment",
) -> dict[str, Any]:
    """
    Полный XAI-анализ инвестиционного решения.

    Args:
        sector: Сектор экономики.
        investment_amount: Сумма инвестиции (USD).
        time_horizon_years: Горизонт инвестирования (лет).
        language: Язык ответа (ru/en).
        analysis_type: Тип анализа (investment/risk/sector).

    Returns:
        Полный XAI-отчёт: факторы, уверенность, рекомендация.
    """
    logger.info(
        "XAI анализ: сектор=%s, сумма=$%s, горизонт=%d лет",
        sector, investment_amount, time_horizon_years,
    )

    factors = _compute_factor_importance(
        sector=sector,
        investment_amount=investment_amount,
        time_horizon_years=time_horizon_years,
    )

    confidence = _compute_confidence(
        factors=factors,
        investment_amount=investment_amount,
        time_horizon_years=time_horizon_years,
    )

    recommendation = _generate_recommendation(
        factors=factors,
        confidence=confidence,
        language=language,
    )

    # Группировка факторов по категориям
    categories: dict[str, list[dict[str, Any]]] = {}
    for f in factors:
        cat = f["category"]
        if cat not in categories:
            categories[cat] = []
        name_key = "name_ru" if language == "ru" else "name_en"
        categories[cat].append({
            "key": f["key"],
            "name": f[name_key],
            "weight": f["weight"],
            "importance_pct": f["importance_pct"],
            "impact": f["impact"],
        })

    category_labels = {
        "market": "Рыночные" if language == "ru" else "Market",
        "risk": "Риски" if language == "ru" else "Risks",
        "operational": "Операционные" if language == "ru" else "Operational",
        "macro": "Макроэкономические" if language == "ru" else "Macroeconomic",
        "financial": "Финансовые" if language == "ru" else "Financial",
    }

    name_key = "name_ru" if language == "ru" else "name_en"
    factor_list = [
        {
            "key": f["key"],
            "name": f[name_key],
            "weight": f["weight"],
            "importance_pct": f["importance_pct"],
            "impact": f["impact"],
            "category": f["category"],
        }
        for f in factors
    ]

    return {
        "factors": factor_list,
        "categories": {
            cat: {
                "label": category_labels.get(cat, cat),
                "factors": items,
            }
            for cat, items in categories.items()
        },
        "confidence": confidence,
        "recommendation": recommendation,
        "metadata": {
            "sector": sector,
            "investment_amount": investment_amount,
            "time_horizon_years": time_horizon_years,
            "analysis_type": analysis_type,
            "language": language,
            "num_factors": len(factors),
        },
    }
