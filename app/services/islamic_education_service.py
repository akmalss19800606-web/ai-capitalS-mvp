"""Islamic Education Service - AAOIFI/IFSB standards and courses."""
import logging
from typing import Any

logger = logging.getLogger(__name__)


AAOIFI_STANDARDS = [
    {"id": "SS1", "code": "SS 1", "org": "AAOIFI", "title_en": "Trading in Currencies",
     "title_ru": "Торговля валютами", "category": "shariah", "year": 2010},
    {"id": "SS5", "code": "SS 5", "org": "AAOIFI", "title_en": "Guarantees",
     "title_ru": "Гарантии (Кафала)", "category": "shariah", "year": 2010},
    {"id": "SS8", "code": "SS 8", "org": "AAOIFI", "title_en": "Murabaha",
     "title_ru": "Мурабаха", "category": "shariah", "year": 2010},
    {"id": "SS9", "code": "SS 9", "org": "AAOIFI", "title_en": "Ijara and Ijara Muntahia Bittamleek",
     "title_ru": "Иджара", "category": "shariah", "year": 2010},
    {"id": "SS12", "code": "SS 12", "org": "AAOIFI", "title_en": "Sharika (Musharaka)",
     "title_ru": "Мушарака", "category": "shariah", "year": 2010},
    {"id": "SS13", "code": "SS 13", "org": "AAOIFI", "title_en": "Mudaraba",
     "title_ru": "Мудараба", "category": "shariah", "year": 2010},
    {"id": "SS17", "code": "SS 17", "org": "AAOIFI", "title_en": "Investment Sukuk",
     "title_ru": "Инвестиционные сукук", "category": "shariah", "year": 2010},
    {"id": "SS26", "code": "SS 26", "org": "AAOIFI", "title_en": "Islamic Insurance (Takaful)",
     "title_ru": "Исламское страхование (Такафул)", "category": "shariah", "year": 2010},
    {"id": "FAS1", "code": "FAS 1", "org": "AAOIFI", "title_en": "General Presentation and Disclosure",
     "title_ru": "Общее представление и раскрытие", "category": "accounting", "year": 2010},
    {"id": "GS1", "code": "GS 1", "org": "AAOIFI", "title_en": "Shariah Supervisory Board",
     "title_ru": "Шариатский наблюдательный совет", "category": "governance", "year": 2010},
]

IFSB_STANDARDS = [
    {"id": "IFSB1", "code": "IFSB-1", "org": "IFSB", "title_en": "Risk Management",
     "title_ru": "Управление рисками", "category": "prudential", "year": 2005},
    {"id": "IFSB2", "code": "IFSB-2", "org": "IFSB", "title_en": "Capital Adequacy",
     "title_ru": "Достаточность капитала", "category": "prudential", "year": 2005},
    {"id": "IFSB3", "code": "IFSB-3", "org": "IFSB", "title_en": "Corporate Governance",
     "title_ru": "Корпоративное управление", "category": "governance", "year": 2006},
    {"id": "IFSB4", "code": "IFSB-4", "org": "IFSB", "title_en": "Transparency and Disclosure",
     "title_ru": "Прозрачность и раскрытие", "category": "disclosure", "year": 2007},
    {"id": "IFSB10", "code": "IFSB-10", "org": "IFSB", "title_en": "Shariah Governance",
     "title_ru": "Шариатское управление", "category": "governance", "year": 2009},
]

COURSES = [
    {"id": "C1", "title_ru": "Основы исламских финансов", "level": "beginner",
     "modules": 8, "duration_hours": 16, "description": "Введение в принципы шариатских финансов"},
    {"id": "C2", "title_ru": "Стандарты AAOIFI", "level": "intermediate",
     "modules": 12, "duration_hours": 24, "description": "Изучение стандартов AAOIFI для Узбекистана"},
    {"id": "C3", "title_ru": "Такафул и страхование", "level": "intermediate",
     "modules": 6, "duration_hours": 12, "description": "Исламское страхование: теория и практика"},
    {"id": "C4", "title_ru": "Сукук и исламские облигации", "level": "advanced",
     "modules": 10, "duration_hours": 20, "description": "Структурирование и выпуск сукук"},
    {"id": "C5", "title_ru": "Шариатский аудит", "level": "advanced",
     "modules": 8, "duration_hours": 16, "description": "Методология шариатского аудита и комплаенса"},
]


def get_standards(org: str | None = None, category: str | None = None) -> list[dict[str, Any]]:
    """Get AAOIFI/IFSB standards with optional filters."""
    all_standards = AAOIFI_STANDARDS + IFSB_STANDARDS
    if org:
        all_standards = [s for s in all_standards if s["org"].lower() == org.lower()]
    if category:
        all_standards = [s for s in all_standards if s["category"] == category]
    return all_standards


def get_courses(level: str | None = None) -> list[dict[str, Any]]:
    """Get available Islamic finance courses."""
    if level:
        return [c for c in COURSES if c["level"] == level]
    return COURSES


def get_standard_by_id(standard_id: str) -> dict[str, Any] | None:
    """Get a specific standard by ID."""
    for s in AAOIFI_STANDARDS + IFSB_STANDARDS:
        if s["id"] == standard_id:
            return s
    return None


def get_education_stats() -> dict[str, Any]:
    """Get education module statistics."""
    return {
        "total_standards": len(AAOIFI_STANDARDS) + len(IFSB_STANDARDS),
        "aaoifi_count": len(AAOIFI_STANDARDS),
        "ifsb_count": len(IFSB_STANDARDS),
        "total_courses": len(COURSES),
        "total_modules": sum(c["modules"] for c in COURSES),
        "total_hours": sum(c["duration_hours"] for c in COURSES),
    }
