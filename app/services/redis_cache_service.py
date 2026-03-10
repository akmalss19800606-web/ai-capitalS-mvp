"""
Redis Cache Service — централизованный сервис кэширования.
Фаза 2, REDIS-001: Redis кэширование.

Подключение к Redis через redis.asyncio, TTL по категориям:
- Курсы валют: 6 часов
- Макроданные: 24 часа
- Общий кэш: 1 час
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# TTL константы (в секундах)
TTL_CURRENCY_RATES = 6 * 3600      # 6 часов
TTL_MACRO_DATA = 24 * 3600         # 24 часа
TTL_DASHBOARD_KPI = 5 * 60         # 5 минут
TTL_DEFAULT = 3600                 # 1 час

# Префиксы ключей
PREFIX_CURRENCY = "cache:currency:"
PREFIX_MACRO = "cache:macro:"
PREFIX_DASHBOARD = "cache:dashboard:"
PREFIX_RATE_LIMIT = "ratelimit:"
PREFIX_SESSION = "session:"


class RedisCacheService:
    """Async Redis cache с автоматическим управлением подключением."""

    _pool: Optional[aioredis.Redis] = None

    @classmethod
    async def get_client(cls) -> aioredis.Redis:
        """Получить или создать Redis-клиент (connection pool)."""
        if cls._pool is None:
            cls._pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return cls._pool

    @classmethod
    async def close(cls) -> None:
        """Закрыть connection pool (для graceful shutdown)."""
        if cls._pool is not None:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    async def ping(cls) -> bool:
        """Проверка подключения к Redis."""
        try:
            client = await cls.get_client()
            return await client.ping()
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False

    # ── GET / SET ──────────────────────────────────────────────

    @classmethod
    async def get(cls, key: str) -> Optional[Any]:
        """Получить значение из кэша. Возвращает None при промахе."""
        try:
            client = await cls.get_client()
            value = await client.get(key)
            if value is not None:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Redis GET error for '{key}': {e}")
            return None

    @classmethod
    async def set(cls, key: str, value: Any, ttl: int = TTL_DEFAULT) -> bool:
        """Записать значение в кэш с TTL."""
        try:
            client = await cls.get_client()
            serialized = json.dumps(value, ensure_ascii=False, default=str)
            await client.set(key, serialized, ex=ttl)
            return True
        except Exception as e:
            logger.warning(f"Redis SET error for '{key}': {e}")
            return False

    @classmethod
    async def delete(cls, key: str) -> bool:
        """Удалить ключ из кэша."""
        try:
            client = await cls.get_client()
            await client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis DELETE error for '{key}': {e}")
            return False

    @classmethod
    async def delete_pattern(cls, pattern: str) -> int:
        """Удалить все ключи по паттерну (SCAN + DELETE)."""
        try:
            client = await cls.get_client()
            count = 0
            async for key in client.scan_iter(match=pattern, count=100):
                await client.delete(key)
                count += 1
            return count
        except Exception as e:
            logger.warning(f"Redis DELETE pattern error for '{pattern}': {e}")
            return 0

    # ── Специализированные методы ──────────────────────────────

    @classmethod
    async def get_currency_rates(cls, date_str: str = "latest") -> Optional[list]:
        """Получить курсы валют из кэша."""
        key = f"{PREFIX_CURRENCY}{date_str}"
        return await cls.get(key)

    @classmethod
    async def set_currency_rates(
        cls, rates: list, date_str: str = "latest"
    ) -> bool:
        """Кэшировать курсы валют (TTL 6 часов)."""
        key = f"{PREFIX_CURRENCY}{date_str}"
        return await cls.set(key, rates, ttl=TTL_CURRENCY_RATES)

    @classmethod
    async def get_macro_data(cls, indicator: str) -> Optional[list]:
        """Получить макроданные из кэша."""
        key = f"{PREFIX_MACRO}{indicator}"
        return await cls.get(key)

    @classmethod
    async def set_macro_data(cls, indicator: str, data: list) -> bool:
        """Кэшировать макроданные (TTL 24 часа)."""
        key = f"{PREFIX_MACRO}{indicator}"
        return await cls.set(key, data, ttl=TTL_MACRO_DATA)

    @classmethod
    async def get_dashboard_kpi(cls, user_id: int) -> Optional[dict]:
        """Получить KPI дашборда из кэша."""
        key = f"{PREFIX_DASHBOARD}kpi:{user_id}"
        return await cls.get(key)

    @classmethod
    async def set_dashboard_kpi(cls, user_id: int, data: dict) -> bool:
        """Кэшировать KPI дашборда (TTL 5 минут)."""
        key = f"{PREFIX_DASHBOARD}kpi:{user_id}"
        return await cls.set(key, data, ttl=TTL_DASHBOARD_KPI)

    # ── Rate Limiting (REDIS-002) ─────────────────────────────

    @classmethod
    async def check_rate_limit(
        cls, client_id: str, limit: int, window_seconds: int
    ) -> tuple[bool, int]:
        """
        Проверить rate limit через Redis sliding window.
        Возвращает (allowed: bool, remaining: int).
        """
        try:
            import time
            client = await cls.get_client()
            key = f"{PREFIX_RATE_LIMIT}{client_id}"
            now = time.time()
            pipe = client.pipeline()

            # Удалить устаревшие записи
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            # Добавить текущий запрос
            pipe.zadd(key, {str(now): now})
            # Посчитать запросы в окне
            pipe.zcard(key)
            # Установить TTL
            pipe.expire(key, window_seconds)

            results = await pipe.execute()
            current_count = results[2]
            remaining = max(0, limit - current_count)
            allowed = current_count <= limit

            return allowed, remaining
        except Exception as e:
            logger.warning(f"Redis rate limit error: {e}")
            # Fallback: разрешить при ошибке Redis
            return True, limit

    # ── Информация ────────────────────────────────────────────

    @classmethod
    async def info(cls) -> dict:
        """Получить информацию о Redis (для health check)."""
        try:
            client = await cls.get_client()
            info = await client.info("memory")
            return {
                "connected": True,
                "used_memory_human": info.get("used_memory_human", "N/A"),
                "used_memory_peak_human": info.get("used_memory_peak_human", "N/A"),
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}
