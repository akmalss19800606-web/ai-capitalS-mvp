"""
Модели: Архитектурные принципы и ограничения.
Фаза 4, Сессия 4 — разделы 9.2–9.4 ТЗ v2.3.

SystemEvent         — иммутабельное событие (event sourcing, 9.2.2)
HitlReview          — human-in-the-loop ревью AI-выводов (9.2.1)
AiExplanation       — обоснование AI-вывода (9.2.3)
AnalyticsSnapshot   — снапшот для воспроизводимости (9.2.4)
EventBusMessage     — сообщения шины событий (9.3.1, 9.3.3)
SystemConstraint    — ограничения системы (9.4)
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float,
    Boolean, ForeignKey, JSON, Index,
)
from app.db.session import Base


class SystemEvent(Base):
    """
    Иммутабельное событие (Event Sourcing, 9.2.2).
    Записи НИКОГДА не обновляются и не удаляются.
    """
    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, index=True)
    aggregate_type = Column(String(100), nullable=False, index=True)  # decision, portfolio, analytics
    aggregate_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # created, updated, status_changed, etc.
    event_data = Column(JSON, nullable=True)         # полные данные события
    previous_state = Column(JSON, nullable=True)     # состояние до события
    new_state = Column(JSON, nullable=True)          # состояние после события
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    correlation_id = Column(String(100), nullable=True, index=True)  # для связи событий в одной операции
    causation_id = Column(String(100), nullable=True)   # событие-причина
    metadata_ = Column("metadata", JSON, nullable=True)  # доп. метаданные
    version = Column(Integer, default=1)              # версия агрегата
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_system_events_aggregate", "aggregate_type", "aggregate_id"),
        Index("ix_system_events_type_time", "event_type", "created_at"),
    )


class HitlReview(Base):
    """
    Human-in-the-Loop ревью (9.2.1).
    Каждый AI-вывод может требовать подтверждения человеком.
    """
    __tablename__ = "hitl_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ai_output_type = Column(String(100), nullable=False)  # monte_carlo, shap, stress_test, dd_score, etc.
    ai_output_id = Column(Integer, nullable=True)          # ID конкретного расчёта (если есть)
    ai_output_summary = Column(Text, nullable=True)        # краткое описание AI-вывода
    ai_confidence = Column(Float, nullable=True)           # уровень уверенности AI (0-1)
    status = Column(String(30), default="pending")         # pending, approved, rejected, needs_revision
    reviewer_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    explanation_text = Column(Text, nullable=True)         # auto-generated explanation (9.2.3)
    explanation_factors = Column(JSON, nullable=True)      # [{factor, weight, description}]
    disclaimer_shown = Column(Boolean, default=True)       # был ли показан disclaimer
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class AnalyticsSnapshot(Base):
    """
    Снапшот аналитики для воспроизводимости (9.2.4).
    Фиксирует входные данные, параметры и результат.
    """
    __tablename__ = "analytics_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_type = Column(String(100), nullable=False, index=True)  # monte_carlo, efficient_frontier, stress_test, etc.
    analysis_id = Column(Integer, nullable=True)         # ID оригинального расчёта
    input_data = Column(JSON, nullable=False)            # входные данные
    parameters = Column(JSON, nullable=False)            # параметры расчёта (seed, iterations, etc.)
    result_data = Column(JSON, nullable=False)           # полный результат
    result_hash = Column(String(64), nullable=True)      # SHA-256 хэш результата для верификации
    engine_version = Column(String(50), nullable=True)   # версия движка расчёта
    is_reproducible = Column(Boolean, default=True)      # подтверждена ли воспроизводимость
    reproduced_at = Column(DateTime, nullable=True)      # когда последний раз воспроизводили
    reproduction_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EventBusMessage(Base):
    """
    Сообщение шины событий (9.3.1, 9.3.3).
    In-process message broker для MVP.
    """
    __tablename__ = "event_bus_messages"

    id = Column(Integer, primary_key=True, index=True)
    channel = Column(String(100), nullable=False, index=True)   # канал/топик
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=True)
    producer = Column(String(100), nullable=True)    # модуль-источник
    status = Column(String(30), default="published")  # published, consumed, failed, dead_letter
    consumer = Column(String(100), nullable=True)      # модуль-потребитель
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    published_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_event_bus_channel_status", "channel", "status"),
    )


class SystemConstraint(Base):
    """
    Ограничения системы (9.4).
    Хранит и отображает disclaimer-ы и системные ограничения.
    """
    __tablename__ = "system_constraints"

    id = Column(Integer, primary_key=True, index=True)
    constraint_key = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="general")  # general, ai, legal, financial
    severity = Column(String(30), default="info")      # info, warning, critical
    is_active = Column(Boolean, default=True)
    display_in_ui = Column(Boolean, default=True)
    display_in_reports = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
