"""
UZ Market Analysis Service — MARKET-001
Quick Ask + Deep Analysis (12-section AI report)
25 GICS sectors, AI pipeline via GROQ/Perplexity
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


# 12-section deep analysis template
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
    "Заключение"
]


async def _call_groq(system_prompt: str, user_msg: str) -> str:
    """Call GROQ API."""
    if not GROQ_API_KEY:
        return "Ошибка: GROQ_API_KEY не настроен"
    async with httpx.AsyncClient(timeout=60) as client:
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
    """Call Perplexity API for real-time data."""
    if not PERPLEXITY_API_KEY:
        return "Ошибка: PERPLEXITY_API_KEY не настроен"
    async with httpx.AsyncClient(timeout=60) as client:
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


class UZMarketAnalysisService:
    """Service for Uzbekistan market analysis."""

    @staticmethod
    def get_sectors() -> List[Dict]:
        """Return all 25 UZ sectors."""
        return UZ_SECTORS

    @staticmethod
    def get_sector_by_id(sector_id: str) -> Optional[Dict]:
        """Find sector by ID."""
        for s in UZ_SECTORS:
            if s["id"] == sector_id:
                return s
        return None

    @staticmethod
    async def quick_ask(question: str, sector: Optional[str] = None, provider: str = "groq") -> Dict[str, Any]:
        """
        Quick Ask — fast AI answer about UZ market.
        """
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
        """
        Deep Analysis — 12-section comprehensive report for a sector.
        """
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

            # Try to parse JSON from response
            try:
                start = raw.find("{")
                end = raw.rfind("}") + 1
                if start >= 0 and end > start:
                    data = json.loads(raw[start:end])
                else:
                    data = {"sections": [{"title": s, "content": "", "key_metrics": []} for s in DEEP_SECTIONS], "raw": raw}
            except json.JSONDecodeError:
                data = {"sections": [{"title": s, "content": "", "key_metrics": []} for s in DEEP_SECTIONS], "raw": raw}

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
        """
        Compare multiple sectors.
        """
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

            try:
                start = raw.find("{")
                end = raw.rfind("}") + 1
                data = json.loads(raw[start:end]) if start >= 0 else {"raw": raw}
            except json.JSONDecodeError:
                data = {"raw": raw}

            return {"comparison": data, "sectors": sectors, "provider": provider, "timestamp": datetime.utcnow().isoformat()}
        except Exception as e:
            logger.error(f"Sector compare error: {e}")
            return {"error": str(e)}
