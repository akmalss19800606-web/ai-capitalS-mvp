"""
Модели БД для API Gateway, Webhooks, API Keys.
Фаза 4, Сессия 2 — EXCH-GW-001.

Таблицы:
  - api_keys             — ключи доступа для внешних клиентов
  - webhook_subscriptions — подписки на события
  - webhook_delivery_log  — журнал доставки вебхуков
  - api_usage_log         — лог использования API (для мониторинга)
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, JSON, Float,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class ApiKey(Base):
    """API-ключ для внешних клиентов (EXCH-GW-001.5)."""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)  # человекочитаемое название
    key_prefix = Column(String(10), nullable=False)  # первые 8 символов ключа (для отображения)
    key_hash = Column(String(128), nullable=False)  # SHA-256 хэш полного ключа
    scopes = Column(JSON, nullable=True)  # ["read:decisions", "write:portfolios", ...]
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    request_count = Column(Integer, default=0)
    rate_limit = Column(Integer, default=100)  # запросов в минуту
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])


class WebhookSubscription(Base):
    """Подписка на вебхук-события (EXCH-GW-001.3)."""
    __tablename__ = "webhook_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    url = Column(String(1000), nullable=False)  # endpoint для доставки
    secret = Column(String(128), nullable=True)  # shared secret для подписи payload
    events = Column(JSON, nullable=False)  # ["decision.created", "decision.status_changed", ...]
    is_active = Column(Boolean, default=True)
    headers = Column(JSON, nullable=True)  # дополнительные заголовки
    retry_count = Column(Integer, default=3)  # макс. число ретраев
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
    deliveries = relationship("WebhookDeliveryLog", back_populates="subscription", cascade="all, delete-orphan")


class WebhookDeliveryLog(Base):
    """Журнал доставки вебхуков (EXCH-GW-001.3)."""
    __tablename__ = "webhook_delivery_log"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("webhook_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=True)
    status_code = Column(Integer, nullable=True)  # HTTP-код ответа
    response_body = Column(Text, nullable=True)
    delivery_status = Column(String(30), nullable=False, default="pending")
    # pending → delivered → failed → retrying
    attempt = Column(Integer, default=1)
    error_message = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    subscription = relationship("WebhookSubscription", back_populates="deliveries")


class ApiUsageLog(Base):
    """Лог использования API для мониторинга (EXCH-GW-001.4)."""
    __tablename__ = "api_usage_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)  # null для анонимных
    api_key_id = Column(Integer, nullable=True, index=True)
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    path = Column(String(500), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Float, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
