"""
Pydantic-схемы для Workflow Engine.
Фаза 1, Сессия 3 — DM-WF-001
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ─── Шаблон шага (внутри steps_template JSON) ────────────────────────────────

class StepTemplateItem(BaseModel):
    """Один шаг в шаблоне workflow (хранится как JSON в WorkflowDefinition.steps_template)."""
    order: int = Field(..., description="Порядковый номер шага")
    name: str = Field(..., description="Название шага, напр. 'Проверка аналитиком'")
    step_type: str = Field("approval", description="Тип: approval | notification | condition")
    role: Optional[str] = Field(None, description="Роль исполнителя: analyst | ic_member | partner")
    sla_hours: Optional[int] = Field(None, description="SLA в часах")
    description: Optional[str] = None


# ─── Workflow Definition ──────────────────────────────────────────────────────

class WorkflowDefinitionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    trigger_type: str = Field("on_review", description="Триггер: on_review | on_amount_threshold | manual")
    trigger_condition: Optional[Dict[str, Any]] = Field(
        None,
        description='Условие триггера, напр. {"min_amount": 100000, "categories": ["equity"]}',
    )
    is_active: bool = True
    is_default: bool = False
    steps_template: List[StepTemplateItem] = Field(
        ...,
        min_length=1,
        description="Минимум 1 шаг в цепочке согласования",
    )


class WorkflowDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_condition: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    steps_template: Optional[List[StepTemplateItem]] = None


class WorkflowDefinitionRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_condition: Optional[Dict[str, Any]] = None
    is_active: bool
    is_default: bool
    steps_template: List[Dict[str, Any]]
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowDefinitionListResponse(BaseModel):
    items: List[WorkflowDefinitionRead]
    total: int


# ─── Workflow Instance ────────────────────────────────────────────────────────

class WorkflowInstanceCreate(BaseModel):
    """Запуск workflow для конкретного решения."""
    definition_id: int
    decision_id: int


class WorkflowStepRead(BaseModel):
    id: int
    instance_id: int
    step_order: int
    name: str
    step_type: str
    status: str
    assigned_role: Optional[str] = None
    assigned_to: Optional[int] = None
    completed_by: Optional[int] = None
    sla_hours: Optional[int] = None
    deadline_at: Optional[datetime] = None
    comment: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowInstanceRead(BaseModel):
    id: int
    definition_id: int
    decision_id: int
    status: str
    current_step_order: int
    started_by: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    metadata_json: Optional[Dict[str, Any]] = None
    steps: List[WorkflowStepRead] = []
    # Доп. поля для UI
    definition_name: Optional[str] = None
    decision_name: Optional[str] = None

    class Config:
        from_attributes = True


class WorkflowInstanceListResponse(BaseModel):
    items: List[WorkflowInstanceRead]
    total: int


# ─── Step Action ──────────────────────────────────────────────────────────────

class StepActionRequest(BaseModel):
    """Действие по шагу: одобрить / отклонить."""
    action: str = Field(..., description="approve | reject")
    comment: Optional[str] = None


class StepActionResponse(BaseModel):
    step_id: int
    step_name: str
    new_status: str
    instance_status: str
    message: str
