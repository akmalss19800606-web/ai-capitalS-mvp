"""
Роутер: Архитектурные принципы — Event Sourcing, HITL, Воспроизводимость, Event Bus, Ограничения.
Фаза 4, Сессия 4 — разделы 9.2–9.4 ТЗ v2.3.

Эндпоинты:
  # Event Sourcing (9.2.2)
  POST   /arch/events                  — записать событие
  GET    /arch/events                  — timeline событий
  GET    /arch/events/stats            — статистика
  GET    /arch/events/{type}/{id}      — события агрегата
  GET    /arch/events/{type}/{id}/state — проекция состояния

  # HITL + Объяснимость (9.2.1, 9.2.3)
  POST   /arch/hitl/reviews            — создать ревью
  GET    /arch/hitl/reviews            — список ревью
  PUT    /arch/hitl/reviews/{id}       — одобрить/отклонить
  GET    /arch/hitl/stats              — статистика
  GET    /arch/hitl/disclaimers        — disclaimers

  # Воспроизводимость (9.2.4)
  POST   /arch/snapshots               — создать снапшот
  GET    /arch/snapshots               — список снапшотов
  GET    /arch/snapshots/{id}          — детали снапшота
  POST   /arch/snapshots/{id}/reproduce — воспроизвести
  GET    /arch/snapshots/stats         — статистика

  # Event Bus (9.3.1, 9.3.3)
  POST   /arch/bus/publish             — опубликовать сообщение
  POST   /arch/bus/consume             — получить сообщения
  GET    /arch/bus/channels            — список каналов
  GET    /arch/bus/messages/{channel}  — сообщения канала
  GET    /arch/bus/dead-letter         — dead letter queue
  POST   /arch/bus/dead-letter/{id}/retry — повторить из DLQ
  GET    /arch/bus/stats               — статистика
  POST   /arch/bus/messages/{id}/fail  — пометить как failed

  # Ограничения системы (9.4)
  POST   /arch/constraints             — создать ограничение
  GET    /arch/constraints             — список ограничений
  PUT    /arch/constraints/{id}        — обновить
  DELETE /arch/constraints/{id}        — удалить
  POST   /arch/constraints/seed        — загрузить стандартные
  GET    /arch/constraints/ui          — для UI
  GET    /arch/constraints/reports     — для отчётов
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.v1.routers.auth import get_current_user
from app.db.models.user import User

from app.schemas.architectural_principles import (
    SystemEventCreate, SystemEventResponse, AggregateStateResponse, EventTimelineResponse,
    HitlReviewCreate, HitlReviewResponse, HitlReviewAction, HitlStatsResponse,
    SnapshotCreate, SnapshotResponse, ReproduceResponse,
    EventBusPublish, EventBusMessageResponse, EventBusConsumeRequest, EventBusStatsResponse,
    SystemConstraintCreate, SystemConstraintResponse, SystemConstraintUpdate,
)

from app.services.event_sourcing_service import (
    emit_event, get_aggregate_events, get_aggregate_state,
    get_events_timeline, get_event_stats,
)
from app.services.hitl_service import (
    create_hitl_review, list_hitl_reviews, get_hitl_review,
    act_on_review, get_hitl_stats, get_disclaimers,
)
from app.services.reproducibility_service import (
    create_snapshot, list_snapshots, get_snapshot,
    reproduce_analysis, get_snapshot_stats,
)
from app.services.event_bus_service import (
    publish_message, consume_messages, get_channel_messages,
    get_dead_letter_queue, retry_dead_letter, get_event_bus_stats,
    mark_failed, list_channels,
)
from app.services.constraints_service import (
    seed_default_constraints, list_constraints, get_constraint,
    create_constraint, update_constraint, delete_constraint,
    get_ui_disclaimers, get_report_disclaimers,
)

router = APIRouter(prefix="/arch", tags=["architectural-principles"])


# ═══════════════════════════════════════════════════════════════
# EVENT SOURCING (9.2.2)
# ═══════════════════════════════════════════════════════════════

@router.post("/events", response_model=SystemEventResponse)
def record_event(
    body: SystemEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return emit_event(
        db, current_user.id,
        aggregate_type=body.aggregate_type,
        aggregate_id=body.aggregate_id,
        event_type=body.event_type,
        event_data=body.event_data,
        previous_state=body.previous_state,
        new_state=body.new_state,
        correlation_id=body.correlation_id,
        causation_id=body.causation_id,
        metadata=body.metadata_,
    )


@router.get("/events")
def events_timeline(
    aggregate_type: Optional[str] = None,
    event_type: Optional[str] = None,
    correlation_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_events_timeline(
        db, user_id=current_user.id,
        aggregate_type=aggregate_type,
        event_type=event_type,
        correlation_id=correlation_id,
        limit=limit,
    )


@router.get("/events/stats")
def event_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_event_stats(db, user_id=current_user.id)


@router.get("/events/{aggregate_type}/{aggregate_id}")
def aggregate_events(
    aggregate_type: str,
    aggregate_id: int,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = get_aggregate_events(db, aggregate_type, aggregate_id, limit, offset)
    return {"aggregate_type": aggregate_type, "aggregate_id": aggregate_id, "events": events}


@router.get("/events/{aggregate_type}/{aggregate_id}/state")
def aggregate_state(
    aggregate_type: str,
    aggregate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_aggregate_state(db, aggregate_type, aggregate_id)


# ═══════════════════════════════════════════════════════════════
# HITL + ОБЪЯСНИМОСТЬ (9.2.1, 9.2.3)
# ═══════════════════════════════════════════════════════════════

@router.post("/hitl/reviews", response_model=HitlReviewResponse)
def add_hitl_review(
    body: HitlReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_hitl_review(
        db, current_user.id,
        ai_output_type=body.ai_output_type,
        ai_output_id=body.ai_output_id,
        ai_output_summary=body.ai_output_summary,
        ai_confidence=body.ai_confidence,
        explanation_text=body.explanation_text,
        explanation_factors=body.explanation_factors,
    )


@router.get("/hitl/reviews", response_model=list[HitlReviewResponse])
def get_hitl_reviews(
    status: Optional[str] = None,
    ai_output_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_hitl_reviews(db, current_user.id, status, ai_output_type, limit)


@router.put("/hitl/reviews/{review_id}", response_model=HitlReviewResponse)
def update_hitl_review(
    review_id: int,
    body: HitlReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = get_hitl_review(db, review_id)
    if not review:
        raise HTTPException(404, "Ревью не найдено")
    if review.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    updated = act_on_review(db, review_id, body.status, body.comment)
    if not updated:
        raise HTTPException(500, "Ошибка обновления")
    return updated


@router.get("/hitl/stats")
def hitl_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_hitl_stats(db, current_user.id)


@router.get("/hitl/disclaimers")
def hitl_disclaimers(
    applies_to: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    return get_disclaimers(applies_to)


# ═══════════════════════════════════════════════════════════════
# ВОСПРОИЗВОДИМОСТЬ (9.2.4)
# ═══════════════════════════════════════════════════════════════

@router.post("/snapshots", response_model=SnapshotResponse)
def add_snapshot(
    body: SnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_snapshot(
        db, current_user.id,
        analysis_type=body.analysis_type,
        input_data=body.input_data,
        parameters=body.parameters,
        result_data=body.result_data,
        analysis_id=body.analysis_id,
        engine_version=body.engine_version,
        notes=body.notes,
    )


@router.get("/snapshots", response_model=list[SnapshotResponse])
def get_snapshots(
    analysis_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_snapshots(db, current_user.id, analysis_type, limit)


@router.get("/snapshots/stats")
def snapshot_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_snapshot_stats(db, current_user.id)


@router.get("/snapshots/{snapshot_id}", response_model=SnapshotResponse)
def get_snapshot_detail(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snap = get_snapshot(db, snapshot_id)
    if not snap:
        raise HTTPException(404, "Снапшот не найден")
    if snap.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return snap


@router.post("/snapshots/{snapshot_id}/reproduce")
def reproduce_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snap = get_snapshot(db, snapshot_id)
    if not snap:
        raise HTTPException(404, "Снапшот не найден")
    if snap.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    try:
        return reproduce_analysis(db, snapshot_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ═══════════════════════════════════════════════════════════════
# EVENT BUS (9.3.1, 9.3.3)
# ═══════════════════════════════════════════════════════════════

@router.post("/bus/publish", response_model=EventBusMessageResponse)
def bus_publish(
    body: EventBusPublish,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return publish_message(db, body.channel, body.event_type, body.payload, body.producer)


@router.post("/bus/consume")
def bus_consume(
    body: EventBusConsumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = consume_messages(db, body.channel, body.consumer, body.max_messages)
    return {"consumed": len(messages), "messages": messages}


@router.get("/bus/channels")
def bus_channels(
    current_user: User = Depends(get_current_user),
):
    return list_channels()


@router.get("/bus/messages/{channel}")
def bus_channel_messages(
    channel: str,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msgs = get_channel_messages(db, channel, status, limit)
    return {"channel": channel, "messages": msgs}


@router.get("/bus/dead-letter")
def bus_dead_letter(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dead_letter_queue(db, limit)


@router.post("/bus/dead-letter/{message_id}/retry", response_model=EventBusMessageResponse)
def bus_retry_dlq(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = retry_dead_letter(db, message_id)
    if not msg:
        raise HTTPException(404, "Сообщение не найдено или не в DLQ")
    return msg


@router.post("/bus/messages/{message_id}/fail")
def bus_mark_failed(
    message_id: int,
    error_message: str = "Manual failure",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = mark_failed(db, message_id, error_message)
    if not msg:
        raise HTTPException(404, "Сообщение не найдено")
    return msg


@router.get("/bus/stats")
def bus_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_event_bus_stats(db)


# ═══════════════════════════════════════════════════════════════
# ОГРАНИЧЕНИЯ СИСТЕМЫ (9.4)
# ═══════════════════════════════════════════════════════════════

@router.post("/constraints/seed")
def seed_constraints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = seed_default_constraints(db)
    return {"seeded": count}


@router.post("/constraints", response_model=SystemConstraintResponse)
def add_constraint(
    body: SystemConstraintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_constraint(db, **body.model_dump())


@router.get("/constraints", response_model=list[SystemConstraintResponse])
def get_constraints(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_constraints(db, category, active_only)


@router.put("/constraints/{constraint_id}", response_model=SystemConstraintResponse)
def edit_constraint(
    constraint_id: int,
    body: SystemConstraintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = update_constraint(db, constraint_id, **body.model_dump(exclude_unset=True))
    if not c:
        raise HTTPException(404, "Ограничение не найдено")
    return c


@router.delete("/constraints/{constraint_id}")
def remove_constraint(
    constraint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not delete_constraint(db, constraint_id):
        raise HTTPException(404, "Ограничение не найдено")
    return {"detail": "Ограничение удалено"}


@router.get("/constraints/ui")
def constraints_for_ui(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_ui_disclaimers(db)


@router.get("/constraints/reports")
def constraints_for_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_report_disclaimers(db)
