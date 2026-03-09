"""
Сервис совместной работы — треды, @mentions, задачи.
Фаза 3, Сессия 4 — COLLAB-TEAM-001.1–001.3.
"""
import re
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.collaboration import ThreadComment, TaskItem, Notification
from app.db.models.user import User

logger = logging.getLogger(__name__)

MENTION_RE = re.compile(r"@\[(\d+)\]")  # формат @[user_id]


# ═══════════════════════════════════════════════════════════════
# THREADED DISCUSSIONS  (COLLAB-TEAM-001.1)
# ═══════════════════════════════════════════════════════════════

def create_comment(
    db: Session,
    decision_id: int,
    author_id: int,
    body: str,
    parent_id: Optional[int] = None,
    mentions: Optional[List[int]] = None,
) -> ThreadComment:
    """Создать комментарий (или ответ, если parent_id указан)."""
    # Если parent_id — проверяем что он из того же decision
    if parent_id:
        parent = db.query(ThreadComment).filter(
            ThreadComment.id == parent_id,
            ThreadComment.decision_id == decision_id,
        ).first()
        if not parent:
            raise ValueError("Родительский комментарий не найден в данном решении")

    # Авто-парсинг @mentions из тела
    parsed_mentions = [int(m) for m in MENTION_RE.findall(body)]
    all_mentions = list(set((mentions or []) + parsed_mentions))

    comment = ThreadComment(
        decision_id=decision_id,
        parent_id=parent_id,
        author_id=author_id,
        body=body,
        mentions=all_mentions if all_mentions else None,
    )
    db.add(comment)
    db.flush()

    # Уведомления по @mentions (COLLAB-TEAM-001.2)
    if all_mentions:
        _notify_mentions(db, comment, all_mentions)

    db.commit()
    db.refresh(comment)
    return comment


def list_threads(db: Session, decision_id: int) -> List[ThreadComment]:
    """Получить все корневые комментарии (parent_id = NULL) для решения."""
    return (
        db.query(ThreadComment)
        .filter(
            ThreadComment.decision_id == decision_id,
            ThreadComment.parent_id.is_(None),
        )
        .order_by(ThreadComment.created_at.asc())
        .all()
    )


def get_comment(db: Session, comment_id: int) -> Optional[ThreadComment]:
    return db.query(ThreadComment).filter(ThreadComment.id == comment_id).first()


def update_comment(
    db: Session, comment_id: int, author_id: int, body: Optional[str] = None, is_resolved: Optional[bool] = None,
) -> ThreadComment:
    comment = db.query(ThreadComment).filter(ThreadComment.id == comment_id).first()
    if not comment:
        raise ValueError("Комментарий не найден")
    if comment.author_id != author_id:
        raise PermissionError("Только автор может редактировать комментарий")
    if body is not None:
        comment.body = body
        parsed_mentions = [int(m) for m in MENTION_RE.findall(body)]
        if parsed_mentions:
            comment.mentions = parsed_mentions
    if is_resolved is not None:
        comment.is_resolved = is_resolved
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment_id: int, author_id: int) -> None:
    comment = db.query(ThreadComment).filter(ThreadComment.id == comment_id).first()
    if not comment:
        raise ValueError("Комментарий не найден")
    if comment.author_id != author_id:
        raise PermissionError("Только автор может удалить комментарий")
    db.delete(comment)
    db.commit()


def _notify_mentions(db: Session, comment: ThreadComment, user_ids: List[int]) -> None:
    """Создать уведомление для каждого упомянутого пользователя."""
    author = db.query(User).filter(User.id == comment.author_id).first()
    author_name = author.full_name or author.email if author else "Пользователь"
    for uid in user_ids:
        if uid == comment.author_id:
            continue
        notif = Notification(
            user_id=uid,
            title=f"{author_name} упомянул(а) вас",
            body=comment.body[:200],
            notification_type="mention",
            entity_type="comment",
            entity_id=comment.id,
        )
        db.add(notif)


# ═══════════════════════════════════════════════════════════════
# TASK MANAGEMENT  (COLLAB-TEAM-001.3)
# ═══════════════════════════════════════════════════════════════

