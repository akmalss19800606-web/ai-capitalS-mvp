"""
Роутер мониторинга AI-провайдеров — health checks, circuit breaker, статистика.

Эндпоинты:
  GET  /ai-provider-health/status  — статус всех провайдеров
  GET  /ai-provider-health/stats   — статистика использования
  POST /ai-provider-health/reset   — сброс circuit breaker для провайдера
"""

import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.db.models.user import User
from app.services.ai_service import AIProvider, _check_provider_available

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-provider-health", tags=["ai-provider-health"])


# ─── Circuit Breaker (in-memory) ─────────────────────────────────────────────

# Конфигурация circuit breaker
CB_FAILURE_THRESHOLD = 3   # Количество ошибок до размыкания
CB_RECOVERY_TIMEOUT = 300  # 5 минут до повторной попытки
CB_SUCCESS_THRESHOLD = 2   # Успехов для полного восстановления


class CircuitState:
    """Состояние circuit breaker для одного провайдера."""

    def __init__(self, provider: str):
        self.provider = provider
        self.state = "closed"  # closed | open | half_open
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: float = 0
        self.total_requests = 0
        self.total_failures = 0
        self.total_successes = 0
        self.total_fallbacks = 0
        self.avg_response_ms: float = 0
        self._response_times: list = []

    def record_success(self, duration_ms: float):
        """Записать успешный вызов."""
        self.total_requests += 1
        self.total_successes += 1
        self.failure_count = 0
        self.success_count += 1

        # Обновляем среднее время ответа (скользящее окно 50)
        self._response_times.append(duration_ms)
        if len(self._response_times) > 50:
            self._response_times = self._response_times[-50:]
        self.avg_response_ms = sum(self._response_times) / len(self._response_times)

        if self.state == "half_open" and self.success_count >= CB_SUCCESS_THRESHOLD:
            self.state = "closed"
            logger.info("Circuit breaker %s: ЗАКРЫТ (восстановлен)", self.provider)

    def record_failure(self):
        """Записать неудачный вызов."""
        self.total_requests += 1
        self.total_failures += 1
        self.failure_count += 1
        self.success_count = 0
        self.last_failure_time = time.time()

        if self.failure_count >= CB_FAILURE_THRESHOLD and self.state != "open":
            self.state = "open"
            logger.warning(
                "Circuit breaker %s: ОТКРЫТ (пропуск на %dс)",
                self.provider, CB_RECOVERY_TIMEOUT,
            )

    def record_fallback(self):
        """Записать использование fallback."""
        self.total_fallbacks += 1

    def is_available(self) -> bool:
        """Проверить, можно ли отправлять запрос провайдеру."""
        if self.state == "closed":
            return True

        if self.state == "open":
            elapsed = time.time() - self.last_failure_time
            if elapsed >= CB_RECOVERY_TIMEOUT:
                self.state = "half_open"
                self.success_count = 0
                logger.info(
                    "Circuit breaker %s: ПОЛУОТКРЫТ (пробная попытка)",
                    self.provider,
                )
                return True
            return False

        # half_open — разрешаем пробные запросы
        return True

    def reset(self):
        """Сброс circuit breaker."""
        self.state = "closed"
        self.failure_count = 0
        self.success_count = 0
        logger.info("Circuit breaker %s: СБРОШЕН вручную", self.provider)

    def to_dict(self) -> dict:
        """Сериализация состояния."""
        return {
            "provider": self.provider,
            "circuit_state": self.state,
            "failure_count": self.failure_count,
            "total_requests": self.total_requests,
            "total_successes": self.total_successes,
            "total_failures": self.total_failures,
            "total_fallbacks": self.total_fallbacks,
            "avg_response_ms": round(self.avg_response_ms, 1),
            "success_rate": (
                round(self.total_successes / self.total_requests * 100, 1)
                if self.total_requests > 0 else 0
            ),
            "last_failure_ago_sec": (
                round(time.time() - self.last_failure_time, 0)
                if self.last_failure_time > 0 else None
            ),
        }


# Глобальное состояние circuit breakers
_circuit_breakers: dict[str, CircuitState] = {
    "groq": CircuitState("groq"),
    "gemini": CircuitState("gemini"),
    "ollama": CircuitState("ollama"),
}


