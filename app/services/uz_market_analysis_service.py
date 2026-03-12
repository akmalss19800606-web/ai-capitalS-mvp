"""
UZ Market Analysis Service - MARKET-005
Full TZ v3.0 implementation:
- quick_ask, deep_analysis, sector_compare (MARKET-001)
- full_market_analysis (25 fields -> 12-section report) (MARKET-005)
- get_regions, get_sez_list, get_oked_sections, get_macro_indicators
"""
import logging
import os
import json
from typing import Optional, List, Dict, Any
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY", "")
PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"
PERPLEXITY_MODEL = os.getenv("PERPLEXITY_MODEL", "llama-3.1-sonar-large-128k-online")

# 25 GICS-like sectors for Uzbekistan
UZ_SECTORS = [
    {"id": "wholesale_flour", "name": "Оптовая торговля мукой", "gics": "Consumer Staples"},
    {"id": "retail_food", "name": "Розничная торговля продуктами", "gics": "Consumer Staples"},
    {"id": "textile", "name": "Текстильное производство", "gics": "Consumer Discretionary"},
    {"id": "construction", "name": "Строительство жилых зданий", "gics": "Industrials"},
    {"id": "it_software", "name": "IT-услуги и разработка ПО", "gics": "Information Technology"},
    {"id": "pharma", "name": "Фармацевтика", "gics": "Health Care"},
    {"id": "agriculture", "name": "Сельское хозяйство", "gics": "Consumer Staples"},
    {"id": "logistics", "name": "Логистика и транспорт", "gics": "Industrials"},
    {"id": "banking", "name": "Банковские услуги", "gics": "Financials"},
    {"id": "insurance", "name": "Страхование", "gics": "Financials"},
    {"id": "energy", "name": "Энергетика", "gics": "Utilities"},
    {"id": "mining", "name": "Горнодобывающая промышленность", "gics": "Materials"},
    {"id": "food_processing", "name": "Пищевая промышленность", "gics": "Consumer Staples"},
    {"id": "chemical", "name": "Химическая промышленность", "gics": "Materials"},
    {"id": "metallurgy", "name": "Металлургия", "gics": "Materials"},
    {"id": "tourism", "name": "Туризм и гостиницы", "gics": "Consumer Discretionary"},
    {"id": "education", "name": "Образование", "gics": "Consumer Discretionary"},
    {"id": "healthcare", "name": "Здравоохранение", "gics": "Health Care"},
    {"id": "telecom", "name": "Телекоммуникации", "gics": "Communication Services"},
    {"id": "real_estate", "name": "Недвижимость", "gics": "Real Estate"},
    {"id": "automotive", "name": "Автомобильная отрасль", "gics": "Consumer Discretionary"},
    {"id": "electronics", "name": "Электроника", "gics": "Information Technology"},
    {"id": "furniture", "name": "Мебельное производство", "gics": "Consumer Discretionary"},
    {"id": "light_industry", "name": "Легкая промышленность", "gics": "Consumer Discretionary"},
    {"id": "oil_gas", "name": "Нефть и газ", "gics": "Energy"},
]

# 12-section report template (TZ v3.0)
DEEP_SECTIONS = [
    "Обзор рынка",
    "Объем и динамика",
    "Конкурентная среда",
    "SWOT-анализ",
    "PESTEL-анализ",
    "Регуляторная среда",
    "Финансовые показатели",
    "Инвестиционная привлекательность",
    "Риски и вызовы",
    "Тренды и прогнозы",
    "Рекомендации для инвесторов",
    "Заключение",
]

# 14 regions of Uzbekistan
UZ_REGIONS = [
    {"id": "tashkent_city", "name": "Ташкент (город)", "grp_bln_uzs": 142000, "population_mln": 3.0, "avg_salary_uzs": 4200000},
    {"id": "tashkent_region", "name": "Ташкентская область", "grp_bln_uzs": 58000, "population_mln": 2.9, "avg_salary_uzs": 3100000},
    {"id": "samarkand", "name": "Самаркандская область", "grp_bln_uzs": 42000, "population_mln": 4.0, "avg_salary_uzs": 2600000},
    {"id": "fergana", "name": "Ферганская область", "grp_bln_uzs": 38000, "population_mln": 3.8, "avg_salary_uzs": 2500000},
    {"id": "andijan", "name": "Андижанская область", "grp_bln_uzs": 35000, "population_mln": 3.5, "avg_salary_uzs": 2400000},
    {"id": "namangan", "name": "Наманганская область", "grp_bln_uzs": 30000, "population_mln": 2.9, "avg_salary_uzs": 2300000},
    {"id": "bukhara", "name": "Бухарская область", "grp_bln_uzs": 28000, "population_mln": 1.9, "avg_salary_uzs": 2800000},
    {"id": "kashkadarya", "name": "Кашкадарьинская область", "grp_bln_uzs": 32000, "population_mln": 3.4, "avg_salary_uzs": 2500000},
    {"id": "surkhandarya", "name": "Сурхандарьинская область", "grp_bln_uzs": 18000, "population_mln": 2.6, "avg_salary_uzs": 2100000},
    {"id": "jizzakh", "name": "Джизакская область", "grp_bln_uzs": 12000, "population_mln": 1.3, "avg_salary_uzs": 2200000},
    {"id": "syrdarya", "name": "Сырдарьинская область", "grp_bln_uzs": 10000, "population_mln": 0.9, "avg_salary_uzs": 2300000},
    {"id": "navoi", "name": "Навоийская область", "grp_bln_uzs": 22000, "population_mln": 1.1, "avg_salary_uzs": 3500000},
    {"id": "khorezm", "name": "Хорезмская область", "grp_bln_uzs": 14000, "population_mln": 1.9, "avg_salary_uzs": 2200000},
    {"id": "karakalpakstan", "name": "Республика Каракалпакстан", "grp_bln_uzs": 11000, "population_mln": 1.9, "avg_salary_uzs": 2000000},
]

