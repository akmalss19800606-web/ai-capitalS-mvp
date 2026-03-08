"""
Rate Limiting Middleware — ограничение частоты запросов.
Фаза 4, Сессия 2 — EXCH-GW-001.1.

Реализация: in-memory sliding window (для MVP).
В продакшне заменить на Redis-backed rate limiter.
"""
import time
import logging
from collections import defaultdict
from typing import Dict, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Настройки по умолчанию
DEFAULT_RATE_LIMIT = 60  # запросов
DEFAULT_WINDOW_SECONDS = 60  # за N секунд

# Пути, исключённые из rate limiting
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding window rate limiter (EXCH-GW-001.1).
    - Для авторизованных: по user_id
    - Для API-ключей: по key_id (с персональным лимитом)
    - Для анонимных: по IP
    """

    def __init__(self, app, rate_limit: int = DEFAULT_RATE_LIMIT, window_seconds: int = DEFAULT_WINDOW_SECONDS):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window_seconds = window_seconds
        # Хранилище: {client_id: [(timestamp, ...], ...}
        self._requests: Dict[str, list] = defaultdict(list)

    def _get_client_id(self, request: Request) -> Tuple[str, int]:
        """Определить идентификатор клиента и его лимит."""
        # Проверяем API-ключ
        api_key_header = request.headers.get("X-API-Key")
        if api_key_header:
            return f"apikey:{api_key_header[:8]}", self.rate_limit

        # Проверяем JWT токен
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:20]  # первые символы как идентификатор
            return f"token:{token}", self.rate_limit

        # Анонимный — по IP
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}", self.rate_limit // 2  # анонимные — лимит в 2 раза ниже

    def _cleanup(self, client_id: str, now: float) -> None:
        """Удалить устаревшие записи."""
        cutoff = now - self.window_seconds
        self._requests[client_id] = [
            t for t in self._requests[client_id] if t > cutoff
        ]

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Пропуск для исключённых путей
        if path in EXCLUDED_PATHS:
            return await call_next(request)

        now = time.time()
        client_id, limit = self._get_client_id(request)

        # Очистка устаревших
        self._cleanup(client_id, now)

        current_count = len(self._requests[client_id])

        if current_count >= limit:
            retry_after = int(self.window_seconds - (now - self._requests[client_id][0])) + 1
            logger.warning(f"Rate limit exceeded: {client_id} ({current_count}/{limit})")
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
                    "X-RateLimit-Reset": str(int(now) + retry_after),
                },
            )

        # Регистрируем запрос
        self._requests[client_id].append(now)

        # Выполняем запрос и добавляем заголовки
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(limit - current_count - 1)
        response.headers["X-RateLimit-Reset"] = str(int(now) + self.window_seconds)

        return response
