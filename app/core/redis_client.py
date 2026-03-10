"""
Redis клиент для приложения.
Фаза 0: Подключение Redis для rate limiting и кэширования.
Graceful fallback: если Redis недоступен, возвращает None.
"""
import logging
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    """Получить async Redis клиент. Возвращает None если Redis недоступен."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.ping()
            return _redis_client
        except Exception:
            _redis_client = None

    try:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await _redis_client.ping()
        logger.info("Redis подключён: %s", settings.REDIS_URL)
        return _redis_client
    except Exception as e:
        logger.warning("Redis недоступен (%s), используем fallback", e)
        _redis_client = None
        return None


async def close_redis():
    """Закрыть Redis-соединение при остановке приложения."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
