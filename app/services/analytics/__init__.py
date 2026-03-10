"""
Модуль портфельной аналитики — DCF/NPV/IRR, What-If, Монте-Карло, бизнес-кейсы.

Реэкспорт всех публичных функций для обратной совместимости.
"""

from .dcf_service import (
    calculate_dcf,
    _npv,
    _irr_bisection,
    _payback_period,
    _discounted_payback,
)
from .whatif_service import what_if_analysis
from .monte_carlo_service import monte_carlo_simulation
from .business_cases import (
    get_business_cases,
    get_business_case_by_id,
    get_business_cases_by_category,
    get_categories,
)

# Constants re-exported
from .dcf_service import (
    UZ_INFLATION_RATE,
    UZ_REFINANCING_RATE,
    UZ_GDP_GROWTH,
    UZ_RISK_PREMIUM,
    UZ_DEFAULT_DISCOUNT,
)

__all__ = [
    "calculate_dcf",
    "what_if_analysis",
    "monte_carlo_simulation",
    "get_business_cases",
    "get_business_case_by_id",
    "get_business_cases_by_category",
    "get_categories",
    "UZ_INFLATION_RATE",
    "UZ_REFINANCING_RATE",
    "UZ_GDP_GROWTH",
    "UZ_RISK_PREMIUM",
    "UZ_DEFAULT_DISCOUNT",
]
