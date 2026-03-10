"""
Мультипровайдерный AI-сервис — оркестрация Groq + Gemini + Ollama.

Архитектура: AI Gateway → выбор провайдера по типу задачи → fallback при ошибке.
Провайдеры:
  - Groq (Llama 3) — основной, быстрый вывод, общий анализ
  - Google Gemini — мультимодальный, глубокий анализ документов
  - Ollama — on-premise, обработка конфиденциальных данных без облака

Принцип оркестрации: НЕ дублировать запросы всем моделям.
Каждый провайдер обрабатывает свою специализацию.
При отказе основного провайдера — автоматический fallback на следующий.
"""

import asyncio
import logging
from enum import Enum
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Провайдеры ──────────────────────────────────────────────────────────────


class AIProvider(str, Enum):
    """Доступные AI-провайдеры."""
    GROQ = "groq"
    GEMINI = "gemini"
    OLLAMA = "ollama"


# ─── Ленивая инициализация клиентов ──────────────────────────────────────────

# Кэш клиентов (создаются один раз при первом вызове)
_groq_client = None
_gemini_model = None
_ollama_client = None


def _get_groq_client():
    """
    Получение клиента Groq (OpenAI-совместимый API).

    Использует openai.OpenAI с base_url Groq.
    Ленивая инициализация — клиент создаётся при первом вызове.
    """
    global _groq_client
    if _groq_client is not None:
        return _groq_client

    try:
        from openai import OpenAI

        if not settings.GROQ_API_KEY:
            logger.warning("GROQ_API_KEY не задан — Groq недоступен")
            return None

        _groq_client = OpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
        )
        logger.info("Groq клиент инициализирован (модель: %s)", settings.GROQ_MODEL)
        return _groq_client

    except ImportError:
        logger.error("Пакет openai не установлен — Groq недоступен")
        return None
    except Exception as e:
        logger.error("Ошибка инициализации Groq: %s", e)
        return None


def _get_gemini_model():
    """
    Получение модели Google Gemini.

    Использует google.generativeai. Если пакет не установлен — Gemini недоступен.
    Ленивая инициализация.
    """
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model

    try:
        import google.generativeai as genai

        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY не задан — Gemini недоступен")
            return None

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
        logger.info("Gemini модель инициализирована (%s)", settings.GEMINI_MODEL)
        return _gemini_model

    except ImportError:
        logger.warning("Пакет google-generativeai не установлен — Gemini недоступен")
        return None
    except Exception as e:
        logger.error("Ошибка инициализации Gemini: %s", e)
        return None


def _get_ollama_client():
    """
    Получение клиента Ollama (OpenAI-совместимый API).

    Ollama предоставляет OpenAI-совместимый эндпоинт на /v1.
    Ленивая инициализация.
    """
    global _ollama_client
    if _ollama_client is not None:
        return _ollama_client

    try:
        from openai import OpenAI

        base_url = settings.OLLAMA_URL.rstrip("/") + "/v1"
        _ollama_client = OpenAI(
            api_key="ollama",
            base_url=base_url,
        )
        logger.info("Ollama клиент инициализирован (%s)", settings.OLLAMA_MODEL)
        return _ollama_client

    except ImportError:
        logger.error("Пакет openai не установлен — Ollama недоступен")
        return None
    except Exception as e:
        logger.error("Ошибка инициализации Ollama: %s", e)
        return None


# ─── Обратная совместимость ───────────────────────────────────────────────────


def get_groq_client():
    """
    Обратная совместимость: возвращает OpenAI-клиент для Groq.

    .. deprecated::
        Используйте функции публичного API (analyze_market, ask_ai_gateway и др.)
    """
    return _get_groq_client()


# ─── Проверка доступности провайдера ──────────────────────────────────────────


