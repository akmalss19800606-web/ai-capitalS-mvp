"""
Роутер: Совместная работа — threaded discussions + task management.
Фаза 3, Сессия 4 — COLLAB-TEAM-001.1–001.3.

Эндпоинты:
  # Threads
  GET    /decisions/{id}/threads          — список тредов решения
  POST   /decisions/{id}/threads          — новый комментарий / ответ
  PUT    /decisions/{id}/threads/{cid}    — редактировать комментарий
  DELETE /decisions/{id}/threads/{cid}    — удалить комментарий

  # Tasks
  GET    /decisions/{id}/tasks            — список задач решения
  POST   /decisions/{id}/tasks            — создать задачу
  PUT    /tasks/{tid}                     — обновить задачу
  DELETE /tasks/{tid}                     — удалить задачу
  GET    /tasks/my                        — мои задачи
"""
import logging
import traceback
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.investment_decision import InvestmentDecision
from app.schemas.collaboration import (
    ThreadCommentCreate, ThreadCommentUpdate, ThreadCommentResponse,
    TaskItemCreate, TaskItemUpdate, TaskItemResponse,
)
from app.services.collaboration_service import (
    create_comment, list_threads, get_comment, update_comment, delete_comment,
    create_task, list_tasks, get_task, update_task, delete_task, my_tasks,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["collaboration"])


# ═══════════════════════════════════════════════════════════════
# THREADED DISCUSSIONS
# ═══════════════════════════════════════════════════════════════

def _enrich_comment(c) -> dict:
    """Рекурсивно обогатить комментарий именем автора + children."""
    d = {
        "id": c.id,
        "decision_id": c.decision_id,
        "parent_id": c.parent_id,
        "author_id": c.author_id,
        "author_name": c.author.full_name or c.author.email if c.author else None,
        "body": c.body,
        "mentions": c.mentions,
        "is_resolved": c.is_resolved,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "children": [_enrich_comment(ch) for ch in (c.children or [])],
    }
    return d


@router.get("/decisions/{decision_id}/threads", response_model=List[ThreadCommentResponse])
def api_list_threads(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список всех тредов (корневых комментариев) для решения."""
    dec = db.query(InvestmentDecision).filter(InvestmentDecision.id == decision_id).first()
    if not dec:
        raise HTTPException(404, "Решение не найдено")
    roots = list_threads(db, decision_id)
    return [_enrich_comment(r) for r in roots]


@router.post("/decisions/{decision_id}/threads", response_model=ThreadCommentResponse)
def api_create_comment(
    decision_id: int,
    req: ThreadCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать комментарий (или ответ на существующий)."""
    dec = db.query(InvestmentDecision).filter(InvestmentDecision.id == decision_id).first()
    if not dec:
        raise HTTPException(404, "Решение не найдено")
    try:
        c = create_comment(
            db, decision_id, current_user.id,
            body=req.body, parent_id=req.parent_id, mentions=req.mentions,
        )
        return _enrich_comment(c)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception:
        logger.error(traceback.format_exc())
        raise HTTPException(500, "Ошибка при создании комментария")


@router.put("/decisions/{decision_id}/threads/{comment_id}", response_model=ThreadCommentResponse)
def api_update_comment(
    decision_id: int,
    comment_id: int,
    req: ThreadCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Редактировать комментарий."""
    try:
        c = update_comment(db, comment_id, current_user.id, body=req.body, is_resolved=req.is_resolved)
        return _enrich_comment(c)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except PermissionError as e:
        raise HTTPException(403, str(e))


@router.delete("/decisions/{decision_id}/threads/{comment_id}")
def api_delete_comment(
    decision_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить комментарий."""
    try:
        delete_comment(db, comment_id, current_user.id)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(404, str(e))
    except PermissionError as e:
        raise HTTPException(403, str(e))


# ═══════════════════════════════════════════════════════════════
# TASK MANAGEMENT
# ═══════════════════════════════════════════════════════════════

def _enrich_task(t) -> dict:
    return {
        "id": t.id,
        "decision_id": t.decision_id,
        "title": t.title,
        "description": t.description,
        "task_type": t.task_type,
        "status": t.status,
        "priority": t.priority,
        "assignee_id": t.assignee_id,
        "assignee_name": t.assignee.full_name or t.assignee.email if t.assignee else None,
        "creator_id": t.creator_id,
        "creator_name": t.creator.full_name or t.creator.email if t.creator else None,
        "due_date": t.due_date,
        "completed_at": t.completed_at,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


@router.get("/decisions/{decision_id}/tasks", response_model=List[TaskItemResponse])
def api_list_tasks(
    decision_id: int,
    status: Optional[str] = Query(None),
    assignee_id: Optional[int] = Query(None),
    task_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список задач решения с фильтрами."""
    dec = db.query(InvestmentDecision).filter(InvestmentDecision.id == decision_id).first()
    if not dec:
        raise HTTPException(404, "Решение не найдено")
    items = list_tasks(db, decision_id, status=status, assignee_id=assignee_id, task_type=task_type)
    return [_enrich_task(t) for t in items]


@router.post("/decisions/{decision_id}/tasks", response_model=TaskItemResponse)
def api_create_task(
    decision_id: int,
    req: TaskItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать задачу в контексте решения."""
    dec = db.query(InvestmentDecision).filter(InvestmentDecision.id == decision_id).first()
    if not dec:
        raise HTTPException(404, "Решение не найдено")
    try:
        t = create_task(
            db, decision_id, current_user.id,
            title=req.title, description=req.description,
            task_type=req.task_type, priority=req.priority,
            assignee_id=req.assignee_id, due_date=req.due_date,
        )
        return _enrich_task(t)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/tasks/my", response_model=List[TaskItemResponse])
def api_my_tasks(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Все задачи, назначенные текущему пользователю."""
    items = my_tasks(db, current_user.id, status=status)
    return [_enrich_task(t) for t in items]


@router.put("/tasks/{task_id}", response_model=TaskItemResponse)
def api_update_task(
    task_id: int,
    req: TaskItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить задачу (статус, приоритет, назначение, дедлайн)."""
    try:
        t = update_task(
            db, task_id, current_user.id,
            title=req.title, description=req.description,
            status=req.status, priority=req.priority,
            assignee_id=req.assignee_id, due_date=req.due_date,
        )
        return _enrich_task(t)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/tasks/{task_id}")
def api_delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить задачу."""
    try:
        delete_task(db, task_id)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(404, str(e))
