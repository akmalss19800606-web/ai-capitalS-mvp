"""
Workflow Engine models — настраиваемые цепочки согласования.

Архитектура:
  WorkflowDefinition — шаблон workflow (JSON-описание шагов, пороговых значений, ролей)
  WorkflowInstance   — конкретный запущенный экземпляр workflow, привязанный к решению
  WorkflowStep       — отдельный шаг в экземпляре (одобрение/отклонение/ожидание)

Фаза 1, Сессия 3 — DM-WF-001
"""
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class WorkflowTrigger(str, enum.Enum):
    """Когда запускается workflow."""
    ON_REVIEW = "on_review"                 # При переходе решения в статус "review"
    ON_AMOUNT_THRESHOLD = "on_amount_threshold"  # При превышении суммы инвестиции
    MANUAL = "manual"                       # Ручной запуск


class WorkflowStatus(str, enum.Enum):
    """Статус экземпляра workflow."""
    ACTIVE = "active"       # В процессе
    COMPLETED = "completed" # Все шаги пройдены
    REJECTED = "rejected"   # Отклонён на одном из шагов
    CANCELLED = "cancelled" # Отменён
    EXPIRED = "expired"     # Просрочен (SLA)


class StepStatus(str, enum.Enum):
    """Статус отдельного шага."""
    PENDING = "pending"     # Ожидает действия
    APPROVED = "approved"   # Одобрен
    REJECTED = "rejected"   # Отклонён
    SKIPPED = "skipped"     # Пропущен (условие не выполнено)
    EXPIRED = "expired"     # Просрочен


class StepType(str, enum.Enum):
    """Тип шага."""
    APPROVAL = "approval"       # Одобрение
    NOTIFICATION = "notification" # Уведомление (без действия)
    CONDITION = "condition"     # Условный переход


# ─── Models ───────────────────────────────────────────────────────────────────

class WorkflowDefinition(Base):
    """
    Шаблон цепочки согласования.
    Содержит JSON-описание шагов и условий запуска.
    """
    __tablename__ = "workflow_definitions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)                  # "Стандартное согласование"
    description = Column(Text, nullable=True)
    trigger_type = Column(Enum(WorkflowTrigger), nullable=False, default=WorkflowTrigger.ON_REVIEW)
    trigger_condition = Column(JSON, nullable=True)        # {"min_amount": 100000, "categories": ["equity"]}
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)            # Workflow по умолчанию

    # JSON-описание шагов шаблона
    # [{"order": 1, "name": "Проверка аналитиком", "type": "approval", "role": "analyst", "sla_hours": 24},
    #  {"order": 2, "name": "Утверждение IC", "type": "approval", "role": "ic_member", "sla_hours": 48}]
    steps_template = Column(JSON, nullable=False, default=list)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    instances = relationship("WorkflowInstance", back_populates="definition", cascade="all, delete-orphan")


class WorkflowInstance(Base):
    """
    Конкретный запущенный экземпляр workflow, привязанный к решению.
    """
    __tablename__ = "workflow_instances"

    id = Column(Integer, primary_key=True, index=True)
    definition_id = Column(Integer, ForeignKey("workflow_definitions.id"), nullable=False)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id"), nullable=False, index=True)
    status = Column(Enum(WorkflowStatus), nullable=False, default=WorkflowStatus.ACTIVE)
    current_step_order = Column(Integer, default=1)   # Текущий активный шаг

    started_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column(JSON, nullable=True)       # Дополнительный контекст

    # Relationships
    definition = relationship("WorkflowDefinition", back_populates="instances")
    decision = relationship("InvestmentDecision", backref="workflow_instances")
    initiator = relationship("User", foreign_keys=[started_by])
    steps = relationship("WorkflowStep", back_populates="instance", cascade="all, delete-orphan",
                         order_by="WorkflowStep.step_order")


class WorkflowStep(Base):
    """
    Отдельный шаг в экземпляре workflow.
    """
    __tablename__ = "workflow_steps"

    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)       # Порядковый номер шага
    name = Column(String, nullable=False)              # "Проверка аналитиком"
    step_type = Column(Enum(StepType), nullable=False, default=StepType.APPROVAL)
    status = Column(Enum(StepStatus), nullable=False, default=StepStatus.PENDING)

    # Кто должен выполнить и кто выполнил
    assigned_role = Column(String, nullable=True)       # "analyst", "ic_member", "partner"
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Конкретный пользователь
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # SLA
    sla_hours = Column(Integer, nullable=True)          # Дедлайн в часах от момента активации
    deadline_at = Column(DateTime(timezone=True), nullable=True)

    # Результат
    comment = Column(Text, nullable=True)               # Комментарий при одобрении/отклонении
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instance = relationship("WorkflowInstance", back_populates="steps")
    assignee = relationship("User", foreign_keys=[assigned_to])
    completer = relationship("User", foreign_keys=[completed_by])
