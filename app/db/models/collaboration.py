"""
Модели БД для совместной работы и персонализации.
Фаза 3, Сессия 4 — COLLAB-TEAM-001 + VIS-PERS-001.

Таблицы:
  - thread_comments  — threaded discussions с ответами и @mentions
  - task_items       — задачи в контексте решения (DD items, action items)
  - notifications    — in-app уведомления
  - user_preferences — персонализация UI (тема, роль-виды, шрифт)
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, JSON, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class ThreadComment(Base):
    """Threaded discussions — комментарии с ответами и @mentions (COLLAB-TEAM-001.1, 001.2)."""
    __tablename__ = "thread_comments"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("thread_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    mentions = Column(JSON, nullable=True)  # список user_id, упомянутых через @
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    author = relationship("User", foreign_keys=[author_id])
    children = relationship("ThreadComment", backref="parent", remote_side=[id], cascade="all, delete-orphan")


class TaskItem(Base):
    """Задачи в контексте решения — DD items, action items (COLLAB-TEAM-001.3)."""
    __tablename__ = "task_items"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(50), nullable=False, default="action_item")  # action_item | dd_item | follow_up
    status = Column(String(50), nullable=False, default="open")  # open | in_progress | done | cancelled
    priority = Column(String(20), nullable=False, default="medium")  # low | medium | high | critical
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    assignee = relationship("User", foreign_keys=[assignee_id])
    creator = relationship("User", foreign_keys=[creator_id])


class Notification(Base):
    """In-app уведомления (COLLAB-TEAM-001.5)."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=True)
    notification_type = Column(String(50), nullable=False, default="info")  # info | mention | task | system
    entity_type = Column(String(50), nullable=True)  # decision | task | comment
    entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])


class UserPreferences(Base):
    """Настройки персонализации UI (VIS-PERS-001.1–001.3)."""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # VIS-PERS-001.1: Роль-специфичные представления
    view_mode = Column(String(30), nullable=False, default="analyst")  # analyst | partner | manager

    # VIS-PERS-001.3: Тема, цветовая схема, шрифты
    theme = Column(String(20), nullable=False, default="light")  # light | dark
    accent_color = Column(String(7), nullable=False, default="#3b82f6")  # hex
    font_size = Column(String(20), nullable=False, default="medium")  # small | medium | large

    # VIS-PERS-001.2: Адаптивный интерфейс — часто используемые
    pinned_nav_items = Column(JSON, nullable=True)  # ["dashboards", "decisions", ...]
    default_dashboard_id = Column(Integer, nullable=True)

    # Уведомления
    email_notifications = Column(Boolean, default=True)
    in_app_notifications = Column(Boolean, default=True)

    language = Column(String(5), nullable=False, default="ru")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    user = relationship("User", foreign_keys=[user_id])
