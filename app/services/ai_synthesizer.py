"""
AI-синтезатор — дедупликация и объединение ответов от нескольких провайдеров.

Принимает ответы от нескольких AI-провайдеров, удаляет дублирующую информацию,
объединяет уникальные инсайты в единый структурированный ответ.
"""

import asyncio
import logging
import time
from typing import Any

from app.services.ai_service import (
    AIProvider,
    _call_provider,
    _check_provider_available,
    _get_model_name,
)

logger = logging.getLogger(__name__)

# Системный промпт для синтеза
_SYNTHESIS_SYSTEM_PROMPT = (
    "Ты инвестиционный аналитик. Отвечай на русском языке. "
    "Будь конкретным, практичным, структурированным."
)

# Промпт для синтеза нескольких ответов
_MERGE_PROMPT_TEMPLATE = (
    "Ты AI-синтезатор. Тебе даны ответы от нескольких AI-моделей "
    "на один вопрос. Объедини их в ОДИН структурированный ответ:\n\n"
    "1. Убери дублирующую информацию\n"
    "2. Сохрани все уникальные инсайты\n"
    "3. Выдели главный вывод\n"
    "4. Укажи уровень согласия между моделями\n\n"
    "Вопрос пользователя: {query}\n\n"
    "{responses}\n\n"
    "Дай объединённый ответ на русском языке."
)


def _compute_agreement_score(responses: list[str]) -> float:
    """
    Оценка уровня согласия между ответами провайдеров.

    Простой алгоритм: проверяет наличие общих ключевых слов/фраз.
    Возвращает 0.0-1.0.
    """
    if len(responses) < 2:
        return 1.0

    # Извлекаем наборы слов (длиной > 4 символов)
    word_sets = []
    for resp in responses:
        words = set(
            w.lower().strip(".,!?;:()\"'")
            for w in resp.split()
            if len(w) > 4
        )
        word_sets.append(words)

    # Попарная пересечение
    total_overlap = 0.0
    comparisons = 0
    for i in range(len(word_sets)):
        for j in range(i + 1, len(word_sets)):
            union = word_sets[i] | word_sets[j]
            if union:
                intersection = word_sets[i] & word_sets[j]
                total_overlap += len(intersection) / len(union)
            comparisons += 1

    if comparisons == 0:
        return 1.0

    return round(total_overlap / comparisons, 4)


def _extract_key_points(text: str) -> list[str]:
    """Извлекает ключевые пункты из текста ответа."""
    lines = text.strip().split("\n")
    points = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Пункты списка или предложения
        if (
            line.startswith(("- ", "• ", "* ", "1", "2", "3", "4", "5"))
            or (len(line) > 20 and line[0].isupper())
        ):
            # Убираем маркеры списка
            clean = line.lstrip("-•* 0123456789.)")
            if clean and len(clean) > 10:
                points.append(clean.strip())
    # Если не нашли структурированных пунктов, берём предложения
    if not points:
        sentences = text.replace("\n", " ").split(".")
        points = [s.strip() for s in sentences if len(s.strip()) > 20][:5]
    return points


