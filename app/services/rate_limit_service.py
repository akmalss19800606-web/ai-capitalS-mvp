"""
Redis Rate Limiter Service — управление лимитами AI-запросов.

Фаза 3, RATE-001:
  - Скользящее окно на базе Redis (INCR + EXPIRE)
  - Раздельные лимиты: AI-эндпоинты (20/мин), обычные (120/мин)
  - Fallback на in-memory если Redis недоступен
  - Статус и конфигурация через API
"""

import logging
import time
from collections import defaultdict
from typing import Tuple, Optional

from app.services.redis_cache_service import RedisCacheService

logger = logging.getLogger(__name__)

# ── Конфигурация лимитов ─────────────────────────────────────────

RATE_LIMITS = {
    "ai": {"limit": 20, "window": 60, "description": "AI-эндпоинты (чат, аналитика)"},
    "export": {"limit": 10, "window": 60, "description": "Экспорт (PDF, Excel)"},
    "search": {"limit": 30, "window": 60, "description": "Поиск компаний и DD"},
    "default": {"limit": 120, "window": 60, "description": "Общие эндпоинты"},
}

# Маппинг путей к категориям
PATH_CATEGORIES = {
    "/api/v1/ai/": "ai",
    "/api/v1/ai-analytics/": "ai",
    "/api/v1/export/": "export",
    "/api/v1/branded-export/": "export",
    "/api/v1/companies/": "search",
    "/api/v1/dd-": "search",
    "/api/v1/calculator/": "ai",
}


class RedisRateLimitService:
    """Rate limiter на базе Redis с fallback на in-memory."""

    # In-memory fallback
    _memory_store: dict[str, list[float]] = defaultdict(list)

    @classmethod
    def get_category(cls, path: str) -> str:
        """Определить категорию лимита по пути."""
        for prefix, category in PATH_CATEGORIES.items():
            if path.startswith(prefix):
                return category
        return "default"

    @classmethod
    async def check_rate_limit(
        cls,
        client_id: str,
        category: str = "default",
    ) -> Tuple[bool, int, int]:
        """
        Проверить rate limit.

        Returns:
            (allowed, remaining, reset_timestamp)
        """
        config = RATE_LIMITS.get(category, RATE_LIMITS["default"])
        limit = config["limit"]
        window = config["window"]
        key = f"ratelimit:{category}:{client_id}"

        # Пробуем Redis
        try:
            return await cls._check_redis(key, limit, window)
        except Exception as e:
            logger.debug(f"Redis rate limit fallback: {e}")
            return cls._check_memory(key, limit, window)

    @classmethod
    async def _check_redis(
        cls, key: str, limit: int, window: int
    ) -> Tuple[bool, int, int]:
        """Проверка через Redis INCR + EXPIRE."""
        redis = await RedisCacheService.get_client()
        if redis is None:
            raise ConnectionError("Redis not available")

        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window)
        results = await pipe.execute()

        current = results[0]
        reset_at = int(time.time()) + window

        if current > limit:
            return False, 0, reset_at

        remaining = limit - current
        return True, remaining, reset_at

    @classmethod
    def _check_memory(
        cls, key: str, limit: int, window: int
    ) -> Tuple[bool, int, int]:
        """Fallback: in-memory sliding window."""
        now = time.time()
        cutoff = now - window

        # Очистка старых записей
        cls._memory_store[key] = [t for t in cls._memory_store[key] if t > cutoff]

        current = len(cls._memory_store[key])
        reset_at = int(now) + window

        if current >= limit:
            return False, 0, reset_at

        cls._memory_store[key].append(now)
        remaining = limit - current - 1
        return True, remaining, reset_at

    @classmethod
    async def get_status(cls, client_id: str) -> dict:
        """Получить статус лимитов для клиента."""
        status = {}
        for category, config in RATE_LIMITS.items():
            key = f"ratelimit:{category}:{client_id}"
            try:
                redis = await RedisCacheService.get_client()
                if redis:
                    current = await redis.get(key)
                    current = int(current) if current else 0
                else:
                    current = len(cls._memory_store.get(key, []))
            except Exception:
                current = len(cls._memory_store.get(key, []))

            status[category] = {
                "limit": config["limit"],
                "window_seconds": config["window"],
                "used": current,
                "remaining": max(0, config["limit"] - current),
                "description": config["description"],
            }
        return status

    @classmethod
    def get_config(cls) -> dict:
        """Получить конфигурацию всех лимитов."""
        return {
            "categories": RATE_LIMITS,
            "path_mappings": PATH_CATEGORIES,
        }
