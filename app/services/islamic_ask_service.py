"""
Islamic Ask Service — free-form Q&A about Islamic finance.
Uses AI service (Groq/Gemini/Ollama) with Islamic finance system prompt.
"""
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.islamic_ask import (
    IslamicAskRequest,
    IslamicAskResponse,
    SourceReference,
)

logger = logging.getLogger(__name__)

# System prompt for Islamic finance Q&A
ISLAMIC_FINANCE_SYSTEM_PROMPT = """Вы — эксперт по исламским финансам. Отвечайте на вопросы пользователя строго
в рамках исламских финансов, шариатских стандартов AAOIFI и IFSB, а также
законодательства Узбекистана в области исламского банкинга.

Правила:
1. Отвечайте на языке пользователя (русский/английский/узбекский).
2. Ссылайтесь на конкретные стандарты AAOIFI (SS, FAS, GS) и IFSB, где возможно.
3. Объясняйте термины простым языком с арабским оригиналом в скобках.
4. Если вопрос выходит за рамки исламских финансов — вежливо откажитесь.
5. Всегда добавляйте дисклеймер: ваш ответ — информационный, не является фетвой.
6. Структурируйте ответ: определение, принцип работы, примеры, ссылки на стандарты.
"""


def ask_islamic_finance(
    request: IslamicAskRequest,
    db: Optional[Session] = None,
) -> IslamicAskResponse:
    """
    Process a free-form question about Islamic finance using AI.
    Falls back to a knowledge-base lookup if AI is unavailable.
    """
    answer = ""
    sources = []

    # Try AI-powered answer
    try:
        answer = _get_ai_answer(request.question, request.language, request.context)
    except Exception as e:
        logger.warning(f"AI service unavailable for Ask: {e}")

    # Fallback: try glossary-based answer
    if not answer and db:
        answer = _get_glossary_answer(db, request.question)

    # Final fallback
    if not answer:
        answer = _get_static_answer(request.question, request.language)

    # Add standard sources
    sources = _get_relevant_sources(request.question)

    return IslamicAskResponse(
        question=request.question,
        answer=answer,
        sources=sources,
        language=request.language,
        created_at=datetime.utcnow(),
    )


def _get_ai_answer(question: str, language: str, context: Optional[str] = None) -> str:
    """Get answer from AI service."""
    try:
        from app.services.ai_service import call_groq

        lang_instruction = {
            "ru": "Отвечайте на русском языке.",
            "en": "Respond in English.",
            "uz": "O'zbek tilida javob bering.",
        }.get(language, "Отвечайте на русском языке.")

        user_prompt = f"{lang_instruction}\n\nВопрос: {question}"
        if context:
            user_prompt += f"\n\nКонтекст: {context}"

        result = call_groq(
            system_prompt=ISLAMIC_FINANCE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=2000,
        )
        return result or ""
    except Exception as e:
        logger.error(f"AI call failed: {e}")
        return ""


def _get_glossary_answer(db: Session, question: str) -> str:
    """Try to find answer from glossary terms."""
    try:
        from app.db.models.islamic_stage1 import IslamicGlossaryTerm

        question_lower = question.lower()
        terms = db.query(IslamicGlossaryTerm).filter(
            IslamicGlossaryTerm.is_published == True
        ).all()

        for term in terms:
            if (term.term_ru and term.term_ru.lower() in question_lower) or \
               (term.slug and term.slug.replace("-", " ") in question_lower) or \
               (term.transliteration and term.transliteration.lower() in question_lower):
                result = f"**{term.term_ru}**"
                if term.term_ar:
                    result += f" ({term.term_ar})"
                if term.transliteration:
                    result += f" — {term.transliteration}"
                result += f"\n\n{term.definition_ru}"
                if term.standard_ref:
                    result += f"\n\nСтандарт: {term.standard_org} {term.standard_ref}"
                return result
    except Exception as e:
        logger.error(f"Glossary lookup failed: {e}")
    return ""


def _get_static_answer(question: str, language: str) -> str:
    """Provide a generic response when AI and glossary are unavailable."""
    if language == "en":
        return (
            "Thank you for your question about Islamic finance. "
            "Unfortunately, the AI service is temporarily unavailable. "
            "Please try again later or explore our Glossary and Products sections "
            "for information about Islamic financial instruments."
        )
    return (
        "Спасибо за ваш вопрос об исламских финансах. "
        "К сожалению, сервис ИИ временно недоступен. "
        "Пожалуйста, попробуйте позже или изучите разделы «Глоссарий» и «Продукты» "
        "для получения информации об исламских финансовых инструментах."
    )


def _get_relevant_sources(question: str) -> list:
    """Return relevant source references based on question keywords."""
    sources = []
    question_lower = question.lower()

    keyword_sources = {
        "мурабаха": SourceReference(title="AAOIFI SS No. 8 — Murabaha", standard="SS No. 8"),
        "мудараба": SourceReference(title="AAOIFI SS No. 13 — Mudaraba", standard="SS No. 13"),
        "мушарака": SourceReference(title="AAOIFI SS No. 12 — Musharaka", standard="SS No. 12"),
        "иджара": SourceReference(title="AAOIFI SS No. 9 — Ijara", standard="SS No. 9"),
        "сукук": SourceReference(title="AAOIFI SS No. 17 — Sukuk", standard="SS No. 17"),
        "закят": SourceReference(title="AAOIFI SS No. 9 — Zakat", standard="SS No. 9"),
        "скрининг": SourceReference(title="AAOIFI SS No. 62 — Shariah Screening", standard="SS No. 62"),
        "такафул": SourceReference(title="AAOIFI SS No. 26 — Takaful", standard="SS No. 26"),
        "вакф": SourceReference(title="AAOIFI SS No. 33 — Waqf", standard="SS No. 33"),
        "риба": SourceReference(title="Prohibition of Riba (Interest)", standard="Quran 2:275-280"),
        "гарар": SourceReference(title="Prohibition of Gharar (Uncertainty)", standard="Hadith"),
    }

    for keyword, source in keyword_sources.items():
        if keyword in question_lower:
            sources.append(source)

    if not sources:
        sources.append(SourceReference(
            title="AAOIFI Shariah Standards (General)",
            standard="AAOIFI",
            url="https://aaoifi.com",
        ))

    return sources
