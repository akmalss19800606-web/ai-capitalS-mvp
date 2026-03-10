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
