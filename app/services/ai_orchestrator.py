"""
AI-оркестратор — маршрутизация запросов к оптимальному провайдеру.

Правила маршрутизации:
  - Groq: быстрые вопросы, чат, простые расчёты (< 3 сек)
  - Gemini: документы, сложный многоэтапный анализ
  - Ollama: конфиденциальные данные, локальная обработка
"""

import logging
import time
from enum import StrEnum
from typing import Any

from app.services.ai_service import (
    AIProvider,
    _call_provider,
    _check_provider_available,
    _get_model_name,
)

logger = logging.getLogger(__name__)

# ─── Типы запросов и маршрутизация ────────────────────────────────────────────


class RequestType(StrEnum):
    QUICK_ANALYSIS = "quick_analysis"
    CHAT = "chat"
    DOCUMENT_ANALYSIS = "document_analysis"
    DEEP_ANALYSIS = "deep_analysis"
    PRIVATE = "private"
    MARKET_OVERVIEW = "market_overview"
    CALCULATION = "calculation"


# Правила маршрутизации: тип запроса → упорядоченный список провайдеров
ROUTING_RULES: dict[RequestType, list[AIProvider]] = {
    RequestType.QUICK_ANALYSIS: [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA],
    RequestType.CHAT: [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA],
    RequestType.DOCUMENT_ANALYSIS: [AIProvider.GEMINI, AIProvider.GROQ, AIProvider.OLLAMA],
    RequestType.DEEP_ANALYSIS: [AIProvider.GEMINI, AIProvider.GROQ, AIProvider.OLLAMA],
    RequestType.PRIVATE: [AIProvider.OLLAMA, AIProvider.GROQ],
    RequestType.MARKET_OVERVIEW: [AIProvider.GROQ, AIProvider.GEMINI],
    RequestType.CALCULATION: [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA],
}

# Системные промпты по типу запроса
SYSTEM_PROMPTS: dict[RequestType, str] = {
    RequestType.QUICK_ANALYSIS: (
        "Ты инвестиционный аналитик. Дай краткий, точный ответ на русском языке. "
        "Будь конкретным и практичным."
    ),
    RequestType.CHAT: (
        "Ты AI-ассистент инвестиционной платформы. Отвечай на русском языке. "
        "Будь дружелюбным и полезным."
    ),
    RequestType.DOCUMENT_ANALYSIS: (
        "Ты аналитик документов. Извлекай ключевую информацию, структурируй данные. "
        "Отвечай на русском языке подробно и точно."
    ),
    RequestType.DEEP_ANALYSIS: (
        "Ты старший инвестиционный аналитик. Проведи глубокий анализ. "
        "Учитывай макроэкономику Узбекистана. Отвечай на русском языке."
    ),
    RequestType.PRIVATE: (
        "Ты AI-ассистент для работы с конфиденциальными данными. "
        "Отвечай на русском языке. Не передавай данные за пределы системы."
    ),
    RequestType.MARKET_OVERVIEW: (
        "Ты аналитик рынков Центральной Азии. Дай обзор текущей ситуации "
        "и тренды. Отвечай на русском языке."
    ),
    RequestType.CALCULATION: (
        "Ты финансовый калькулятор. Выполни расчёты точно. "
        "Покажи формулы и промежуточные результаты. Отвечай на русском."
    ),
}

# Ключевые слова для автоматического определения типа запроса
REQUEST_TYPE_KEYWORDS: dict[RequestType, list[str]] = {
    RequestType.DOCUMENT_ANALYSIS: [
        "документ", "pdf", "файл", "отчёт", "анализ документа",
        "document", "file", "report",
    ],
    RequestType.DEEP_ANALYSIS: [
        "подробный анализ", "глубокий анализ", "due diligence",
        "инвестиционный анализ", "комплексный",
        "detailed", "deep analysis", "comprehensive",
    ],
    RequestType.PRIVATE: [
        "конфиденциально", "приватно", "секретно", "private", "confidential",
    ],
    RequestType.MARKET_OVERVIEW: [
        "рынок", "обзор рынка", "тренд", "market", "overview",
    ],
    RequestType.CALCULATION: [
        "рассчитай", "калькул", "npv", "irr", "roi", "calculate",
        "сколько", "формула",
    ],
}


