"""
Сервис импорта данных — парсинг файлов, маппинг полей, пакетный импорт, аудит.
Фаза 4, Сессия 1 — EXCH-IO-001.1–001.5.
"""
import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy.orm import Session

from app.db.models.data_exchange import ImportJob, ImportFieldMapping
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# ЦЕЛЕВЫЕ ПОЛЯ ДЛЯ МАППИНГА  (EXCH-IO-001.2)
# ═══════════════════════════════════════════════════════════════

TARGET_FIELDS = {
    "decisions": [
        {"field": "title", "label": "Название решения", "field_type": "string", "required": True},
        {"field": "description", "label": "Описание", "field_type": "string", "required": False},
        {"field": "decision_type", "label": "Тип решения", "field_type": "string", "required": False},
        {"field": "status", "label": "Статус", "field_type": "string", "required": False},
        {"field": "priority", "label": "Приоритет", "field_type": "string", "required": False},
        {"field": "category", "label": "Категория", "field_type": "string", "required": False},
        {"field": "expected_return", "label": "Ожидаемая доходность (%)", "field_type": "number", "required": False},
        {"field": "risk_score", "label": "Оценка риска (1-100)", "field_type": "number", "required": False},
        {"field": "investment_amount", "label": "Сумма инвестиции", "field_type": "number", "required": False},
        {"field": "currency", "label": "Валюта", "field_type": "string", "required": False},
    ],
    "portfolios": [
        {"field": "name", "label": "Название портфеля", "field_type": "string", "required": True},
        {"field": "description", "label": "Описание", "field_type": "string", "required": False},
        {"field": "total_value", "label": "Общая стоимость", "field_type": "number", "required": False},
    ],
}


# ═══════════════════════════════════════════════════════════════
# ПАРСИНГ ФАЙЛОВ  (EXCH-IO-001.1)
# ═══════════════════════════════════════════════════════════════

def parse_file(content: bytes, file_format: str, filename: str) -> Tuple[List[str], List[Dict[str, Any]], int]:
    """
    Парсит содержимое файла. Возвращает (headers, preview_rows, total_rows).
    Поддерживает: csv, tsv, json, xml.
    """
    text = content.decode("utf-8-sig", errors="replace")

    if file_format in ("csv", "tsv"):
        delimiter = "\t" if file_format == "tsv" else ","
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        headers = reader.fieldnames or []
        rows = []
        total = 0
        for row in reader:
            total += 1
            if total <= 10:
                rows.append(dict(row))
        return list(headers), rows, total

    elif file_format == "json":
        data = json.loads(text)
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            # Ищем первый массив в корне
            for key, val in data.items():
                if isinstance(val, list):
                    items = val
                    break
            else:
                items = [data]
        else:
            items = []
        if not items:
            return [], [], 0
        headers = list(items[0].keys()) if items else []
        preview = items[:10]
        return headers, preview, len(items)

    elif file_format == "xml":
        import xml.etree.ElementTree as ET
        root = ET.fromstring(text)
        items = []
        # Берём дочерние элементы корня как записи
        for child in root:
            row = {}
            for elem in child:
                row[elem.tag] = elem.text or ""
            if row:
                items.append(row)
        if not items:
            return [], [], 0
        headers = list(items[0].keys())
        preview = items[:10]
        return headers, preview, len(items)

    else:
        raise ValueError(f"Неподдерживаемый формат: {file_format}")


def detect_format(filename: str) -> str:
    """Определить формат файла по расширению."""
    lower = filename.lower()
    if lower.endswith(".tsv"):
        return "tsv"
    elif lower.endswith(".json"):
        return "json"
    elif lower.endswith(".xml"):
        return "xml"
    elif lower.endswith(".csv"):
        return "csv"
    else:
        return "csv"  # default


# ═══════════════════════════════════════════════════════════════
# СОЗДАНИЕ И УПРАВЛЕНИЕ ImportJob
# ═══════════════════════════════════════════════════════════════

