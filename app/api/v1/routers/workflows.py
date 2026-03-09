"""
API роутер: Workflow Engine — настраиваемые цепочки согласования.
Фаза 1, Сессия 3 — DM-WF-001

Endpoints:
  ─ Definitions ─
  GET    /workflows/definitions              — список шаблонов workflow
  POST   /workflows/definitions              — создать шаблон
  GET    /workflows/definitions/{id}         — получить шаблон
  PUT    /workflows/definitions/{id}         — обновить шаблон
  DELETE /workflows/definitions/{id}         — удалить шаблон

  ─ Instances ─
  GET    /workflows/instances                — список запущенных workflow
  POST   /workflows/instances                — запустить workflow для решения
  GET    /workflows/instances/{id}           — получить экземпляр + шаги
  POST   /workflows/instances/{id}/cancel    — отменить workflow

  ─ Steps ─
  POST   /workflows/steps/{step_id}/action   — одобрить / отклонить шаг

  ─ Dashboard ─
  GET    /workflows/my-tasks                 — мои задачи на согласование
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session, joinedload

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.workflow import (
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowStep,
    WorkflowTrigger,
    WorkflowStatus,
    StepStatus,
    StepType,
)
from app.schemas.workflow import (
    WorkflowDefinitionCreate,
    WorkflowDefinitionUpdate,
    WorkflowDefinitionRead,
    WorkflowDefinitionListResponse,
    WorkflowInstanceCreate,
    WorkflowInstanceRead,
    WorkflowInstanceListResponse,
    WorkflowStepRead,
    StepActionRequest,
    StepActionResponse,
)

router = APIRouter(tags=["workflows"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _def_to_read(wf: WorkflowDefinition) -> WorkflowDefinitionRead:
    return WorkflowDefinitionRead(
        id=wf.id,
        name=wf.name,
        description=wf.description,
        trigger_type=wf.trigger_type.value if hasattr(wf.trigger_type, "value") else wf.trigger_type,
        trigger_condition=wf.trigger_condition,
        is_active=wf.is_active,
        is_default=wf.is_default,
        steps_template=wf.steps_template or [],
        created_by=wf.created_by,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
    )


def _instance_to_read(inst: WorkflowInstance) -> WorkflowInstanceRead:
    steps = []
    for s in (inst.steps or []):
        steps.append(WorkflowStepRead(
            id=s.id,
            instance_id=s.instance_id,
            step_order=s.step_order,
            name=s.name,
            step_type=s.step_type.value if hasattr(s.step_type, "value") else s.step_type,
            status=s.status.value if hasattr(s.status, "value") else s.status,
            assigned_role=s.assigned_role,
            assigned_to=s.assigned_to,
            completed_by=s.completed_by,
            sla_hours=s.sla_hours,
            deadline_at=s.deadline_at,
            comment=s.comment,
            completed_at=s.completed_at,
            created_at=s.created_at,
        ))

    return WorkflowInstanceRead(
        id=inst.id,
        definition_id=inst.definition_id,
        decision_id=inst.decision_id,
        status=inst.status.value if hasattr(inst.status, "value") else inst.status,
        current_step_order=inst.current_step_order,
        started_by=inst.started_by,
        started_at=inst.started_at,
        completed_at=inst.completed_at,
        metadata_json=inst.metadata_json,
        steps=steps,
        definition_name=inst.definition.name if inst.definition else None,
        decision_name=inst.decision.asset_name if inst.decision else None,
    )


def _activate_step(step: WorkflowStep) -> None:
    """Установить дедлайн для активного шага на основе SLA."""
    if step.sla_hours:
        step.deadline_at = datetime.now(timezone.utc) + timedelta(hours=step.sla_hours)


# ═══════════════════════════════════════════════════════════════════════════════
# ─── DEFINITIONS ──────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflows/definitions", response_model=WorkflowDefinitionListResponse)
def list_definitions(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список всех шаблонов workflow."""
    query = db.query(WorkflowDefinition).filter(WorkflowDefinition.created_by == current_user.id)
    if is_active is not None:
        query = query.filter(WorkflowDefinition.is_active == is_active)
    items = query.order_by(WorkflowDefinition.created_at.desc()).all()
    return WorkflowDefinitionListResponse(
        items=[_def_to_read(d) for d in items],
        total=len(items),
    )