def detect_request_type(query: str) -> RequestType:
    """
    Автоматическое определение типа запроса по ключевым словам.

    Args:
        query: Текст запроса пользователя.

    Returns:
        Определённый тип запроса.
    """
    query_lower = query.lower()

    # Проверяем ключевые слова (порядок важен — более специфичные первые)
    for req_type in [
        RequestType.PRIVATE,
        RequestType.DOCUMENT_ANALYSIS,
        RequestType.DEEP_ANALYSIS,
        RequestType.CALCULATION,
        RequestType.MARKET_OVERVIEW,
    ]:
        keywords = REQUEST_TYPE_KEYWORDS.get(req_type, [])
        if any(kw in query_lower for kw in keywords):
            return req_type

    # По умолчанию — быстрый анализ через Groq
    if len(query) < 200:
        return RequestType.CHAT
    return RequestType.QUICK_ANALYSIS


async def route_request(
    query: str,
    request_type: str | None = None,
    prefer_provider: str | None = None,
    max_tokens: int = 800,
) -> dict[str, Any]:
    """
    Маршрутизация запроса к оптимальному AI-провайдеру.

    Args:
        query: Запрос пользователя.
        request_type: Явный тип запроса (если не указан — автоопределение).
        prefer_provider: Предпочтительный провайдер (если указан).
        max_tokens: Максимальная длина ответа.

    Returns:
        Словарь с ответом, провайдером, временем, метаданными.
    """
    # Определяем тип запроса
    if request_type:
        try:
            req_type = RequestType(request_type)
        except ValueError:
            req_type = detect_request_type(query)
    else:
        req_type = detect_request_type(query)

    # Получаем цепочку провайдеров
    providers = list(ROUTING_RULES.get(req_type, ROUTING_RULES[RequestType.CHAT]))

    # Если указан предпочтительный провайдер — ставим его первым
    if prefer_provider:
        try:
            pref = AIProvider(prefer_provider)
            if pref in providers:
                providers.remove(pref)
            providers.insert(0, pref)
        except ValueError:
            pass

    system_prompt = SYSTEM_PROMPTS.get(req_type, SYSTEM_PROMPTS[RequestType.CHAT])

    # Маршрутизация с fallback
    start_time = time.time()
    result = ""
    used_provider: AIProvider | None = None
    fallback_used = False
    attempts: list[dict[str, Any]] = []

    for i, provider in enumerate(providers):
        attempt_start = time.time()
        available = await _check_provider_available(provider)

        if not available:
            attempts.append({
                "provider": provider.value,
                "status": "unavailable",
                "duration_ms": round((time.time() - attempt_start) * 1000),
            })
            continue

        try:
            result = await _call_provider(
                provider, system_prompt, query, max_tokens,
            )
            attempt_duration = time.time() - attempt_start

            if result:
                used_provider = provider
                fallback_used = i > 0
                attempts.append({
                    "provider": provider.value,
                    "status": "success",
                    "duration_ms": round(attempt_duration * 1000),
                })
                break

            attempts.append({
                "provider": provider.value,
                "status": "empty_response",
                "duration_ms": round(attempt_duration * 1000),
            })
        except Exception as e:
            attempts.append({
                "provider": provider.value,
                "status": "error",
                "error": str(e),
                "duration_ms": round((time.time() - attempt_start) * 1000),
            })

    total_duration = time.time() - start_time

    logger.info(
        "Оркестратор: тип=%s, провайдер=%s, fallback=%s, время=%.2fс",
        req_type.value,
        used_provider.value if used_provider else "none",
        fallback_used,
        total_duration,
    )

    return {
        "result": result or "AI-сервис временно недоступен. Попробуйте позже.",
        "provider": used_provider.value if used_provider else None,
        "model": _get_model_name(used_provider),
        "request_type": req_type.value,
        "request_type_detected": request_type is None,
        "fallback_used": fallback_used,
        "duration_ms": round(total_duration * 1000),
        "attempts": attempts,
    }