async def _check_provider_available(provider: AIProvider) -> bool:
    """
    Проверка доступности AI-провайдера.

    Для облачных провайдеров проверяет наличие API-ключа.
    Для Ollama — проверяет доступность сервиса через HTTP.

    Args:
        provider: Провайдер для проверки.

    Returns:
        True если провайдер доступен.
    """
    if provider == AIProvider.GROQ:
        return bool(settings.GROQ_API_KEY) and _get_groq_client() is not None

    elif provider == AIProvider.GEMINI:
        return bool(settings.GEMINI_API_KEY) and _get_gemini_model() is not None

    elif provider == AIProvider.OLLAMA:
        # Ollama может не быть запущен — делаем быструю проверку
        try:
            import httpx
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(settings.OLLAMA_URL.rstrip("/") + "/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    return False


# ─── Вызов провайдера ────────────────────────────────────────────────────────


async def _call_provider(
    provider: AIProvider,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 800,
) -> str:
    """
    Вызов конкретного AI-провайдера.

    Оборачивает синхронные SDK-вызовы в asyncio.to_thread().
    При ошибке возвращает пустую строку и логирует проблему.

    Args:
        provider: Какой провайдер вызвать.
        system_prompt: Системный промпт (роль модели).
        user_prompt: Пользовательский запрос.
        max_tokens: Максимальная длина ответа.

    Returns:
        Текст ответа модели или пустая строка при ошибке.
    """
    try:
        if provider == AIProvider.GROQ:
            return await _call_groq(system_prompt, user_prompt, max_tokens)

        elif provider == AIProvider.GEMINI:
            return await _call_gemini(system_prompt, user_prompt, max_tokens)

        elif provider == AIProvider.OLLAMA:
            return await _call_ollama(system_prompt, user_prompt, max_tokens)

    except Exception as e:
        logger.error("Ошибка вызова провайдера %s: %s", provider.value, e)

    return ""


async def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    """Вызов Groq API через OpenAI-совместимый клиент."""
    client = _get_groq_client()
    if not client:
        return ""

    def _sync_call():
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    result = await asyncio.to_thread(_sync_call)
    logger.info("Groq (%s): ответ получен (%d символов)", settings.GROQ_MODEL, len(result))
    return result


async def _call_gemini(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    """Вызов Google Gemini API."""
    model = _get_gemini_model()
    if not model:
        return ""

    # Gemini принимает единый промпт (system + user объединяем)
    combined_prompt = f"{system_prompt}\n\n{user_prompt}"

    def _sync_call():
        response = model.generate_content(
            combined_prompt,
            generation_config={"max_output_tokens": max_tokens},
        )
        return response.text or ""

    result = await asyncio.to_thread(_sync_call)
    logger.info("Gemini (%s): ответ получен (%d символов)", settings.GEMINI_MODEL, len(result))
    return result


async def _call_ollama(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    """Вызов Ollama через OpenAI-совместимый эндпоинт."""
    client = _get_ollama_client()
    if not client:
        return ""

    def _sync_call():
        response = client.chat.completions.create(
            model=settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    result = await asyncio.to_thread(_sync_call)
    logger.info("Ollama (%s): ответ получен (%d символов)", settings.OLLAMA_MODEL, len(result))
    return result


# ─── Fallback-цепочка ────────────────────────────────────────────────────────


async def _call_with_fallback(
    providers: list[AIProvider],
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 800,
) -> tuple[str, AIProvider | None]:
    """
    Вызов AI с автоматическим fallback по цепочке провайдеров.

    Пробует провайдеров по порядку. Возвращает первый успешный ответ
    и какой провайдер ответил.

    Args:
        providers: Упорядоченный список провайдеров (первый — приоритетный).
        system_prompt: Системный промпт.
        user_prompt: Пользовательский запрос.
        max_tokens: Максимальная длина ответа.

    Returns:
        Кортеж (текст_ответа, провайдер) или ("", None) если все упали.
    """
    for i, provider in enumerate(providers):
        # Проверяем доступность перед вызовом
        available = await _check_provider_available(provider)
        if not available:
            logger.warning(
                "Провайдер %s недоступен, пропускаем (fallback %d/%d)",
                provider.value, i + 1, len(providers),
            )
            continue

        result = await _call_provider(provider, system_prompt, user_prompt, max_tokens)
        if result:
            if i > 0:
                logger.info(
                    "Использован fallback: %s (основной %s недоступен)",
                    provider.value, providers[0].value,
                )
            return result, provider

    logger.error("Все AI-провайдеры недоступны: %s", [p.value for p in providers])
    return "", None


def _get_model_name(provider: AIProvider | None) -> str:
    """Получение имени модели по провайдеру."""
    if provider == AIProvider.GROQ:
        return settings.GROQ_MODEL
    elif provider == AIProvider.GEMINI:
        return settings.GEMINI_MODEL
    elif provider == AIProvider.OLLAMA:
        return settings.OLLAMA_MODEL
    return "unknown"


# ─── Системные промпты ───────────────────────────────────────────────────────

_SYSTEM_PROMPT_ANALYST = (
    "Ты профессиональный инвестиционный аналитик, специализирующийся на рынках "
    "Узбекистана и Центральной Азии. Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке. "
    "Будь конкретным и практичным."
)

_SYSTEM_PROMPT_DD = (
    "Ты профессиональный финансовый аналитик по соответствию нормативным требованиям, "
    "специализирующийся на рынках Центральной Азии. Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке. "
    "Никогда не используй английский язык."
)

_SYSTEM_PROMPT_ADVISOR = (
    "Ты профессиональный инвестиционный советник. Отвечай ТОЛЬКО на русском языке. "
    "Будь кратким и конкретным."
)

_SYSTEM_PROMPT_GENERAL = (
    "Ты AI-ассистент для инвестиционной платформы в Узбекистане. "
    "Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке. Будь точным и полезным."
)


# ─── Публичный API: специализированные функции ────────────────────────────────


async def get_investment_recommendation(
    asset_name: str,
    asset_symbol: str,
    current_price: float,
    portfolio_value: float,
) -> dict:
    """
    Рекомендация КУПИТЬ/ПРОДАТЬ/ДЕРЖАТЬ для актива.

    Цепочка провайдеров: Groq → Gemini → Ollama.
    Groq — основной (быстрый ответ для инвест-решений).

    Args:
        asset_name: Название актива.
        asset_symbol: Тикер/символ актива.
        current_price: Текущая цена.
        portfolio_value: Общая стоимость портфеля.

    Returns:
        Словарь с рекомендацией, провайдером и моделью.
    """
    user_prompt = (
        f"Актив: {asset_name} ({asset_symbol}), Цена: ${current_price}, "
        f"Портфель: ${portfolio_value}. "
        f"Дай рекомендацию КУПИТЬ/ПРОДАТЬ/ДЕРЖАТЬ с обоснованием в 2-3 предложениях."
    )

    providers = [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA]

    result, provider = await _call_with_fallback(
        providers, _SYSTEM_PROMPT_ADVISOR, user_prompt, max_tokens=300,
    )

    return {
        "result": result or "AI-сервис временно недоступен. Повторите позже.",
        "provider": provider.value if provider else None,
        "model": _get_model_name(provider),
        "fallback_used": provider is not None and provider != providers[0],
    }


async def analyze_market(query: str, language: str = "ru") -> dict:
    """
    Анализ рынка Узбекистана / Центральной Азии.

    Цепочка провайдеров: Groq → Gemini.
    Groq — основной (быстрый анализ рынка).

    Args:
        query: Запрос пользователя (что анализировать).
        language: Язык ответа (по умолчанию русский).

    Returns:
        Словарь с анализом, провайдером и моделью.
    """
    user_prompt = (
        f"Пользователь спрашивает о: {query}\n\n"
        f"Предоставь детальный инвестиционный анализ, включая:\n"
        f"1. Текущий обзор рынка\n"
        f"2. Уровни цен (приблизительно)\n"
        f"3. Инвестиционный потенциал (ВЫСОКИЙ/СРЕДНИЙ/НИЗКИЙ)\n"
        f"4. Ключевые риски\n"
        f"5. Рекомендация: ИНВЕСТИРОВАТЬ / ЖДАТЬ / ИЗБЕГАТЬ\n\n"
        f"Будь конкретным и практичным для условий рынка Узбекистана."
    )

    providers = [AIProvider.GROQ, AIProvider.GEMINI]

    result, provider = await _call_with_fallback(
        providers, _SYSTEM_PROMPT_ANALYST, user_prompt, max_tokens=800,
    )

    return {
        "result": result or "AI-сервис временно недоступен. Повторите позже.",
        "provider": provider.value if provider else None,
        "model": _get_model_name(provider),
        "fallback_used": provider is not None and provider != providers[0],
    }


async def due_diligence_check(
    company_name: str,
    industry: str = "",
    country: str = "Uzbekistan",
) -> dict:
    """
    AI Due Diligence — проверка компании/отрасли.

    Цепочка провайдеров: Gemini → Groq.
    Gemini — основной (лучше для структурированного анализа и документов).

    Args:
        company_name: Название компании или отрасли.
        industry: Сектор экономики.
        country: Страна.

    Returns:
        Словарь с отчётом due diligence, провайдером и моделью.
    """
    user_prompt = (
        f"Проведи анализ для инвестиционного Due Diligence:\n"
        f"Компания/Отрасль: {company_name}\n"
        f"Сектор: {industry}\n"
        f"Страна: {country}\n\n"
        f"Предоставь структурированный отчёт СТРОГО НА РУССКОМ ЯЗЫКЕ:\n\n"
        f"1. ФИНАНСОВАЯ ПРОЗРАЧНОСТЬ (0-100 баллов)\n"
        f"   - Доступность финансовой отчётности\n"
        f"   - Признаки теневой деятельности\n"
        f"   - Налоговая дисциплина\n\n"
        f"2. РЕГУЛЯТОРНЫЕ РИСКИ (0-100 баллов)\n"
        f"   - Соответствие законодательству Узбекистана\n"
        f"   - Лицензирование и разрешения\n"
        f"   - Государственное регулирование отрасли\n\n"
        f"3. РЫНОЧНАЯ РЕПУТАЦИЯ (0-100 баллов)\n"
        f"   - Присутствие на рынке\n"
        f"   - Конкурентная среда\n"
        f"   - Деловая репутация\n\n"
        f"4. ESG ОЦЕНКА (0-100 баллов)\n"
        f"   - Экологические риски\n"
        f"   - Социальная ответственность\n"
        f"   - Корпоративное управление\n\n"
        f"5. ИТОГОВЫЙ ВЕРДИКТ\n"
        f"   - Общий скоринг (0-100)\n"
        f"   - Статус: НАДЁЖНО (75-100) / ОСТОРОЖНО (40-74) / ВЫСОКИЙ РИСК (0-39)\n"
        f"   - Рекомендация для инвестора\n\n"
        f"Будь конкретным."
    )

    # Gemini — основной для DD (лучше структурированный анализ)
    providers = [AIProvider.GEMINI, AIProvider.GROQ]

    result, provider = await _call_with_fallback(
        providers, _SYSTEM_PROMPT_DD, user_prompt, max_tokens=1000,
    )

    # Определяем статус из текста ответа
    status = "ОСТОРОЖНО"
    if result:
        result_upper = result.upper()
        if "НАДЁЖНО" in result_upper or "НАДЕЖНО" in result_upper:
            status = "НАДЁЖНО"
        elif "ВЫСОКИЙ РИСК" in result_upper:
            status = "ВЫСОКИЙ РИСК"

    return {
        "result": result or "AI-сервис временно недоступен. Повторите позже.",
        "status": status,
        "provider": provider.value if provider else None,
        "model": _get_model_name(provider),
        "fallback_used": provider is not None and provider != providers[0],
    }


async def ask_ai_gateway(
    question: str,
    context: str = "",
    task_type: str = "general",
) -> dict:
    """
    Единый вход AI Gateway — маршрутизация по типу задачи.

    Автоматически выбирает оптимального провайдера и fallback-цепочку
    в зависимости от типа задачи.

    Маршрутизация:
    - "investment", "market_analysis" → Groq → Gemini (быстрый анализ)
    - "due_diligence", "document_analysis" → Gemini → Groq (глубокий анализ)
    - "private" → Ollama → Groq (конфиденциальные данные)
    - "general" → Groq → Gemini (общие вопросы)

    Args:
        question: Вопрос пользователя.
        context: Дополнительный контекст (опционально).
        task_type: Тип задачи для маршрутизации.

    Returns:
        Словарь с ответом, провайдером, моделью и информацией о fallback.
    """
    # Маршрутизация: выбор цепочки провайдеров по типу задачи
    route_map = {
        "investment": [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA],
        "market_analysis": [AIProvider.GROQ, AIProvider.GEMINI],
        "due_diligence": [AIProvider.GEMINI, AIProvider.GROQ],
        "document_analysis": [AIProvider.GEMINI, AIProvider.GROQ],
        "private": [AIProvider.OLLAMA, AIProvider.GROQ],
        "general": [AIProvider.GROQ, AIProvider.GEMINI, AIProvider.OLLAMA],
    }

    providers = route_map.get(task_type, route_map["general"])

    # Выбор системного промпта по типу задачи
    prompt_map = {
        "investment": _SYSTEM_PROMPT_ADVISOR,
        "market_analysis": _SYSTEM_PROMPT_ANALYST,
        "due_diligence": _SYSTEM_PROMPT_DD,
        "document_analysis": _SYSTEM_PROMPT_DD,
        "private": _SYSTEM_PROMPT_GENERAL,
        "general": _SYSTEM_PROMPT_GENERAL,
    }

    system_prompt = prompt_map.get(task_type, _SYSTEM_PROMPT_GENERAL)

    # Формируем пользовательский промпт
    user_prompt = question
    if context:
        user_prompt = f"Контекст: {context}\n\nВопрос: {question}"

    max_tokens = 1000 if task_type in ("due_diligence", "document_analysis") else 800

    result, provider = await _call_with_fallback(
        providers, system_prompt, user_prompt, max_tokens=max_tokens,
    )

    return {
        "result": result or "AI-сервис временно недоступен. Повторите позже.",
        "provider": provider.value if provider else None,
        "model": _get_model_name(provider),
        "task_type": task_type,
        "fallback_used": provider is not None and provider != providers[0],
    }


# ─── Мониторинг провайдеров ──────────────────────────────────────────────────


async def get_provider_status() -> list[dict]:
    """
    Статус всех AI-провайдеров для мониторинга.

    Проверяет доступность каждого провайдера и возвращает
    список с информацией о статусе, модели и роли.

    Returns:
        Список словарей с информацией о каждом провайдере.
    """
    providers_info = [
        {
            "provider": AIProvider.GROQ.value,
            "role": "Основной — быстрый анализ и генерация гипотез",
            "model": settings.GROQ_MODEL,
            "has_key": bool(settings.GROQ_API_KEY),
        },
        {
            "provider": AIProvider.GEMINI.value,
            "role": "Мультимодальный — глубокий анализ документов",
            "model": settings.GEMINI_MODEL,
            "has_key": bool(settings.GEMINI_API_KEY),
        },
        {
            "provider": AIProvider.OLLAMA.value,
            "role": "On-premise — обработка конфиденциальных данных",
            "model": settings.OLLAMA_MODEL,
            "has_key": True,  # Ollama не требует ключа
        },
    ]

    # Проверяем доступность каждого провайдера параллельно
    checks = await asyncio.gather(
        _check_provider_available(AIProvider.GROQ),
        _check_provider_available(AIProvider.GEMINI),
        _check_provider_available(AIProvider.OLLAMA),
        return_exceptions=True,
    )

    for i, check_result in enumerate(checks):
        if isinstance(check_result, Exception):
            providers_info[i]["available"] = False
            providers_info[i]["error"] = str(check_result)
        else:
            providers_info[i]["available"] = bool(check_result)

    return providers_info
