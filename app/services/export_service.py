"""
Сервис экспорта данных — CSV, JSON, Excel.
Фаза 4, Сессия 1 — EXCH-IO-001.4.
"""
import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session

from app.db.models.data_exchange import ExportJob
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# ЭКСПОРТИРУЕМЫЕ КОЛОНКИ
# ═══════════════════════════════════════════════════════════════

EXPORT_COLUMNS: Dict[str, List[Dict[str, str]]] = {
    "decisions": [
        {"key": "id", "label": "ID"},
        {"key": "title", "label": "Название"},
        {"key": "description", "label": "Описание"},
        {"key": "decision_type", "label": "Тип решения"},
        {"key": "status", "label": "Статус"},
        {"key": "priority", "label": "Приоритет"},
        {"key": "category", "label": "Категория"},
        {"key": "expected_return", "label": "Ожидаемая доходность (%)"},
        {"key": "risk_score", "label": "Оценка риска"},
        {"key": "investment_amount", "label": "Сумма инвестиции"},
        {"key": "currency", "label": "Валюта"},
        {"key": "created_at", "label": "Дата создания"},
    ],
    "portfolios": [
        {"key": "id", "label": "ID"},
        {"key": "name", "label": "Название"},
        {"key": "description", "label": "Описание"},
        {"key": "total_value", "label": "Общая стоимость"},
        {"key": "created_at", "label": "Дата создания"},
    ],
}


def _query_entities(
    db: Session,
    entity: str,
    user_id: int,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Получить записи для экспорта с фильтрами."""
    if entity == "decisions":
        q = db.query(InvestmentDecision).filter(
            InvestmentDecision.creator_id == user_id
        )
        if filters:
            if filters.get("status"):
                q = q.filter(InvestmentDecision.status == filters["status"])
            if filters.get("decision_type"):
                q = q.filter(InvestmentDecision.decision_type == filters["decision_type"])
            if filters.get("priority"):
                q = q.filter(InvestmentDecision.priority == filters["priority"])
            if filters.get("category"):
                q = q.filter(InvestmentDecision.category == filters["category"])
            if filters.get("portfolio_id"):
                q = q.filter(InvestmentDecision.portfolio_id == int(filters["portfolio_id"]))
        rows = q.order_by(InvestmentDecision.id).all()
        columns = EXPORT_COLUMNS["decisions"]
    elif entity == "portfolios":
        q = db.query(Portfolio).filter(Portfolio.owner_id == user_id)
        rows = q.order_by(Portfolio.id).all()
        columns = EXPORT_COLUMNS["portfolios"]
    else:
        return []

    result = []
    for row in rows:
        item = {}
        for col in columns:
            val = getattr(row, col["key"], None)
            if isinstance(val, datetime):
                val = val.isoformat()
            item[col["key"]] = val
        result.append(item)
    return result


# ═══════════════════════════════════════════════════════════════
# ГЕНЕРАЦИЯ ФАЙЛОВ
# ═══════════════════════════════════════════════════════════════

def _generate_csv(rows: List[Dict], entity: str) -> str:
    """Генерация CSV (строка)."""
    columns = EXPORT_COLUMNS.get(entity, [])
    output = io.StringIO()
    writer = csv.writer(output)
    # Заголовки (русские метки)
    writer.writerow([c["label"] for c in columns])
    for row in rows:
        writer.writerow([row.get(c["key"], "") for c in columns])
    return output.getvalue()


def _generate_json(rows: List[Dict], entity: str) -> str:
    """Генерация JSON (строка)."""
    columns = EXPORT_COLUMNS.get(entity, [])
    # Экспорт с русскими ключами
    output = []
    for row in rows:
        item = {}
        for col in columns:
            item[col["label"]] = row.get(col["key"], "")
        output.append(item)
    return json.dumps(output, ensure_ascii=False, indent=2)


def _generate_xlsx_data(rows: List[Dict], entity: str) -> List[List[Any]]:
    """
    Генерация данных для XLSX в формате [[header...], [row...], ...].
    Сам Excel создаётся на фронте или отдаётся как JSON-массив.
    """
    columns = EXPORT_COLUMNS.get(entity, [])
    header = [c["label"] for c in columns]
    data = [header]
    for row in rows:
        data.append([row.get(c["key"], "") for c in columns])
    return data


# ═══════════════════════════════════════════════════════════════
# СОЗДАНИЕ И ВЫПОЛНЕНИЕ ExportJob
# ═══════════════════════════════════════════════════════════════

def create_export_job(
    db: Session,
    user_id: int,
    export_format: str,
    target_entity: str,
    filters: Optional[Dict[str, Any]] = None,
) -> ExportJob:
    """Создать и выполнить задание на экспорт (EXCH-IO-001.4)."""
    job = ExportJob(
        user_id=user_id,
        export_format=export_format,
        target_entity=target_entity,
        filters=filters,
        status="generating",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        rows = _query_entities(db, target_entity, user_id, filters)
        job.total_rows = len(rows)

        if export_format == "csv":
            content = _generate_csv(rows, target_entity)
            job.result_data = {"type": "csv", "content": content}
        elif export_format == "json":
            content = _generate_json(rows, target_entity)
            job.result_data = {"type": "json", "content": content}
        elif export_format == "xlsx":
            table_data = _generate_xlsx_data(rows, target_entity)
            job.result_data = {"type": "xlsx", "data": table_data}
        else:
            raise ValueError(f"Неподдерживаемый формат: {export_format}")

        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
    except Exception as e:
        job.status = "failed"
        job.result_data = {"error": str(e)}
        logger.error(f"Export job #{job.id} failed: {e}")

    db.commit()
    db.refresh(job)
    logger.info(f"Export job #{job.id}: {target_entity} → {export_format}, {job.total_rows} rows")
    return job


def list_export_jobs(
    db: Session,
    user_id: int,
    limit: int = 50,
) -> List[ExportJob]:
    """История экспортов."""
    return (
        db.query(ExportJob)
        .filter(ExportJob.user_id == user_id)
        .order_by(ExportJob.created_at.desc())
        .limit(limit)
        .all()
    )


def get_export_job(db: Session, job_id: int) -> Optional[ExportJob]:
    return db.query(ExportJob).filter(ExportJob.id == job_id).first()


def delete_export_job(db: Session, job_id: int) -> None:
    job = db.query(ExportJob).filter(ExportJob.id == job_id).first()
    if job:
        db.delete(job)
        db.commit()