def _deduplicate_points(
    all_points: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Дедупликация ключевых пунктов от разных провайдеров.

    Удаляет пункты с высокой степенью пересечения слов.
    """
    if not all_points:
        return []

    unique: list[dict[str, Any]] = []
    seen_word_sets: list[set] = []

    for point in all_points:
        words = set(
            w.lower().strip(".,!?;:()\"'")
            for w in point["text"].split()
            if len(w) > 3
        )

        # Проверяем дубликат
        is_duplicate = False
        for seen in seen_word_sets:
            if not words or not seen:
                continue
            overlap = len(words & seen) / max(len(words), len(seen))
            if overlap > 0.6:
                is_duplicate = True
                break

        if not is_duplicate:
            unique.append(point)
            seen_word_sets.append(words)

    return unique


async def synthesize_responses(
    query: str,
    provider_names: list[str] | None = None,
    max_tokens: int = 800,
) -> dict[str, Any]:
    """
    Синтез ответов от нескольких AI-провайдеров.

    Args:
        query: Запрос пользователя.
        provider_names: Список провайдеров (если None — все доступные).
        max_tokens: Максимальная длина ответа каждого провайдера.

    Returns:
        Синтезированный ответ с атрибуцией источников.
    """
    start_time = time.time()

    # Определяем провайдеров
    if provider_names:
        providers = []
        for name in provider_names:
            try:
                providers.append(AIProvider(name))
            except ValueError:
                logger.warning("Неизвестный провайдер: %s", name)
    else:
        providers = [AIProvider.GROQ, AIProvider.GEMINI]

    # Проверяем доступность параллельно
    availability = await asyncio.gather(
        *[_check_provider_available(p) for p in providers],
        return_exceptions=True,
    )

    available_providers = [
        p for p, avail in zip(providers, availability)
        if avail is True
    ]

    if not available_providers:
        return {
            "synthesis": "Все AI-провайдеры временно недоступны.",
            "providers_used": [],
            "agreement_score": 0,
            "confidence_level": "low",
            "duration_ms": round((time.time() - start_time) * 1000),
        }

    # Запрашиваем ответы параллельно
    tasks = [
        _call_provider(p, _SYNTHESIS_SYSTEM_PROMPT, query, max_tokens)
        for p in available_providers
    ]
    raw_responses = await asyncio.gather(*tasks, return_exceptions=True)

    # Собираем успешные ответы
    provider_responses: list[dict[str, Any]] = []
    for provider, response in zip(available_providers, raw_responses):
        if isinstance(response, Exception):
            logger.error("Ошибка от %s: %s", provider.value, response)
            continue
        if response:
            provider_responses.append({
                "provider": provider.value,
                "model": _get_model_name(provider),
                "response": response,
            })

    if not provider_responses:
        return {
            "synthesis": "Не удалось получить ответы от AI-провайдеров.",
            "providers_used": [],
            "agreement_score": 0,
            "confidence_level": "low",
            "duration_ms": round((time.time() - start_time) * 1000),
        }

    # Если только один провайдер ответил — возвращаем как есть
    if len(provider_responses) == 1:
        resp = provider_responses[0]
        return {
            "synthesis": resp["response"],
            "main_conclusion": resp["response"][:200],
            "providers_used": [resp["provider"]],
            "models_used": [resp["model"]],
            "agreement_score": 1.0,
            "confidence_level": "medium",
            "source_attribution": [
                {
                    "provider": resp["provider"],
                    "contribution": "Единственный доступный провайдер",
                }
            ],
            "duration_ms": round((time.time() - start_time) * 1000),
        }

    # Извлекаем ключевые пункты от каждого провайдера
    all_points: list[dict[str, Any]] = []
    for resp in provider_responses:
        points = _extract_key_points(resp["response"])
        for pt in points:
            all_points.append({
                "text": pt,
                "provider": resp["provider"],
            })

    # Дедуплицируем
    unique_points = _deduplicate_points(all_points)

    # Оценка согласия
    responses_text = [r["response"] for r in provider_responses]
    agreement = _compute_agreement_score(responses_text)

    # Уровень уверенности на основе согласия
    if agreement > 0.5:
        confidence_level = "high"
        confidence_ru = "Высокий"
    elif agreement > 0.25:
        confidence_level = "medium"
        confidence_ru = "Средний"
    else:
        confidence_level = "low"
        confidence_ru = "Низкий"

    # Формируем синтезированный ответ
    # Используем первый (основной) провайдер как базу
    base_response = provider_responses[0]["response"]

    # Добавляем уникальные инсайты от других провайдеров
    additional_insights = [
        pt["text"] for pt in unique_points
        if pt["provider"] != provider_responses[0]["provider"]
    ]

    synthesis_parts = [base_response]
    if additional_insights:
        synthesis_parts.append(
            "\n\nДополнительные инсайты:\n"
            + "\n".join(f"• {insight}" for insight in additional_insights[:5])
        )

    synthesis = "\n".join(synthesis_parts)

    # Атрибуция источников
    source_attribution = []
    for resp in provider_responses:
        provider_points = [
            pt["text"][:80] for pt in unique_points
            if pt["provider"] == resp["provider"]
        ]
        source_attribution.append({
            "provider": resp["provider"],
            "model": resp["model"],
            "unique_points_count": len(provider_points),
            "sample_points": provider_points[:3],
        })

    total_duration = time.time() - start_time

    logger.info(
        "Синтез: %d провайдеров, согласие=%.2f, уверенность=%s, время=%.2fс",
        len(provider_responses),
        agreement,
        confidence_level,
        total_duration,
    )

    return {
        "synthesis": synthesis,
        "main_conclusion": base_response[:300],
        "providers_used": [r["provider"] for r in provider_responses],
        "models_used": [r["model"] for r in provider_responses],
        "agreement_score": agreement,
        "agreement_description": (
            f"Уровень согласия: {confidence_ru} ({agreement:.0%})"
        ),
        "confidence_level": confidence_level,
        "unique_points": [
            {"text": pt["text"], "source": pt["provider"]}
            for pt in unique_points[:10]
        ],
        "source_attribution": source_attribution,
        "total_points_before_dedup": len(all_points),
        "unique_points_after_dedup": len(unique_points),
        "duration_ms": round(total_duration * 1000),
    }
