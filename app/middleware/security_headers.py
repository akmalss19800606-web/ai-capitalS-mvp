"""
Security Headers Middleware — защитные HTTP-заголовки.
Этап 0, Сессия 0.1 — B-04, B-05, B-06.

Добавляет заголовки безопасности ко всем ответам:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Добавляет защитные HTTP-заголовки ко всем ответам.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Предотвращение MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Защита от clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS фильтр браузера
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS — принудительный HTTPS (1 год)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # Content Security Policy — базовая политика для API
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'"
        )

        # Referrer-Policy — минимум информации
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy — отключить ненужные API браузера
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response
