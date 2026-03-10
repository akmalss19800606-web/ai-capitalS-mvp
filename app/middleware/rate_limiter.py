"""
Rate Limiting Middleware — ограничение частоты запросов.
Фаза 0: Redis-backed rate limiter с fallback на in-memory.

Стратегия:
- Redis (приоритет): sliding window через ZSET
- In-memory (fallback): если Redis недоступен
"""
import time
import asyncio
import logging
from collections import defaultdict
from typing import Dict, Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Настройки по умолчанию
DEFAULT_RATE_LIMIT = 60  # запросов
DEFAULT_WINDOW_SECONDS = 60  # за N секунд

# Пути, исключённые из rate limiting
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

# В тестовой среде (DEBUG=true) увеличиваем лимиты
import os
_IS_TESTING = os.getenv("DEBUG", "").lower() == "true"

# Специальные лимиты для отдельных путей
AUTH_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register"}
AUTH_RATE_LIMIT = 5  # 5 запросов в минуту на auth endpoints

AI_PATH_PREFIX = "/api/v1/ai"
AI_RATE_LIMIT_FREE = 10  # 10 AI-запросов/мин для free
AI_RATE_LIMIT_PRO = 100  # 100 AI-запросов/мин для pro


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding window rate limiter.
    Redis-backed с автоматическим fallback на in-memory.
    """

    def __init__(self, app, rate_limit: int = DEFAULT_RATE_LIMIT, window_seconds: int = DEFAULT_WINDOW_SECONDS):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window_seconds = window_seconds
        # In-memory fallback
        self._requests: Dict[str, list] = defaultdict(list)
        self._redis_available: Optional[bool] = None

    def _get_client_id(self, request: Request) -> str:
        """Определить идентификатор клиента."""
        # Проверяем API-ключ
        api_key_header = request.headers.get("X-API-Key")
        if api_key_header:
            return f"apikey:{api_key_header[:8]}"

        # Проверяем JWT токен
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:20]
            return f"token:{token}"

        # Анонимный — по IP
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def _get_limit_for_path(self, path: str) -> int:
        """Определить лимит для конкретного пути."""
        if _IS_TESTING:
            return 10000  # Неограниченно для тестов
        if path in AUTH_PATHS:
            return AUTH_RATE_LIMIT
        if path.startswith(AI_PATH_PREFIX):
            return AI_RATE_LIMIT_FREE  # TODO: проверять тариф пользователя
        return self.rate_limit

    async def _check_redis_rate_limit(self, client_id: str, limit: int) -> Tuple[bool, int, int]:
        """
        Проверить rate limit через Redis ZSET (sliding window).
        Возвращает (allowed, remaining, retry_after).
        """
        try:
            from app.core.redis_client import get_redis
            redis = await get_redis()
            if redis is None:
                raise ConnectionError("Redis unavailable")

            now = time.time()
            window_start = now - self.window_seconds
            key = f"rl:{client_id}"

            pipe = redis.pipeline()
            # Удалить записи вне окна
            pipe.zremrangebyscore(key, 0, window_start)
            # Подсчитать текущие записи
            pipe.zcard(key)
            # Добавить текущий запрос
            pipe.zadd(key, {str(now): now})
            # Установить TTL на ключ
            pipe.expire(key, self.window_seconds + 1)
            results = await pipe.execute()

            current_count = results[1]  # zcard result

            if current_count >= limit:
                # Узнать время до сброса
                oldest = await redis.zrange(key, 0, 0, withscores=True)
                retry_after = int(self.window_seconds - (now - oldest[0][1])) + 1 if oldest else self.window_seconds
                return False, 0, retry_after

            remaining = limit - current_count - 1
            self._redis_available = True
            return True, max(remaining, 0), 0

        except Exception as e:
            if self._redis_available is not False:
                logger.warning("Redis rate limiter fallback: %s", e)
                self._redis_available = False
            raise

    def _check_memory_rate_limit(self, client_id: str, limit: int) -> Tuple[bool, int, int]:
        """Fallback in-memory rate limiter."""
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[client_id] = [t for t in self._requests[client_id] if t > cutoff]
        current_count = len(self._requests[client_id])

        if current_count >= limit:
            retry_after = int(self.window_seconds - (now - self._requests[client_id][0])) + 1
            return False, 0, retry_after

        self._requests[client_id].append(now)
        remaining = limit - current_count - 1
        return True, max(remaining, 0), 0

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Пропуск для исключённых путей
        if path in EXCLUDED_PATHS:
            return await call_next(request)

        client_id = self._get_client_id(request)
        limit = self._get_limit_for_path(path)

        # Пробуем Redis, fallback на in-memory
        try:
            allowed, remaining, retry_after = await self._check_redis_rate_limit(client_id, limit)
        except Exception:
            allowed, remaining, retry_after = self._check_memory_rate_limit(client_id, limit)

        if not allowed:
            logger.warning(f"Rate limit exceeded: {client_id} (limit={limit})")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Превышен лимит запросов. Повторите позже.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                },
            )

        # Выполняем запрос и добавляем заголовки
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.window_seconds)

        return response