# Key SEZs (из 49 — топ для инвесторов)
UZ_SEZ = [
    {"code": "NAVOIY", "name": "СЭЗ Навои", "region": "navoi", "focus": ["logistics", "manufacturing"], "tax_exemptions": ["НДС 0%", "Налог на прибыль 0% 10 лет", "Таможенные пошлины 0%"], "duration_years": 30},
    {"code": "ANGREN", "name": "СЭЗ Ангрен", "region": "tashkent_region", "focus": ["industry", "chemical"], "tax_exemptions": ["Налог на прибыль 0% 10 лет", "Земельный налог 0%"], "duration_years": 30},
    {"code": "JIZZAKH", "name": "СЭЗ Джизак", "region": "jizzakh", "focus": ["light_industry", "food_processing"], "tax_exemptions": ["Налог на прибыль 0% 7 лет", "НДС 0%"], "duration_years": 30},
    {"code": "URGUT", "name": "СЭЗ Ургут", "region": "samarkand", "focus": ["tourism", "agriculture"], "tax_exemptions": ["Налог на прибыль 0% 7 лет"], "duration_years": 20},
    {"code": "GISSAR", "name": "СЭЗ Гиссар", "region": "tashkent_region", "focus": ["it_software", "electronics"], "tax_exemptions": ["Налог на прибыль 0% 10 лет", "Соцналог 0%"], "duration_years": 30},
    {"code": "IT_PARK", "name": "IT Park Узбекистан", "region": "tashkent_city", "focus": ["it_software"], "tax_exemptions": ["Налог на прибыль 0%", "НДС 0%", "Таможня 0%", "Соцналог 1%"], "duration_years": 999},
]

# OKED sections A-U
OKED_SECTIONS = [
    {"code": "A", "name": "Сельское, лесное и рыбное хозяйство"},
    {"code": "B", "name": "Горнодобывающая промышленность"},
    {"code": "C", "name": "Обрабатывающая промышленность"},
    {"code": "D", "name": "Электроснабжение, газ, пар"},
    {"code": "E", "name": "Водоснабжение, канализация, утилизация отходов"},
    {"code": "F", "name": "Строительство"},
    {"code": "G", "name": "Оптовая и розничная торговля"},
    {"code": "H", "name": "Транспортировка и хранение"},
    {"code": "I", "name": "Деятельность гостиниц и ресторанов"},
    {"code": "J", "name": "Информация и связь"},
    {"code": "K", "name": "Финансовая и страховая деятельность"},
    {"code": "L", "name": "Операции с недвижимостью"},
    {"code": "M", "name": "Профессиональная, научная и техническая деятельность"},
    {"code": "N", "name": "Административная и вспомогательная деятельность"},
    {"code": "O", "name": "Государственное управление"},
    {"code": "P", "name": "Образование"},
    {"code": "Q", "name": "Здравоохранение и социальные услуги"},
    {"code": "R", "name": "Искусство, развлечения и отдых"},
    {"code": "S", "name": "Прочие виды услуг"},
    {"code": "T", "name": "Деятельность домашних хозяйств"},
    {"code": "U", "name": "Деятельность экстерриториальных организаций"},
]


async def _call_groq(system_prompt: str, user_msg: str) -> str:
    if not GROQ_API_KEY:
        return "Ошибка: GROQ_API_KEY не настроен"
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(GROQ_URL, headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }, json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg}
            ],
            "temperature": 0.3,
            "max_tokens": 4096
        })
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_perplexity(system_prompt: str, user_msg: str) -> str:
    if not PERPLEXITY_API_KEY:
        return "Ошибка: PERPLEXITY_API_KEY не настроен"
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(PERPLEXITY_URL, headers={
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }, json={
            "model": PERPLEXITY_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg}
            ],
            "temperature": 0.2,
            "max_tokens": 4096
        })
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def _parse_json_from_text(raw: str) -> dict:
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass
    return {"raw": raw}


class UZMarketAnalysisService:
    """Service for Uzbekistan market analysis - full TZ v3.0."""

    # ------------------------------------------------------------------
    # Reference data methods
    # ------------------------------------------------------------------

    @staticmethod
    def get_sectors() -> List[Dict]:
        return UZ_SECTORS

    @staticmethod
    def get_sector_by_id(sector_id: str) -> Optional[Dict]:
        for s in UZ_SECTORS:
            if s["id"] == sector_id:
                return s
        return None

    @staticmethod
    def
