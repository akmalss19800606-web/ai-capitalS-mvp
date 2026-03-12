"""
Reference Data Router - MARKET-002
Endpoints: OKED sectors, regions, SEZ zones, macro context
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.v1.deps import get_current_user, get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reference", tags=["Reference Data"])


# ---- Static reference data ----

OKED_SECTORS = [
    {"id": "A", "name_ru": "Сельское хозяйство", "name_uz": "Qishloq xo'jaligi", "name_en": "Agriculture"},
    {"id": "B", "name_ru": "Горнодобывающая промышленность", "name_uz": "Tog'-kon sanoati", "name_en": "Mining"},
    {"id": "C", "name_ru": "Обрабатывающая промышленность", "name_uz": "Qayta ishlash sanoati", "name_en": "Manufacturing"},
    {"id": "D", "name_ru": "Электроэнергетика", "name_uz": "Elektr energetika", "name_en": "Electricity & Gas"},
    {"id": "E", "name_ru": "Водоснабжение", "name_uz": "Suv ta'minoti", "name_en": "Water Supply"},
    {"id": "F", "name_ru": "Строительство", "name_uz": "Qurilish", "name_en": "Construction"},
    {"id": "G", "name_ru": "Торговля", "name_uz": "Savdo", "name_en": "Trade"},
    {"id": "H", "name_ru": "Транспорт", "name_uz": "Transport", "name_en": "Transport"},
    {"id": "I", "name_ru": "Гостиницы и рестораны", "name_uz": "Mehmonxona va restoranlar", "name_en": "Hospitality"},
    {"id": "J", "name_ru": "Информация и связь", "name_uz": "Axborot va aloqa", "name_en": "IT & Telecom"},
    {"id": "K", "name_ru": "Финансы и страхование", "name_uz": "Moliya va sug'urta", "name_en": "Finance & Insurance"},
    {"id": "L", "name_ru": "Операции с недвижимостью", "name_uz": "Ko'chmas mulk", "name_en": "Real Estate"},
    {"id": "M", "name_ru": "Профессиональная деятельность", "name_uz": "Professional faoliyat", "name_en": "Professional Services"},
    {"id": "N", "name_ru": "Административная деятельность", "name_uz": "Ma'muriy faoliyat", "name_en": "Administrative Services"},
    {"id": "P", "name_ru": "Образование", "name_uz": "Ta'lim", "name_en": "Education"},
    {"id": "Q", "name_ru": "Здравоохранение", "name_uz": "Sog'liqni saqlash", "name_en": "Healthcare"},
    {"id": "R", "name_ru": "Культура и спорт", "name_uz": "Madaniyat va sport", "name_en": "Culture & Sport"},
    {"id": "S", "name_ru": "Прочие услуги", "name_uz": "Boshqa xizmatlar", "name_en": "Other Services"},
]

REGIONS = [
    {"id": "tashkent_city", "name_ru": "г. Ташкент", "name_uz": "Toshkent shahri", "code": "TAS"},
    {"id": "tashkent_region", "name_ru": "Ташкентская область", "name_uz": "Toshkent viloyati", "code": "TO"},
    {"id": "andijan", "name_ru": "Андижанская область", "name_uz": "Andijon viloyati", "code": "AN"},
    {"id": "bukhara", "name_ru": "Бухарская область", "name_uz": "Buxoro viloyati", "code": "BU"},
    {"id": "fergana", "name_ru": "Ферганская область", "name_uz": "Farg'ona viloyati", "code": "FA"},
    {"id": "jizzakh", "name_ru": "Джизакская область", "name_uz": "Jizzax viloyati", "code": "JI"},
    {"id": "kashkadarya", "name_ru": "Кашкадарьинская область", "name_uz": "Qashqadaryo viloyati", "code": "QA"},
    {"id": "khorezm", "name_ru": "Хорезмская область", "name_uz": "Xorazm viloyati", "code": "XO"},
    {"id": "namangan", "name_ru": "Наманганская область", "name_uz": "Namangan viloyati", "code": "NA"},
    {"id": "navoi", "name_ru": "Навоийская область", "name_uz": "Navoiy viloyati", "code": "NW"},
    {"id": "samarkand", "name_ru": "Самаркандская область", "name_uz": "Samarqand viloyati", "code": "SA"},
    {"id": "surkhandarya", "name_ru": "Сурхандарьинская область", "name_uz": "Surxondaryo viloyati", "code": "SU"},
    {"id": "syrdarya", "name_ru": "Сырдарьинская область", "name_uz": "Sirdaryo viloyati", "code": "SI"},
    {"id": "karakalpakstan", "name_ru": "Республика Каракалпакстан", "name_uz": "Qoraqalpog'iston Respublikasi", "code": "QQ"},
]

SEZ_ZONES = [
    {
        "id": "navoiy_sez",
        "name": "СЭЗ Навои",
        "region": "navoi",
        "specialization": "Логистика, лёгкая промышленность",
        "tax_benefits": "0% налог на прибыль 7 лет, 0% НДС на экспорт",
        "established": 2008,
    },
    {
        "id": "angren_sez",
        "name": "СЭЗ Ангрен",
        "region": "tashkent_region",
        "specialization": "Промышленное производство, высокие технологии",
        "tax_benefits": "0% налог на прибыль 10 лет, льготы по земле",
        "established": 2012,
    },
    {
        "id": "jizzakh_sez",
        "name": "СЭЗ Джизак",
        "region": "jizzakh",
        "specialization": "Пищевая промышленность, текстиль",
        "tax_benefits": "0% налог на прибыль 10 лет",
        "established": 2013,
    },
    {
        "id": "urgut_sez",
        "name": "СЭЗ Ургут",
        "region": "samarkand",
        "specialization": "Туризм, ремёсла, пищевая промышленность",
        "tax_benefits": "Льготный налоговый режим 7 лет",
        "established": 2019,
    },
    {
        "id": "nukus_sez",
        "name": "СЭЗ Нукус",
        "region": "karakalpakstan",
        "specialization": "Химическая промышленность, агро",
        "tax_benefits": "0% налог на прибыль 10 лет, дотации ГКК",
        "established": 2019,
    },
    {
        "id": "technopolis_chinaz",
        "name": "Технопарк Чиназ",
        "region": "tashkent_region",
        "specialization": "IT, электроника, фармацевтика",
        "tax_benefits": "0% налог на прибыль 7 лет, упрощённый найм иностранцев",
        "established": 2021,
    },
]


# ---- Endpoints ----

@router.get("/oked", summary="Справочник ОКВЭД отраслей Узбекистана")
def get_oked_sectors(
    lang: Optional[str] = Query("ru", description="Язык: ru / uz / en"),
):
    """Возвращает полный справочник ОКВЭД (отраслей) Узбекистана."""
    result = []
    for s in OKED_SECTORS:
        name_key = f"name_{lang}" if lang in ("ru", "uz", "en") else "name_ru"
        result.append({"id": s["id"], "name": s.get(name_key, s["name_ru"])})
    return {"sectors": result, "total": len(result)}


@router.get("/regions", summary="Справочник регионов Узбекистана")
def get_regions(
    lang: Optional[str] = Query("ru", description="Язык: ru / uz"),
):
    """Возвращает список всех регионов Узбекистана."""
    result = []
    for r in REGIONS:
        name_key = f"name_{lang}" if lang in ("ru", "uz") else "name_ru"
        result.append({"id": r["id"], "code": r["code"], "name": r.get(name_key, r["name_ru"])})
    return {"regions": result, "total": len(result)}


@router.get("/sez", summary="Справочник СЭЗ (свободных экономических зон)")
def get_sez_zones(
    region: Optional[str] = Query(None, description="Фильтр по region_id"),
):
    """Возвращает список СЭЗ Узбекистана с налоговыми льготами."""
    zones = SEZ_ZONES
    if region:
        zones = [z for z in zones if z["region"] == region]
    return {"sez_zones": zones, "total": len(zones)}


@router.get("/sez/{sez_id}", summary="Детали конкретной СЭЗ")
def get_sez_detail(sez_id: str):
    """Возвращает детальную информацию о конкретной СЭЗ."""
    zone = next((z for z in SEZ_ZONES if z["id"] == sez_id), None)
    if not zone:
        raise HTTPException(status_code=404, detail=f"SEZ '{sez_id}' not found")
    return zone


@router.get("/macro-context", summary="Краткий макроэкономический контекст Узбекистана")
def get_macro_context():
    """Возвращает ключевые макроэкономические показатели для контекста инвестиционного анализа."""
    return {
        "country": "Uzbekistan",
        "currency": "UZS",
        "gdp_growth_forecast_2024": 5.5,
        "inflation_2023": 8.8,
        "key_sectors": ["Agriculture", "Manufacturing", "IT & Telecom", "Construction", "Trade"],
        "investment_climate": {
            "ease_of_doing_business": "improving",
            "fdi_inflow_trend": "growing",
            "sez_count": len(SEZ_ZONES),
            "strategic_programs": ["Digital Uzbekistan 2030", "New Uzbekistan 2022-2026"],
        },
        "tax_rates": {
            "corporate_income_tax": 15,
            "vat": 12,
            "personal_income_tax": 12,
            "social_tax": 12,
        },
        "source": "Ministry of Economy, World Bank, IMF (2024)",
    }
