"""
Сервис Webhooks — подписки, доставка, retry.
Фаза 4, Сессия 2 — EXCH-GW-001.3.
"""
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import httpx
from sqlalchemy.orm import Session

from app.db.models.api_gateway import WebhookSubscription, WebhookDeliveryLog

logger = logging.getLogger(__name__)

# Список допустимых событий
VALID_EVENTS = [
    "decision.created",
    "decision.updated",
    "decision.deleted",
    "decision.status_changed",
    "portfolio.created",
    "portfolio.updated",
    "portfolio.deleted",
    "import.completed",
    "import.failed",
    "export.completed",
    "workflow.step_completed",
    "workflow.completed",
    "test.ping",
]


def _sign_payload(payload: str, secret: str) -> str:
    """Создать HMAC-SHA256 подпись для payload."""
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


# ═══════════════════════════════════════════════════════════════
# CRUD ПОДПИСОК
# ═══════════════════════════════════════════════════════════════

def create_subscription(
    db: Session,
    user_id: int,
    name: str,
    url: str,
    events: List[str],
    secret: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    retry_count: int = 3,
) -> WebhookSubscription:
    """Создать подписку на вебхуки."""
    # Валидация событий
    invalid = [e for e in events if e not in VALID_EVENTS]
    if invalid:
        raise ValueError(f"Недопустимые события: {', '.join(invalid)}")

    sub = WebhookSubscription(
        user_id=user_id,
        name=name,
        url=url,
        secret=secret,
        events=events,
        headers=headers,
        retry_count=retry_count,
        is_active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    logger.info(f"Webhook subscription #{sub.id} created: {url} → {events}")
    return sub


def list_subscriptions(db: Session, user_id: int) -> List[WebhookSubscription]:
    return (
        db.query(WebhookSubscription)
        .filter(WebhookSubscription.user_id == user_id)
        .order_by(WebhookSubscription.created_at.desc())
        .all()
    )


def get_subscription(db: Session, sub_id: int) -> Optional[WebhookSubscription]:
    return db.query(WebhookSubscription).filter(WebhookSubscription.id == sub_id).first()


def update_subscription(
    db: Session,
    sub_id: int,
    **kwargs,
) -> Optional[WebhookSubscription]:
    sub = db.query(WebhookSubscription).filter(WebhookSubscription.id == sub_id).first()
    if not sub:
        return None
    for key, value in kwargs.items():
        if value is not None and hasattr(sub, key):
            if key == "events":
                invalid = [e for e in value if e not in VALID_EVENTS]
                if invalid:
                    raise ValueError(f"Недопустимые события: {', '.join(invalid)}")
            setattr(sub, key, value)
    db.commit()
    db.refresh(sub)
    return sub


def delete_subscription(db: Session, sub_id: int) -> bool:
    sub = db.query(WebhookSubscription).filter(WebhookSubscription.id == sub_id).first()
    if not sub:
        return False
    db.delete(sub)
    db.commit()
    return True


# ═══════════════════════════════════════════════════════════════
# ДОСТАВКА ВЕБХУКОВ
# ═══════════════════════════════════════════════════════════════

def deliver_webhook(
    db: Session,
    subscription: WebhookSubscription,
    event_type: str,
    payload: Dict[str, Any],
) -> WebhookDeliveryLog:
    """
    Доставить вебхук — отправить HTTP POST на url подписки.
    С retry при неудаче.
    """
    payload_json = json.dumps(payload, ensure_ascii=False, default=str)

    # Создать запись доставки
    delivery = WebhookDeliveryLog(
        subscription_id=subscription.id,
        event_type=event_type,
        payload=payload,
        delivery_status="pending",
        attempt=1,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    # Подготовка заголовков
    send_headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event_type,
        "X-Webhook-Delivery-Id": str(delivery.id),
    }
    if subscription.secret:
        signature = _sign_payload(payload_json, subscription.secret)
        send_headers["X-Webhook-Signature"] = f"sha256={signature}"
    if subscription.headers:
        send_headers.update(subscription.headers)

    # Попытки доставки
    max_attempts = subscription.retry_count or 3
    for attempt in range(1, max_attempts + 1):
        delivery.attempt = attempt
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(subscription.url, content=payload_json, headers=send_headers)
            delivery.status_code = resp.status_code
            delivery.response_body = resp.text[:2000] if resp.text else None

            if 200 <= resp.status_code < 300:
                delivery.delivery_status = "delivered"
                delivery.delivered_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"Webhook #{delivery.id} delivered to {subscription.url} (attempt {attempt})")
                return delivery
            else:
                delivery.delivery_status = "retrying" if attempt < max_attempts else "failed"
                delivery.error_message = f"HTTP {resp.status_code}"

        except Exception as e:
            delivery.delivery_status = "retrying" if attempt < max_attempts else "failed"
            delivery.error_message = str(e)[:500]
            logger.warning(f"Webhook #{delivery.id} attempt {attempt} failed: {e}")

        db.commit()

        # Экспоненциальная задержка между попытками
        if attempt < max_attempts:
            time.sleep(min(2 ** attempt, 10))

    db.commit()
    db.refresh(delivery)
    return delivery


def fire_event(db: Session, event_type: str, payload: Dict[str, Any]) -> List[WebhookDeliveryLog]:
    """
    Отправить событие всем активным подписчикам.
    Вызывается из бизнес-логики (сервисов/роутеров).
    """
    subs = (
        db.query(WebhookSubscription)
        .filter(
            WebhookSubscription.is_active == True,
        )
        .all()
    )

    deliveries = []
    for sub in subs:
        if event_type in (sub.events or []):
            delivery = deliver_webhook(db, sub, event_type, payload)
            deliveries.append(delivery)

    return deliveries


def list_deliveries(
    db: Session,
    subscription_id: int,
    limit: int = 50,
) -> List[WebhookDeliveryLog]:
    """Получить журнал доставки для подписки."""
    return (
        db.query(WebhookDeliveryLog)
        .filter(WebhookDeliveryLog.subscription_id == subscription_id)
        .order_by(WebhookDeliveryLog.created_at.desc())
        .limit(limit)
        .all()
    )


def test_webhook(db: Session, subscription: WebhookSubscription) -> WebhookDeliveryLog:
    """Отправить тестовый пинг на вебхук."""
    payload = {
        "event": "test.ping",
        "message": "Тестовый вебхук от AI Capital Management",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subscription_id": subscription.id,
    }
    return deliver_webhook(db, subscription, "test.ping", payload)


def get_available_events() -> List[str]:
    """Получить список доступных событий."""
    return VALID_EVENTS
