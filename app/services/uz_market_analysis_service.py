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
    def get_regions() -> List[Dict]:
        return UZ_REGIONS

    @staticmethod
    def get_region_by_id(region_id: str) -> Optional[Dict]:
        for r in UZ_REGIONS:
            if r["id"] == region_id:
                return r
        return None

    @staticmethod
    def get_sez_list() -> List[Dict]:
        return UZ_SEZ

    @staticmethod
    def get_sez_by_region(region_id: str) -> List[Dict]:
        return [s for s in UZ_SEZ if s["region"] == region_id]

    @staticmethod
    def get_oked_sections() -> List[Dict]:
        return OKED_SECTIONS

    @staticmethod
    def get_macro_indicators() -> Dict:
        return {
            "gdp_growth_pct": 6.5,
            "inflation_cpi_pct": 9.8,
            "policy_rate_pct": 13.5,
            "usd_uzs_rate": 12750.0,
            "tsmi_index": 1850.0,
            "rse_capitalization_bln_uzs": 28500.0,
            "treasury_3y_pct": 17.5,
            "treasury_10y_pct": 18.2,
            "source": "CBU / Stat.uz (2025)",
            "updated_at": "2025-01-01",
        }

    # ------------------------------------------------------------------
    # Original methods (MARKET-001)
    # ------------------------------------------------------------------

    @staticmethod
    async def quick_ask(question: str, sector: Optional[str] = None, provider: str = "groq") -> Dict[str, Any]:
        sector_context = ""
        if sector:
            sec = UZMarketAnalysisService.get_sector_by_id(sector)
            if sec:
                sector_context = f"\nОтрасль: {sec['name']} (GICS: {sec['gics']})"
        system = (
            "Ты — эксперт по рынку Узбекистана. Отвечай на русском языке, "
            "конкретно и с цифрами. Фокус на инвестиционном анализе."
            f"{sector_context}"
        )
        try:
            if provider == "perplexity" and PERPLEXITY_API_KEY:
                answer = await _call_perplexity(system, question)
            else:
                answer = await _call_groq(system, question)
            return {
                "question": question,
                "answer": answer,
                "sector": sector,
                "provider": provider,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Quick Ask error: {e}")
            return {"question": question, "answer": f"Ошибка: {str(e)}", "sector": sector, "provider": provider}

    @staticmethod
    async def deep_analysis(sector_id: str, provider: str = "groq") -> Dict[str, Any]:
        sector = UZMarketAnalysisService.get_sector_by_id(sector_id)
        if not sector:
            return {"error": f"Отрасль '{sector_id}' не найдена"}
        sections_list = "\n".join(f"{i+1}. {s}" for i, s in enumerate(DEEP_SECTIONS))
        system = (
            "Ты — ведущий аналитик инвестиционного рынка Узбекистана. "
            "Пиши на русском языке. Давай конкретные цифры, факты, анализ. "
            "Формат ответа: JSON с ключом 'sections' — массив из 12 объектов "
            "{title, content, key_metrics: [{label, value}]}. "
            "Также добавь 'summary' и 'risk_score' (1-10) и 'investment_rating' (A/B/C/D)."
        )
        user_msg = (
            f"Составь полный инвестиционный анализ отрасли '{sector['name']}' "
            f"(GICS: {sector['gics']}) в Узбекистане на 2025-2026 год.\n"
            f"Структура отчета (12 разделов):\n{sections_list}"
        )
        try:
            if provider == "perplexity" and PERPLEXITY_API_KEY:
                raw = await _call_perplexity(system, user_msg)
            else:
                raw = await _call_groq(system, user_msg)
            data = _parse_json_from_text(raw)
            return {
                "sector": sector,
                "report": data,
                "provider": provider,
                "sections_count": len(data.get("sections", [])),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Deep Analysis error: {e}")
            return {"sector": sector, "error": str(e), "provider": provider}

    @staticmethod
    async def sector_compare(sector_ids: List[str], provider: str = "groq") -> Dict[str, Any]:
        sectors = []
        for sid in sector_ids:
            s = UZMarketAnalysisService.get_sector_by_id(sid)
            if s:
                sectors.append(s)
        if len(sectors) < 2:
            return {"error": "Нужно минимум 2 отрасли"}
        names = ", ".join(s["name"] for s in sectors)
        system = (
            "Ты — инвестиционный аналитик Узбекистана. Сравни отрасли. "
            "Ответ в формате JSON: {sectors: [{name, growth, risk, margin, recommendation}], winner, reasoning}"
        )
        user_msg = f"Сравни отрасли Узбекистана: {names}. Какая лучше для инвестиций в 2025-2026?"
        try:
            if provider == "perplexity" and PERPLEXITY_API_KEY:
                raw = await _call_perplexity(system, user_msg)
            else:
                raw = await _call_groq(system, user_msg)
            data = _parse_json_from_text(raw)
            return {"comparison": data, "sectors": sectors, "provider": provider, "timestamp": datetime.utcnow().isoformat()}
        except Exception as e:
            logger.error(f"Sector compare error: {e}")
            return {"error": str(e)}

    # ------------------------------------------------------------------
    # MARKET-005: Full 25-field analysis -> 12-section report
    # ------------------------------------------------------------------

    @staticmethod
    async def full_market_analysis(request: Any, report_id: str, provider: str = "groq") -> Dict[str, Any]:
        """
        Main method: принимает MarketAnalysisRequest (25 полей),
        возвращает полный 12-секционный отчёт по ТЗ v3.0.
        """
        req = request if isinstance(request, dict) else request.dict()

        # Enrich with reference data
        region_data = UZMarketAnalysisService.get_region_by_id(req.get("region", "")) or {}
        sez_data = None
        if req.get("sez_code"):
            sez_matches = [s for s in UZ_SEZ if s["code"] == req.get("sez_code")]
            sez_data = sez_matches[0] if sez_matches else None
        macro = UZMarketAnalysisService.get_macro_indicators()

        # Build context string for AI
        oked_info = f"ОКЭД {req.get('oked_section', '')}.{req.get('oked_division', '')}"
        if req.get("activity_description"):
            oked_info += f" — {req['activity_description']}"

        region_info = region_data.get("name", req.get("region", ""))
        amount = req.get("investment_amount", 0)
        currency = req.get("investment_currency", "USD")
        horizon = req.get("investment_horizon_years", 5)
        inv_type = req.get("investment_type", "greenfield")
        stage = req.get("project_stage", "idea")
        legal = req.get("legal_form", "ooo")
        tax = req.get("tax_regime", "general")
        risk_profile = req.get("risk_profile", 5)
        debt_ratio = req.get("debt_ratio_pct", 30)
        loan_rate = req.get("expected_loan_rate_pct", 22.8)
        margin = req.get("expected_margin_pct", 15)
        employees = req.get("planned_employees", 10)
        import_dep = req.get("import_dependency_pct", 30)
        competitors = req.get("competitors_range", "4-10")
        market_share = req.get("expected_market_share_pct", 5)
        funding = req.get("funding_sources", ["own"])
        target_markets = req.get("target_markets", ["domestic"])

        sez_info = ""
        if sez_data:
            sez_info = f"\nСЭЗ: {sez_data['name']} — льготы: {', '.join(sez_data['tax_exemptions'])}"

        sections_list = "\n".join(f"{i+1}. {s}" for i, s in enumerate(DEEP_SECTIONS))

        system = (
            "Ты — ведущий инвестиционный аналитик по рынку Узбекистана. "
            "Пиши на русском языке. Давай конкретные цифры, расчёты и факты. "
            "Ответ СТРОГО в формате JSON:\n"
            "{\n"
            '  "executive_summary": "краткое резюме 3-5 предложений",\n'
            '  "recommendation": "invest"|"hold"|"avoid",\n'
            '  "confidence_score": 0-100,\n'
            '  "sections": [\n'
            '    {"number": 1, "title": "...", "content": "подробный текст", "charts": []},\n'
            "    ... (12 разделов)\n"
            "  ]\n"
            "}"
        )

        user_msg = (
            f"Проведи полный инвестиционный анализ рынка Узбекистана:\n\n"
            f"ДЕЯТЕЛЬНОСТЬ: {oked_info}\n"
            f"РЕГИОН: {region_info} (ВРП: {region_data.get('grp_bln_uzs', 'н/д')} млрд сум, "
            f"население: {region_data.get('population_mln', 'н/д')} млн, "
            f"средняя зарплата: {region_data.get('avg_salary_uzs', 'н/д')} сум){sez_info}\n\n"
            f"ИНВЕСТИЦИИ: {amount:,} {currency} | горизонт: {horizon} лет | тип: {inv_type} | стадия: {stage}\n"
            f"ФИНАНСЫ: долг {debt_ratio}% | ставка {loan_rate}% | маржа {margin}% | "
            f"сотрудники: {employees} | импорт-зависимость: {import_dep}%\n"
            f"ЮРИДИКА: {legal} | налоговый режим: {tax}\n"
            f"РЫНОК: доля {market_share}% | конкуренты: {competitors} | "
            f"рынки сбыта: {', '.join(target_markets)} | финансирование: {', '.join(funding)}\n"
            f"ПРОФИЛЬ РИСКА: {risk_profile}/10\n\n"
            f"МАКРО (ЦБУ 2025): ВВП +{macro['gdp_growth_pct']}% | "
            f"инфляция {macro['inflation_cpi_pct']}% | ставка ЦБ {macro['policy_rate_pct']}% | "
            f"USD/UZS {macro['usd_uzs_rate']}\n\n"
            f"Структура отчёта (12 разделов):\n{sections_list}"
        )

        try:
            if provider == "perplexity" and PERPLEXITY_API_KEY:
                raw = await _call_perplexity(system, user_msg)
            else:
                raw = await _call_groq(system, user_msg)

            data = _parse_json_from_text(raw)

            # Ensure 12 sections exist
            sections = data.get("sections", [])
            if len(sections) < 12:
                for i in range(len(sections), 12):
                    sections.append({
                        "number": i + 1,
                        "title": DEEP_SECTIONS[i],
                        "content": "Анализ в процессе...",
                        "charts": []
                    })

            return {
                "id": report_id,
                "request": req,
                "macro_context": macro,
                "regional_data": region_data,
                "sez_benefits": sez_data,
                "executive_summary": data.get("executive_summary", ""),
                "recommendation": data.get("recommendation", "hold"),
                "confidence_score": float(data.get("confidence_score", 50)),
                "sections": sections,
                "status": "ready",
                "created_at": datetime.utcnow().isoformat(),
                "ai_model_used": GROQ_MODEL if provider == "groq" else PERPLEXITY_MODEL,
                "provider": provider,
            }

        except Exception as e:
            logger.error(f"Full market analysis error: {e}")
            return {
                "id": report_id,
                "request": req,
                "macro_context": macro,
                "regional_data": region_data,
                "sez_benefits": sez_data,
                "executive_summary": f"Ошибка генерации: {str(e)}",
                "recommendation": "hold",
                "confidence_score": 0.0,
                "sections": [{"number": i+1, "title": s, "content": "", "charts": []} for i, s in enumerate(DEEP_SECTIONS)],
                "status": "error",
                                "created_at": datetime.utcnow().isoformat(),
                "ai_model_used": None,
                "provider": provider,
            }
