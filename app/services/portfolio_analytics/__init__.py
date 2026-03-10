"""
Portfolio Analytics Service — модульная структура.
Реэкспорт всех функций для обратной совместимости.
"""
from .dcf_service import calculate_dcf
from .what_if_service import what_if_analysis
from .monte_carlo_service import monte_carlo_simulation
from .business_cases_service import (
    get_business_cases,
    get_business_case_by_id,
    get_business_cases_by_category,
    get_categories,
)

__all__ = [
    'calculate_dcf',
    'what_if_analysis',
    'monte_carlo_simulation',
    'get_business_cases',
    'get_business_case_by_id',
    'get_business_cases_by_category',
    'get_categories',
]