@router.post("/workflows/definitions", response_model=WorkflowDefinitionRead, status_code=http_status.HTTP_201_CREATED)
def create_definition(
    data: WorkflowDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать шаблон workflow."""
    # Валидация trigger_type
    try:
        trigger = WorkflowTrigger(data.trigger_type)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Недопустимый trigger_type: {data.trigger_type}. Допустимые: {[t.value for t in WorkflowTrigger]}",
        )

    # Если ставим is_default=True, сбросить предыдущий default
    if data.is_default:
        db.query(WorkflowDefinition).filter(
            WorkflowDefinition.created_by == current_user.id,
            WorkflowDefinition.is_default == True,
        ).update({"is_default": False})

    # Сериализация steps_template
    steps_json = [s.model_dump() for s in data.steps_template]

    wf = WorkflowDefinition(
        name=data.name,
        description=data.description,
        trigger_type=trigger,
        trigger_condition=data.trigger_condition,
        is_active=data.is_active,
        is_default=data.is_default,
        steps_template=steps_json,
        created_by=current_user.id,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _def_to_read(wf)


@router.get("/workflows/definitions/{definition_id}", response_model=WorkflowDefinitionRead)
def get_definition(
    definition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить шаблон workflow по ID."""
    wf = (
        db.query(WorkflowDefinition)
        .filter(WorkflowDefinition.id == definition_id, WorkflowDefinition.created_by == current_user.id)
        .first()
    )
    if not wf:
        raise HTTPException(status_code=404, detail="Шаблон workflow не найден")
    return _def_to_read(wf)


@router.put("/workflows/definitions/{definition_id}", response_model=WorkflowDefinitionRead)
def update_definition(
    definition_id: int,
    data: WorkflowDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить шаблон workflow."""
    wf = (
        db.query(WorkflowDefinition)
        .filter(WorkflowDefinition.id == definition_id, WorkflowDefinition.created_by == current_user.id)
        .first()
    )
    if not wf:
        raise HTTPException(status_code=404, detail="Шаблон workflow не найден")

    update_data = data.model_dump(exclude_unset=True)

    if "trigger_type" in update_data:
        try:
            update_data["trigger_type"] = WorkflowTrigger(update_data["trigger_type"])
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый trigger_type: {update_data['trigger_type']}")

    if "is_default" in update_data and update_data["is_default"]:
        db.query(WorkflowDefinition).filter(
            WorkflowDefinition.created_by == current_user.id,
            WorkflowDefinition.is_default == True,
            WorkflowDefinition.id != definition_id,
        ).update({"is_default": False})

    if "steps_template" in update_data and update_data["steps_template"] is not None:
        update_data["steps_template"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in update_data["steps_template"]]

    for key, value in update_data.items():
        setattr(wf, key, value)

    db.commit()
    db.refresh(wf)
    return _def_to_read(wf)


@router.delete("/workflows/definitions/{definition_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_definition(
    definition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить шаблон workflow (каскадно удалит instances и steps)."""
    wf = (
        db.query(WorkflowDefinition)
        .filter(WorkflowDefinition.id == definition_id, WorkflowDefinition.created_by == current_user.id)
        .first()
    )
    if not wf:
        raise HTTPException(status_code=404, detail="Шаблон workflow не найден")

    # Проверка: нет активных instances
    active_count = (
        db.query(WorkflowInstance)
        .filter(WorkflowInstance.definition_id == definition_id, WorkflowInstance.status == WorkflowStatus.ACTIVE)
        .count()
    )
    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Невозможно удалить: есть {active_count} активных процессов согласования",
        )

    db.delete(wf)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# ─── INSTANCES ────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflows/instances", response_model=WorkflowInstanceListResponse)
def list_instances(
    status: Optional[str] = Query(None),
    decision_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список запущенных workflow."""
    query = (
        db.query(WorkflowInstance)
        .options(joinedload(WorkflowInstance.steps), joinedload(WorkflowInstance.definition), joinedload(WorkflowInstance.decision))
        .filter(WorkflowInstance.started_by == current_user.id)
    )

    if status:
        try:
            ws = WorkflowStatus(status)
            query = query.filter(WorkflowInstance.status == ws)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Недопустимый статус: {status}")

    if decision_id:
        query = query.filter(WorkflowInstance.decision_id == decision_id)

    items = query.order_by(WorkflowInstance.started_at.desc()).all()
    return WorkflowInstanceListResponse(
        items=[_instance_to_read(i) for i in items],
        total=len(items),
    )


@router.post("/workflows/instances", response_model=WorkflowInstanceRead, status_code=http_status.HTTP_201_CREATED)
def launch_workflow(
    data: WorkflowInstanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запустить workflow для решения."""
    # Проверка: шаблон существует и активен
    definition = (
        db.query(WorkflowDefinition)
        .filter(WorkflowDefinition.id == data.definition_id, WorkflowDefinition.created_by == current_user.id)
        .first()
    )
    if not definition:
        raise HTTPException(status_code=404, detail="Шаблон workflow не найден")
    if not definition.is_active:
        raise HTTPException(status_code=400, detail="Шаблон workflow неактивен")

    # Проверка: решение существует
    decision = (
        db.query(InvestmentDecision)
        .filter(InvestmentDecision.id == data.decision_id, InvestmentDecision.created_by == current_user.id)
        .first()
    )
    if not decision:
        raise HTTPException(status_code=404, detail="Инвестиционное решение не найдено")

    # Проверка: нет уже активного workflow для этого решения
    existing = (
        db.query(WorkflowInstance)
        .filter(
            WorkflowInstance.decision_id == data.decision_id,
            WorkflowInstance.status == WorkflowStatus.ACTIVE,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Для этого решения уже есть активный процесс согласования")

    # Создать instance
    instance = WorkflowInstance(
        definition_id=definition.id,
        decision_id=decision.id,
        status=WorkflowStatus.ACTIVE,
        current_step_order=1,
        started_by=current_user.id,
    )
    db.add(instance)
    db.flush()

    # Создать шаги из шаблона
    steps_template = definition.steps_template or []
    for tmpl in steps_template:
        step_type_val = tmpl.get("step_type", "approval")
        try:
            st = StepType(step_type_val)
        except ValueError:
            st = StepType.APPROVAL

        step = WorkflowStep(
            instance_id=instance.id,
            step_order=tmpl.get("order", 1),
            name=tmpl.get("name", "Шаг"),
            step_type=st,
            status=StepStatus.PENDING,
            assigned_role=tmpl.get("role"),
            sla_hours=tmpl.get("sla_hours"),
        )
        db.add(step)

    db.commit()
    db.refresh(instance)

    # Активировать первый шаг (установить deadline)
    first_step = (
        db.query(WorkflowStep)
        .filter(WorkflowStep.instance_id == instance.id, WorkflowStep.step_order == 1)
        .first()
    )
    if first_step:
        _activate_step(first_step)
        db.commit()

    # Загрузить relationships для response
    instance = (
        db.query(WorkflowInstance)
        .options(joinedload(WorkflowInstance.steps), joinedload(WorkflowInstance.definition), joinedload(WorkflowInstance.decision))
        .filter(WorkflowInstance.id == instance.id)
        .first()
    )

    return _instance_to_read(instance)


@router.get("/workflows/instances/{instance_id}", response_model=WorkflowInstanceRead)
def get_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить экземпляр workflow с шагами."""
    instance = (
        db.query(WorkflowInstance)
        .options(joinedload(WorkflowInstance.steps), joinedload(WorkflowInstance.definition), joinedload(WorkflowInstance.decision))
        .filter(WorkflowInstance.id == instance_id, WorkflowInstance.started_by == current_user.id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Процесс согласования не найден")
    return _instance_to_read(instance)


@router.post("/workflows/instances/{instance_id}/cancel", response_model=WorkflowInstanceRead)
def cancel_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отменить активный workflow."""
    instance = (
        db.query(WorkflowInstance)
        .options(joinedload(WorkflowInstance.steps), joinedload(WorkflowInstance.definition), joinedload(WorkflowInstance.decision))
        .filter(WorkflowInstance.id == instance_id, WorkflowInstance.started_by == current_user.id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Процесс согласования не найден")

    if instance.status != WorkflowStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Можно отменить только активный процесс")

    instance.status = WorkflowStatus.CANCELLED
    instance.completed_at = datetime.now(timezone.utc)

    # Отметить pending шаги как skipped
    for step in instance.steps:
        if step.status == StepStatus.PENDING:
            step.status = StepStatus.SKIPPED

    db.commit()
    db.refresh(instance)
    return _instance_to_read(instance)


# ═══════════════════════════════════════════════════════════════════════════════
# ─── STEP ACTIONS ─────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflows/steps/{step_id}/action", response_model=StepActionResponse)
def perform_step_action(
    step_id: int,
    data: StepActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Выполнить действие по шагу: approve или reject."""
    step = (
        db.query(WorkflowStep)
        .options(joinedload(WorkflowStep.instance).joinedload(WorkflowInstance.steps))
        .filter(WorkflowStep.id == step_id)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Шаг не найден")

    instance = step.instance
    if not instance or instance.started_by != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому процессу")

    if instance.status != WorkflowStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Процесс согласования неактивен")

    if step.status != StepStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Шаг уже имеет статус: {step.status.value if hasattr(step.status, 'value') else step.status}")

    if step.step_order != instance.current_step_order:
        raise HTTPException(status_code=400, detail="Этот шаг ещё не активен. Дождитесь очереди.")

    action = data.action.lower()
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail="Допустимые действия: approve, reject")

    now = datetime.now(timezone.utc)
    step.comment = data.comment
    step.completed_by = current_user.id
    step.completed_at = now

    if action == "approve":
        step.status = StepStatus.APPROVED

        # Переход к следующему шагу
        next_step = (
            db.query(WorkflowStep)
            .filter(
                WorkflowStep.instance_id == instance.id,
                WorkflowStep.step_order == step.step_order + 1,
            )
            .first()
        )

        if next_step:
            instance.current_step_order = next_step.step_order
            _activate_step(next_step)
            instance_status = WorkflowStatus.ACTIVE
            message = f"Шаг '{step.name}' одобрен. Следующий: '{next_step.name}'"
        else:
            # Все шаги пройдены
            instance.status = WorkflowStatus.COMPLETED
            instance.completed_at = now
            instance_status = WorkflowStatus.COMPLETED
            message = f"Шаг '{step.name}' одобрен. Процесс согласования завершён."

    else:  # reject
        step.status = StepStatus.REJECTED
        instance.status = WorkflowStatus.REJECTED
        instance.completed_at = now
        instance_status = WorkflowStatus.REJECTED
        message = f"Шаг '{step.name}' отклонён. Процесс согласования отклонён."

        # Отметить оставшиеся pending шаги как skipped
        remaining = (
            db.query(WorkflowStep)
            .filter(
                WorkflowStep.instance_id == instance.id,
                WorkflowStep.step_order > step.step_order,
                WorkflowStep.status == StepStatus.PENDING,
            )
            .all()
        )
        for r in remaining:
            r.status = StepStatus.SKIPPED

    db.commit()

    return StepActionResponse(
        step_id=step.id,
        step_name=step.name,
        new_status=step.status.value if hasattr(step.status, "value") else step.status,
        instance_status=instance_status.value if hasattr(instance_status, "value") else instance_status,
        message=message,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ─── MY TASKS ─────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflows/my-tasks")
def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список шагов, ожидающих действия текущего пользователя.
    Возвращает pending шаги из активных workflow, которые сейчас «на очереди».
    """
    # Все активные instances пользователя
    active_instances = (
        db.query(WorkflowInstance)
        .filter(
            WorkflowInstance.started_by == current_user.id,
            WorkflowInstance.status == WorkflowStatus.ACTIVE,
        )
        .all()
    )

    tasks = []
    for inst in active_instances:
        # Найти текущий pending шаг
        current_step = (
            db.query(WorkflowStep)
            .filter(
                WorkflowStep.instance_id == inst.id,
                WorkflowStep.step_order == inst.current_step_order,
                WorkflowStep.status == StepStatus.PENDING,
            )
            .first()
        )
        if current_step:
            decision = db.query(InvestmentDecision).filter(InvestmentDecision.id == inst.decision_id).first()
            definition = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == inst.definition_id).first()

            is_overdue = False
            if current_step.deadline_at and datetime.now(timezone.utc) > current_step.deadline_at:
                is_overdue = True

            tasks.append({
                "step_id": current_step.id,
                "step_name": current_step.name,
                "step_type": current_step.step_type.value if hasattr(current_step.step_type, "value") else current_step.step_type,
                "step_order": current_step.step_order,
                "instance_id": inst.id,
                "definition_name": definition.name if definition else None,
                "decision_id": inst.decision_id,
                "decision_name": decision.asset_name if decision else None,
                "decision_symbol": decision.asset_symbol if decision else None,
                "sla_hours": current_step.sla_hours,
                "deadline_at": current_step.deadline_at.isoformat() if current_step.deadline_at else None,
                "is_overdue": is_overdue,
                "started_at": inst.started_at.isoformat() if inst.started_at else None,
            })

    # Сортировка: просроченные первыми, потом по deadline
    tasks.sort(key=lambda t: (not t["is_overdue"], t["deadline_at"] or "9999"))

    return {"items": tasks, "total": len(tasks)}