def get_circuit_breaker(provider: str) -> CircuitState:
    """Получить или создать circuit breaker для провайдера."""
    if provider not in _circuit_breakers:
        _circuit_breakers[provider] = CircuitState(provider)
    return _circuit_breakers[provider]


# ─── Схемы ───────────────────────────────────────────────────────────────────


class ResetRequest(BaseModel):
    provider: str = Field(..., description="Имя провайдера: groq, gemini, ollama")


# ─── Эндпоинты ──────────────────────────────────────────────────────────────


@router.get("/status")
async def provider_status(
    _current_user: User = Depends(get_current_user),
):
    """
    Статус всех AI-провайдеров.

    Возвращает:
    - Доступность провайдера (ping)
    - Состояние circuit breaker
    - Роль провайдера в системе
    """
    providers = [
        {
            "provider": "groq",
            "name": "Groq (LLaMA)",
            "role": "Быстрый анализ, чат, простые запросы",
            "role_en": "Fast analysis, chat, simple queries",
            "priority": 1,
        },
        {
            "provider": "gemini",
            "name": "Google Gemini",
            "role": "Анализ документов, глубокий анализ",
            "role_en": "Document analysis, deep analysis",
            "priority": 2,
        },
        {
            "provider": "ollama",
            "name": "Ollama (локальный)",
            "role": "Конфиденциальные данные, локальная обработка",
            "role_en": "Confidential data, local processing",
            "priority": 3,
        },
    ]

    # Проверяем доступность параллельно
    import asyncio
    checks = await asyncio.gather(
        _check_provider_available(AIProvider.GROQ),
        _check_provider_available(AIProvider.GEMINI),
        _check_provider_available(AIProvider.OLLAMA),
        return_exceptions=True,
    )

    result = []
    for info, check in zip(providers, checks):
        cb = get_circuit_breaker(info["provider"])
        is_available = check is True if not isinstance(check, Exception) else False

        result.append({
            **info,
            "available": is_available,
            "circuit_breaker": cb.to_dict(),
            "effective_available": is_available and cb.is_available(),
        })

    # Определяем fallback chain
    fallback_chain = []
    for item in sorted(result, key=lambda x: x["priority"]):
        status_label = (
            "активен" if item["effective_available"]
            else "недоступен" if not item["available"]
            else "circuit breaker открыт"
        )
        fallback_chain.append(f"{item['name']} ({status_label})")

    return {
        "providers": result,
        "fallback_chain": fallback_chain,
        "fallback_description": (
            "Groq → Gemini → Ollama → кэш → сообщение об ошибке"
        ),
    }


@router.get("/stats")
async def provider_stats(
    _current_user: User = Depends(get_current_user),
):
    """Статистика использования AI-провайдеров."""
    stats = {}
    for name, cb in _circuit_breakers.items():
        stats[name] = cb.to_dict()

    total_requests = sum(cb.total_requests for cb in _circuit_breakers.values())
    total_failures = sum(cb.total_failures for cb in _circuit_breakers.values())
    total_fallbacks = sum(cb.total_fallbacks for cb in _circuit_breakers.values())

    return {
        "providers": stats,
        "summary": {
            "total_requests": total_requests,
            "total_failures": total_failures,
            "total_fallbacks": total_fallbacks,
            "overall_success_rate": (
                round((total_requests - total_failures) / total_requests * 100, 1)
                if total_requests > 0 else 0
            ),
        },
        "circuit_breaker_config": {
            "failure_threshold": CB_FAILURE_THRESHOLD,
            "recovery_timeout_sec": CB_RECOVERY_TIMEOUT,
            "success_threshold_for_close": CB_SUCCESS_THRESHOLD,
        },
    }


@router.post("/reset")
async def reset_circuit_breaker(
    req: ResetRequest,
    _current_user: User = Depends(get_current_user),
):
    """Сброс circuit breaker для провайдера."""
    if req.provider not in _circuit_breakers:
        raise HTTPException(
            status_code=404,
            detail=f"Провайдер '{req.provider}' не найден",
        )

    cb = _circuit_breakers[req.provider]
    old_state = cb.state
    cb.reset()

    return {
        "provider": req.provider,
        "previous_state": old_state,
        "new_state": cb.state,
        "message": f"Circuit breaker для {req.provider} сброшен",
    }
