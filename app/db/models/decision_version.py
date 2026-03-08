"""
Decision Version model — хранит полные снимки (snapshots) решения при каждом изменении.
Позволяет: историю изменений, diff между версиями, rollback.

Фаза 1, Сессия 2 — DM-AUDIT-001 (версионирование и аудит)
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class DecisionVersion(Base):
    """
    Иммутабельный снимок решения.
    Каждый раз при изменении решения создаётся новая запись с полным снимком всех полей.
    """
    __tablename__ = "decision_versions"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)  # 1, 2, 3, ...

    # Снимок всех полей решения на момент версии
    snapshot = Column(JSON, nullable=False)  # полный dict всех полей

    # Мета-данные изменения
    change_type = Column(String, nullable=False)  # created, updated, status_changed, rolledback
    changed_fields = Column(JSON, nullable=True)   # ["status", "amount", "price"] — какие поля изменились
    change_reason = Column(Text, nullable=True)     # причина изменения (пользователь может указать)

    # Кто и когда
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    decision = relationship("InvestmentDecision", backref="versions")
    author = relationship("User", foreign_keys=[changed_by])


class AuditEvent(Base):
    """
    Расширенный аудиторский след — кто, когда, что, почему.
    Записывается для всех значимых действий в системе.
    """
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)

    # Что произошло
    entity_type = Column(String, nullable=False, index=True)  # "decision", "portfolio", "user"
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String, nullable=False)  # "create", "update", "delete", "status_change", "rollback", "relationship_add", "relationship_remove"

    # Детали изменения
    old_values = Column(JSON, nullable=True)   # значения до изменения
    new_values = Column(JSON, nullable=True)   # значения после изменения
    metadata_json = Column(JSON, nullable=True)  # доп. контекст

    # Кто и когда
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
