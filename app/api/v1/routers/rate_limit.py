"""
Роутер управления Rate Limiting — Фаза 3, RATE-001.

Эндпоинты:
  - GET /rate-limit/status — текущий статус лимитов для вызывающего
  - GET /rate-limit/config — конфигурация лимитов
"""

import logging

from fastapi import APIRouter, Request

from app.services.rate_limit_service import RedisRateLimitService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rate-limit", tags=["Rate Limiting"])


def _get_client_id(request: Request) -> str:
    """Извлечь идентификатор клиента из запроса."""
    # API-ключ
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"apikey:{api_key[:8]}"

    # JWT токен
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return f"token:{auth[7:20]}"

    # IP
    client_ip = request.client.host if request.client else "unknown"
    return f"ip:{client_ip}"


@router.get("/status")
async def get_rate_limit_status(request: Request):
    """
    Текущий статус rate limits для вызывающего клиента.

    Показывает использование по каждой категории (AI, export, search, default).
    """
    client_id = _get_client_id(request)
    status = await RedisRateLimitService.get_status(client_id)
    return {
        "client_id": client_id,
        "limits": status,
    }


@router.get("/config")
async def get_rate_limit_config():
    """
    Конфигурация rate limits: категории, лимиты, маппинг путей.
    """
    return RedisRateLimitService.get_config()
