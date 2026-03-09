"""
Роутер: API Gateway — управление ключами, вебхуки, мониторинг.
Фаза 4, Сессия 2 — EXCH-GW-001.

Эндпоинты:
  POST   /gateway/api-keys            — создать API-ключ
  GET    /gateway/api-keys            — список ключей
  PUT    /gateway/api-keys/{id}       — обновить ключ
  DELETE /gateway/api-keys/{id}       — отозвать ключ

  POST   /gateway/webhooks            — создать подписку
  GET    /gateway/webhooks            — список подписок
  GET    /gateway/webhooks/events     — доступные события
  PUT    /gateway/webhooks/{id}       — обновить подписку
  DELETE /gateway/webhooks/{id}       — удалить подписку
  POST   /gateway/webhooks/{id}/test  — тестовый пинг
  GET    /gateway/webhooks/{id}/deliveries — журнал доставки

  GET    /gateway/usage/summary       — дашборд использования API
  GET    /gateway/usage/logs          — детальный лог
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.v1.routers.auth import get_current_user
from app.db.models.user import User
from app.schemas.api_gateway import (
    ApiKeyCreate, ApiKeyResponse, ApiKeyCreatedResponse, ApiKeyUpdate,
    WebhookCreate, WebhookResponse, WebhookUpdate, WebhookDeliveryResponse,
    WebhookTestPayload, ApiUsageSummary, ApiUsageLogResponse,
)
from app.services.api_keys_service import (
    create_api_key, list_api_keys, get_api_key,
    update_api_key, revoke_api_key, delete_api_key,
)
from app.services.webhook_service import (
    create_subscription, list_subscriptions, get_subscription,
    update_subscription, delete_subscription,
    test_webhook, list_deliveries, get_available_events,
)
from app.services.api_usage_service import (
    get_usage_summary, list_recent_logs,
)

router = APIRouter(prefix="/gateway", tags=["api-gateway"])


# ═══════════════════════════════════════════════════════════════
# API KEYS (EXCH-GW-001.5)
# ═══════════════════════════════════════════════════════════════

@router.post("/api-keys", response_model=ApiKeyCreatedResponse)
def create_key(
    body: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать API-ключ. Полный ключ показывается только один раз."""
    api_key, full_key = create_api_key(
        db,
        user_id=current_user.id,
        name=body.name,
        scopes=body.scopes,
        rate_limit=body.rate_limit,
        expires_days=body.expires_days,
    )
    return ApiKeyCreatedResponse(
        id=api_key.id,
        user_id=api_key.user_id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        scopes=api_key.scopes,
        is_active=api_key.is_active,
        expires_at=api_key.expires_at,
        last_used_at=api_key.last_used_at,
        request_count=api_key.request_count,
        rate_limit=api_key.rate_limit,
        created_at=api_key.created_at,
        full_key=full_key,
    )


@router.get("/api-keys", response_model=list[ApiKeyResponse])
def list_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список API-ключей пользователя."""
    return list_api_keys(db, current_user.id)


@router.put("/api-keys/{key_id}", response_model=ApiKeyResponse)
def update_key(
    key_id: int,
    body: ApiKeyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить настройки ключа."""
    key = get_api_key(db, key_id)
    if not key:
        raise HTTPException(404, "API-ключ не найден")
    if key.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    updated = update_api_key(
        db, key_id,
        name=body.name,
        scopes=body.scopes,
        is_active=body.is_active,
        rate_limit=body.rate_limit,
    )
    return updated


@router.delete("/api-keys/{key_id}")
def revoke_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отозвать (удалить) API-ключ."""
    key = get_api_key(db, key_id)
    if not key:
        raise HTTPException(404, "API-ключ не найден")
    if key.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_api_key(db, key_id)
    return {"detail": "Ключ удалён"}


# ═══════════════════════════════════════════════════════════════
# WEBHOOKS (EXCH-GW-001.3)
# ═══════════════════════════════════════════════════════════════

@router.get("/webhooks/events")
def get_events(
    current_user: User = Depends(get_current_user),
):
    """Получить список доступных событий для подписки."""
    return {"events": get_available_events()}


@router.post("/webhooks", response_model=WebhookResponse)
def create_webhook(
    body: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать подписку на вебхук."""
    try:
        sub = create_subscription(
            db,
            user_id=current_user.id,
            name=body.name,
            url=body.url,
            events=body.events,
            secret=body.secret,
            headers=body.headers,
            retry_count=body.retry_count,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return sub


@router.get("/webhooks", response_model=list[WebhookResponse])
def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список подписок на вебхуки."""
    return list_subscriptions(db, current_user.id)


@router.put("/webhooks/{sub_id}", response_model=WebhookResponse)
def update_webhook(
    sub_id: int,
    body: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить подписку."""
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(404, "Подписка не найдена")
    if sub.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    try:
        updated = update_subscription(
            db, sub_id,
            name=body.name,
            url=body.url,
            secret=body.secret,
            events=body.events,
            is_active=body.is_active,
            headers=body.headers,
            retry_count=body.retry_count,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return updated


@router.delete("/webhooks/{sub_id}")
def delete_webhook(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить подписку."""
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(404, "Подписка не найдена")
    if sub.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_subscription(db, sub_id)
    return {"detail": "Подписка удалена"}


@router.post("/webhooks/{sub_id}/test", response_model=WebhookDeliveryResponse)
def test_ping(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить тестовый пинг на вебхук."""
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(404, "Подписка не найдена")
    if sub.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delivery = test_webhook(db, sub)
    return delivery


@router.get("/webhooks/{sub_id}/deliveries", response_model=list[WebhookDeliveryResponse])
def get_deliveries(
    sub_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Журнал доставки вебхуков."""
    sub = get_subscription(db, sub_id)
    if not sub:
        raise HTTPException(404, "Подписка не найдена")
    if sub.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return list_deliveries(db, sub_id, limit)


# ═══════════════════════════════════════════════════════════════
# API USAGE MONITORING (EXCH-GW-001.4)
# ═══════════════════════════════════════════════════════════════

@router.get("/usage/summary", response_model=ApiUsageSummary)
def usage_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Дашборд использования API."""
    return get_usage_summary(db, current_user.id)


@router.get("/usage/logs", response_model=list[ApiUsageLogResponse])
def usage_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Детальный лог запросов."""
    return list_recent_logs(db, current_user.id, limit)
