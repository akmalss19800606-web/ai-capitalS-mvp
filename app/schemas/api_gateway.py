"""
Pydantic-схемы для API Gateway, Webhooks, API Keys.
Фаза 4, Сессия 2.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ───────────────── API Keys ──────────────────────────────────

class ApiKeyCreate(BaseModel):
    name: str
    scopes: Optional[List[str]] = None  # ["read:decisions", "write:portfolios"]
    rate_limit: int = 100
    expires_days: Optional[int] = None  # через сколько дней истекает


class ApiKeyResponse(BaseModel):
    id: int
    user_id: int
    name: str
    key_prefix: str
    scopes: Optional[List[str]]
    is_active: bool
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    request_count: int
    rate_limit: int
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Ответ при создании — единственный раз показываем полный ключ."""
    full_key: str


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None
    rate_limit: Optional[int] = None


# ───────────────── Webhooks ──────────────────────────────────

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
]


class WebhookCreate(BaseModel):
    name: str
    url: str
    secret: Optional[str] = None
    events: List[str]  # из VALID_EVENTS
    headers: Optional[Dict[str, str]] = None
    retry_count: int = 3


class WebhookResponse(BaseModel):
    id: int
    user_id: int
    name: str
    url: str
    secret: Optional[str]
    events: List[str]
    is_active: bool
    headers: Optional[Dict[str, str]]
    retry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    secret: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    headers: Optional[Dict[str, str]] = None
    retry_count: Optional[int] = None


class WebhookDeliveryResponse(BaseModel):
    id: int
    subscription_id: int
    event_type: str
    payload: Optional[Any]
    status_code: Optional[int]
    response_body: Optional[str]
    delivery_status: str
    attempt: int
    error_message: Optional[str]
    delivered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookTestPayload(BaseModel):
    event_type: str = "test.ping"


# ───────────────── API Usage ─────────────────────────────────

class ApiUsageSummary(BaseModel):
    total_requests: int
    requests_today: int
    requests_this_week: int
    avg_response_time_ms: float
    error_rate_pct: float
    top_endpoints: List[Dict[str, Any]]
    requests_by_method: Dict[str, int]
    requests_by_hour: List[Dict[str, Any]]


class ApiUsageLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    api_key_id: Optional[int]
    method: str
    path: str
    status_code: int
    response_time_ms: Optional[float]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
