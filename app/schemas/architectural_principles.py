"""
Pydantic-схемы для архитектурных принципов.
Фаза 4, Сессия 4.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ───────────────── System Events (Event Sourcing, 9.2.2) ─────────

class SystemEventCreate(BaseModel):
    aggregate_type: str
    aggregate_id: int
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = Field(None, alias="metadata")


class SystemEventResponse(BaseModel):
    id: int
    aggregate_type: str
    aggregate_id: int
    event_type: str
    event_data: Optional[Dict[str, Any]]
    previous_state: Optional[Dict[str, Any]]
    new_state: Optional[Dict[str, Any]]
    user_id: Optional[int]
    correlation_id: Optional[str]
    causation_id: Optional[str]
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


class AggregateStateResponse(BaseModel):
    aggregate_type: str
    aggregate_id: int
    current_state: Optional[Dict[str, Any]]
    version: int
    event_count: int
    last_event_at: Optional[datetime]


class EventTimelineResponse(BaseModel):
    total_events: int
    events: List[SystemEventResponse]


# ───────────────── HITL Reviews (9.2.1, 9.2.3) ──────────────────

class HitlReviewCreate(BaseModel):
    ai_output_type: str
    ai_output_id: Optional[int] = None
    ai_output_summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    explanation_text: Optional[str] = None
    explanation_factors: Optional[List[Dict[str, Any]]] = None


class HitlReviewResponse(BaseModel):
    id: int
    user_id: int
    ai_output_type: str
    ai_output_id: Optional[int]
    ai_output_summary: Optional[str]
    ai_confidence: Optional[float]
    status: str
    reviewer_comment: Optional[str]
    reviewed_at: Optional[datetime]
    explanation_text: Optional[str]
    explanation_factors: Optional[List[Dict[str, Any]]]
    disclaimer_shown: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HitlReviewAction(BaseModel):
    status: str  # approved, rejected, needs_revision
    comment: Optional[str] = None


class HitlStatsResponse(BaseModel):
    total_reviews: int
    pending: int
    approved: int
    rejected: int
    needs_revision: int
    avg_confidence: Optional[float]
    approval_rate: Optional[float]


class DisclaimerResponse(BaseModel):
    text: str
    category: str
    applies_to: str
    severity: str


# ───────────────── Analytics Snapshots (9.2.4) ───────────────────

class SnapshotCreate(BaseModel):
    analysis_type: str
    analysis_id: Optional[int] = None
    input_data: Dict[str, Any]
    parameters: Dict[str, Any]
    result_data: Dict[str, Any]
    engine_version: Optional[str] = None
    notes: Optional[str] = None


class SnapshotResponse(BaseModel):
    id: int
    user_id: int
    analysis_type: str
    analysis_id: Optional[int]
    input_data: Dict[str, Any]
    parameters: Dict[str, Any]
    result_data: Dict[str, Any]
    result_hash: Optional[str]
    engine_version: Optional[str]
    is_reproducible: bool
    reproduced_at: Optional[datetime]
    reproduction_count: int
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReproduceRequest(BaseModel):
    snapshot_id: int


class ReproduceResponse(BaseModel):
    snapshot_id: int
    original_hash: Optional[str]
    new_hash: str
    is_match: bool
    reproduction_count: int
    reproduced_at: datetime


# ───────────────── Event Bus (9.3.1, 9.3.3) ─────────────────────

class EventBusPublish(BaseModel):
    channel: str
    event_type: str
    payload: Optional[Dict[str, Any]] = None
    producer: Optional[str] = None


class EventBusMessageResponse(BaseModel):
    id: int
    channel: str
    event_type: str
    payload: Optional[Dict[str, Any]]
    producer: Optional[str]
    status: str
    consumer: Optional[str]
    retry_count: int
    error_message: Optional[str]
    published_at: datetime
    consumed_at: Optional[datetime]

    class Config:
        from_attributes = True


class EventBusConsumeRequest(BaseModel):
    channel: str
    consumer: str
    max_messages: int = 10


class EventBusStatsResponse(BaseModel):
    total_messages: int
    published: int
    consumed: int
    failed: int
    dead_letter: int
    channels: List[str]
    messages_by_channel: Dict[str, int]


# ───────────────── System Constraints (9.4) ──────────────────────

class SystemConstraintCreate(BaseModel):
    constraint_key: str
    title: str
    description: str
    category: str = "general"
    severity: str = "info"
    display_in_ui: bool = True
    display_in_reports: bool = True


class SystemConstraintResponse(BaseModel):
    id: int
    constraint_key: str
    title: str
    description: str
    category: str
    severity: str
    is_active: bool
    display_in_ui: bool
    display_in_reports: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemConstraintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None
    display_in_ui: Optional[bool] = None
    display_in_reports: Optional[bool] = None