def create_import_job(
    db: Session,
    user_id: int,
    filename: str,
    content: bytes,
    target_entity: str = "decisions",
) -> ImportJob:
    """Создать задание на импорт: загрузить файл, распарсить, сохранить preview."""
    file_format = detect_format(filename)
    headers, preview, total = parse_file(content, file_format, filename)

    job = ImportJob(
        user_id=user_id,
        filename=filename,
        file_format=file_format,
        file_size_bytes=len(content),
        target_entity=target_entity,
        status="uploaded",
        total_rows=total,
        preview_data=preview,
        raw_headers=headers,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Import job #{job.id} created: {filename} ({file_format}), {total} rows")
    return job


def save_mapping(
    db: Session,
    job_id: int,
    mappings: List[Dict[str, Any]],
) -> ImportJob:
    """Сохранить маппинг полей для задания импорта (EXCH-IO-001.2)."""
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise ValueError("Задание импорта не найдено")
    if job.status not in ("uploaded", "mapping"):
        raise ValueError(f"Нельзя изменить маппинг в статусе '{job.status}'")

    # Удалить старый маппинг
    db.query(ImportFieldMapping).filter(ImportFieldMapping.import_job_id == job_id).delete()

    for m in mappings:
        fm = ImportFieldMapping(
            import_job_id=job_id,
            source_field=m["source_field"],
            target_field=m["target_field"],
            transform_rule=m.get("transform_rule"),
            default_value=m.get("default_value"),
            is_required=m.get("is_required", False),
        )
        db.add(fm)

    job.status = "mapping"
    db.commit()
    db.refresh(job)
    return job


def execute_import(
    db: Session,
    job_id: int,
    file_content: bytes,
) -> ImportJob:
    """
    Выполнить импорт данных по сохранённому маппингу (EXCH-IO-001.3).
    Пакетный импорт с аудитом ошибок.
    """
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise ValueError("Задание импорта не найдено")
    if not job.field_mappings:
        raise ValueError("Маппинг полей не настроен")

    job.status = "executing"
    db.commit()

    # Парсим весь файл заново
    try:
        headers, _, total = parse_file(file_content, job.file_format, job.filename)
        all_rows = _parse_all_rows(file_content, job.file_format)
    except Exception as e:
        job.status = "failed"
        job.errors_detail = [{"row": 0, "field": "", "error": str(e)}]
        db.commit()
        return job

    mapping_dict = {m.source_field: m for m in job.field_mappings}
    imported = 0
    skipped = 0
    errors = []

    for idx, raw_row in enumerate(all_rows, start=1):
        try:
            mapped = _apply_mapping(raw_row, mapping_dict)
            if not mapped:
                skipped += 1
                continue

            if job.target_entity == "decisions":
                _import_decision(db, mapped, job.user_id)
            elif job.target_entity == "portfolios":
                _import_portfolio(db, mapped, job.user_id)
            else:
                skipped += 1
                continue
            imported += 1
        except Exception as e:
            errors.append({"row": idx, "field": "", "error": str(e)})
            if len(errors) > 100:
                errors.append({"row": idx, "field": "", "error": "Слишком много ошибок, импорт прерван"})
                break

    job.imported_rows = imported
    job.skipped_rows = skipped
    job.error_rows = len(errors)
    job.errors_detail = errors if errors else None
    job.status = "completed" if not errors else ("completed" if imported > 0 else "failed")
    job.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    logger.info(f"Import job #{job.id} done: {imported} imported, {skipped} skipped, {len(errors)} errors")
    return job


def list_import_jobs(
    db: Session,
    user_id: int,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[ImportJob]:
    """Аудит импортов — история (EXCH-IO-001.5)."""
    q = db.query(ImportJob).filter(ImportJob.user_id == user_id)
    if status:
        q = q.filter(ImportJob.status == status)
    return q.order_by(ImportJob.created_at.desc()).limit(limit).all()


def get_import_job(db: Session, job_id: int) -> Optional[ImportJob]:
    return db.query(ImportJob).filter(ImportJob.id == job_id).first()


def delete_import_job(db: Session, job_id: int) -> None:
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if job:
        db.delete(job)
        db.commit()


def get_target_fields(entity: str) -> List[Dict[str, Any]]:
    """Получить список целевых полей для маппинга."""
    return TARGET_FIELDS.get(entity, TARGET_FIELDS["decisions"])


# ═══════════════════════════════════════════════════════════════
# ВНУТРЕННИЕ ФУНКЦИИ
# ═══════════════════════════════════════════════════════════════

def _parse_all_rows(content: bytes, file_format: str) -> List[Dict[str, Any]]:
    """Распарсить все строки файла."""
    text = content.decode("utf-8-sig", errors="replace")
    if file_format in ("csv", "tsv"):
        delimiter = "\t" if file_format == "tsv" else ","
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        return [dict(row) for row in reader]
    elif file_format == "json":
        data = json.loads(text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            for val in data.values():
                if isinstance(val, list):
                    return val
            return [data]
        return []
    elif file_format == "xml":
        import xml.etree.ElementTree as ET
        root = ET.fromstring(text)
        items = []
        for child in root:
            row = {}
            for elem in child:
                row[elem.tag] = elem.text or ""
            if row:
                items.append(row)
        return items
    return []


def _apply_mapping(raw_row: Dict, mapping_dict: Dict) -> Optional[Dict]:
    """Применить маппинг к одной строке."""
    result = {}
    for source_field, mapping in mapping_dict.items():
        value = raw_row.get(source_field, "")
        if not value and mapping.default_value:
            value = mapping.default_value
        if not value and mapping.is_required:
            return None  # пропустить строку

        # Трансформации
        rule = mapping.transform_rule
        if rule == "uppercase" and isinstance(value, str):
            value = value.upper()
        elif rule == "lowercase" and isinstance(value, str):
            value = value.lower()
        elif rule == "number_parse":
            try:
                value = float(str(value).replace(",", ".").replace(" ", ""))
            except (ValueError, TypeError):
                value = None
        elif rule == "date_parse":
            # Попытка парсинга даты
            for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y"):
                try:
                    value = datetime.strptime(str(value), fmt)
                    break
                except (ValueError, TypeError):
                    continue

        result[mapping.target_field] = value
    return result if result else None


def _import_decision(db: Session, mapped: Dict, user_id: int) -> None:
    """Создать InvestmentDecision из маппинга."""
    title = mapped.get("title")
    if not title:
        raise ValueError("Поле 'title' обязательно")

    dec = InvestmentDecision(
        title=str(title),
        description=mapped.get("description"),
        decision_type=mapped.get("decision_type", "investment"),
        status=mapped.get("status", "draft"),
        priority=mapped.get("priority", "medium"),
        category=mapped.get("category"),
        expected_return=mapped.get("expected_return"),
        risk_score=mapped.get("risk_score"),
        investment_amount=mapped.get("investment_amount"),
        currency=mapped.get("currency", "USD"),
        creator_id=user_id,
    )
    db.add(dec)
    db.flush()


def _import_portfolio(db: Session, mapped: Dict, user_id: int) -> None:
    """Создать Portfolio из маппинга."""
    name = mapped.get("name")
    if not name:
        raise ValueError("Поле 'name' обязательно")

    port = Portfolio(
        name=str(name),
        description=mapped.get("description"),
        total_value=mapped.get("total_value", 0),
        owner_id=user_id,
    )
    db.add(port)
    db.flush()
