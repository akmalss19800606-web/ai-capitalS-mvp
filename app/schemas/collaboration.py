"""
Pydantic-схемы для модуля совместной работы.
Фаза 3, Сессия 4.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ───────────────── ThreadComment (COLLAB-TEAM-001.1, 001.2) ─────────────────

class ThreadCommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=10000)
    parent_id: Optional[int] = None
    mentions: Optional[List[int]] = None  # список user_id


class ThreadCommentUpdate(BaseModel):
    body: Optional[str] = None
    is_resolved: Optional[bool] = None


class ThreadCommentResponse(BaseModel):
    id: int
    decision_id: int
    parent_id: Optional[int]
    author_id: int
    author_name: Optional[str] = None
    body: str
    mentions: Optional[List[int]]
    is_resolved: bool
    created_at: datetime
    updated_at: datetime
    children: List["ThreadCommentResponse"] = []

    class Config:
        from_attributes = True


ThreadCommentResponse.model_rebuild()


# ───────────────── TaskItem (COLLAB-TEAM-001.3) ─────────────────────────────

class TaskItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    task_type: str = "action_item"  # action_item | dd_item | follow_up
    priority: str = "medium"  # low | medium | high | critical
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # open | in_progress | done | cancelled
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskItemResponse(BaseModel):
    id: int
    decision_id: int
    title: str
    description: Optional[str]
    task_type: str
    status: str
    priority: str
    assignee_id: Optional[int]
    assignee_name: Optional[str] = None
    creator_id: int
    creator_name: Optional[str] = None
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ───────────────── Notifications (COLLAB-TEAM-001.5) ────────────────────────

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    body: Optional[str]
    notification_type: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    notification_ids: List[int]


# ───────────────── UserPreferences (VIS-PERS-001) ──────────────────────────

class UserPreferencesUpdate(BaseModel):
    view_mode: Optional[str] = None  # analyst | partner | manager
    theme: Optional[str] = None  # light | dark
    accent_color: Optional[str] = None  # hex
    font_size: Optional[str] = None  # small | medium | large
    pinned_nav_items: Optional[List[str]] = None
    default_dashboard_id: Optional[int] = None
    email_notifications: Optional[bool] = None
    in_app_notifications: Optional[bool] = None
    language: Optional[str] = None


class UserPreferencesResponse(BaseModel):
    id: int
    user_id: int
    view_mode: str
    theme: str
    accent_color: str
    font_size: str
    pinned_nav_items: Optional[List[str]]
    default_dashboard_id: Optional[int]
    email_notifications: bool
    in_app_notifications: bool
    language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