VALID_TASK_TYPES = {"action_item", "dd_item", "follow_up"}
VALID_STATUSES = {"open", "in_progress", "done", "cancelled"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}


def create_task(
    db: Session,
    decision_id: int,
    creator_id: int,
    title: str,
    description: Optional[str] = None,
    task_type: str = "action_item",
    priority: str = "medium",
    assignee_id: Optional[int] = None,
    due_date: Optional[datetime] = None,
) -> TaskItem:
    """Создать задачу в контексте решения."""
    if task_type not in VALID_TASK_TYPES:
        raise ValueError(f"Недопустимый тип задачи: {task_type}")
    if priority not in VALID_PRIORITIES:
        raise ValueError(f"Недопустимый приоритет: {priority}")

    task = TaskItem(
        decision_id=decision_id,
        title=title,
        description=description,
        task_type=task_type,
        priority=priority,
        assignee_id=assignee_id,
        creator_id=creator_id,
        due_date=due_date,
    )
    db.add(task)
    db.flush()

    # Уведомление назначенному
    if assignee_id and assignee_id != creator_id:
        creator = db.query(User).filter(User.id == creator_id).first()
        creator_name = creator.full_name or creator.email if creator else "Пользователь"
        notif = Notification(
            user_id=assignee_id,
            title=f"Вам назначена задача: {title[:80]}",
            body=f"Назначил(а): {creator_name}",
            notification_type="task",
            entity_type="task",
            entity_id=task.id,
        )
        db.add(notif)

    db.commit()
    db.refresh(task)
    return task


def list_tasks(
    db: Session,
    decision_id: int,
    status: Optional[str] = None,
    assignee_id: Optional[int] = None,
    task_type: Optional[str] = None,
) -> List[TaskItem]:
    """Получить задачи для решения с фильтрами."""
    q = db.query(TaskItem).filter(TaskItem.decision_id == decision_id)
    if status:
        q = q.filter(TaskItem.status == status)
    if assignee_id:
        q = q.filter(TaskItem.assignee_id == assignee_id)
    if task_type:
        q = q.filter(TaskItem.task_type == task_type)
    return q.order_by(TaskItem.created_at.desc()).all()


def get_task(db: Session, task_id: int) -> Optional[TaskItem]:
    return db.query(TaskItem).filter(TaskItem.id == task_id).first()


def update_task(
    db: Session,
    task_id: int,
    user_id: int,
    **fields,
) -> TaskItem:
    task = db.query(TaskItem).filter(TaskItem.id == task_id).first()
    if not task:
        raise ValueError("Задача не найдена")

    old_status = task.status
    for key, val in fields.items():
        if val is not None and hasattr(task, key):
            if key == "status" and val not in VALID_STATUSES:
                raise ValueError(f"Недопустимый статус: {val}")
            if key == "priority" and val not in VALID_PRIORITIES:
                raise ValueError(f"Недопустимый приоритет: {val}")
            setattr(task, key, val)

    # Авто-проставление completed_at
    new_status = fields.get("status")
    if new_status == "done" and old_status != "done":
        task.completed_at = datetime.now(timezone.utc)
    elif new_status and new_status != "done":
        task.completed_at = None

    # Уведомление при переназначении
    new_assignee = fields.get("assignee_id")
    if new_assignee and new_assignee != user_id:
        notif = Notification(
            user_id=new_assignee,
            title=f"Вам назначена задача: {task.title[:80]}",
            body="Задача была переназначена",
            notification_type="task",
            entity_type="task",
            entity_id=task.id,
        )
        db.add(notif)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> None:
    task = db.query(TaskItem).filter(TaskItem.id == task_id).first()
    if not task:
        raise ValueError("Задача не найдена")
    db.delete(task)
    db.commit()


def my_tasks(db: Session, user_id: int, status: Optional[str] = None) -> List[TaskItem]:
    """Все задачи, назначенные текущему пользователю."""
    q = db.query(TaskItem).filter(TaskItem.assignee_id == user_id)
    if status:
        q = q.filter(TaskItem.status == status)
    return q.order_by(TaskItem.due_date.asc().nullslast(), TaskItem.created_at.desc()).all()
