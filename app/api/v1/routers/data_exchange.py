"""
Роутер: Универсальный импорт/экспорт данных.
Фаза 4, Сессия 1 — EXCH-IO-001.

Эндпоинты:
  POST   /exchange/import/upload       — загрузить файл, получить preview + headers
  POST   /exchange/import/{id}/mapping — сохранить маппинг полей
  POST   /exchange/import/{id}/execute — выполнить импорт
  GET    /exchange/import              — список заданий импорта (история)
  GET    /exchange/import/{id}         — детали задания
  DELETE /exchange/import/{id}         — удалить задание
  GET    /exchange/import/target-fields/{entity} — целевые поля для маппинга

  POST   /exchange/export              — создать и выполнить экспорт
  GET    /exchange/export              — список экспортов (история)
  GET    /exchange/export/{id}         — детали экспорта (включая данные)
  DELETE /exchange/export/{id}         — удалить экспорт
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.v1.routers.auth import get_current_user
from app.db.models.user import User
from app.schemas.data_exchange import (
    ImportJobResponse,
    ImportJobListItem,
    ImportMappingSave,
    ExportJobCreate,
    ExportJobResponse,
    TargetFieldInfo,
)
from app.services.import_service import (
    create_import_job,
    save_mapping,
    execute_import,
    list_import_jobs,
    get_import_job,
    delete_import_job,
    get_target_fields,
    parse_file,
    detect_format,
)
from app.services.export_service import (
    create_export_job,
    list_export_jobs,
    get_export_job,
    delete_export_job,
)

router = APIRouter(prefix="/exchange", tags=["data-exchange"])


# ═══════════════════════════════════════════════════════════════
# ИМПОРТ
# ═══════════════════════════════════════════════════════════════

@router.post("/import/upload", response_model=ImportJobResponse)
async def upload_import_file(
    file: UploadFile = File(...),
    target_entity: str = Form("decisions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Загрузить файл для импорта. Возвращает preview данных и заголовки."""
    if not file.filename:
        raise HTTPException(400, "Файл не указан")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(413, "Файл слишком большой (макс. 10 МБ)")

    allowed_formats = ("csv", "tsv", "json", "xml")
    file_format = detect_format(file.filename)
    if file_format not in allowed_formats:
        raise HTTPException(400, f"Неподдерживаемый формат. Допустимые: {', '.join(allowed_formats)}")

    try:
        job = create_import_job(db, current_user.id, file.filename, content, target_entity)
    except Exception as e:
        raise HTTPException(400, f"Ошибка парсинга файла: {str(e)}")

    # Сохраняем содержимое файла в сессии для последующего execute
    # (в реальной продакшн-системе — в S3/MinIO, здесь — в JSON)
    return job


@router.post("/import/{job_id}/mapping", response_model=ImportJobResponse)
def save_import_mapping(
    job_id: int,
    body: ImportMappingSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сохранить маппинг полей для задания импорта."""
    job = get_import_job(db, job_id)
    if not job:
        raise HTTPException(404, "Задание импорта не найдено")
    if job.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")

    mappings = [m.model_dump() for m in body.mappings]
    try:
        job = save_mapping(db, job_id, mappings)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return job


@router.post("/import/{job_id}/execute", response_model=ImportJobResponse)
async def execute_import_job(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Выполнить импорт данных (повторная загрузка файла для обработки)."""
    job = get_import_job(db, job_id)
    if not job:
        raise HTTPException(404, "Задание импорта не найдено")
    if job.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")

    content = await file.read()
    try:
        job = execute_import(db, job_id, content)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return job


@router.get("/import", response_model=list[ImportJobListItem])
def list_imports(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить историю импортов."""
    return list_import_jobs(db, current_user.id, status, limit)


@router.get("/import/target-fields/{entity}", response_model=list[TargetFieldInfo])
def get_entity_target_fields(
    entity: str,
    current_user: User = Depends(get_current_user),
):
    """Получить целевые поля для маппинга."""
    fields = get_target_fields(entity)
    return fields


@router.get("/import/{job_id}", response_model=ImportJobResponse)
def get_import_details(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Детали задания импорта."""
    job = get_import_job(db, job_id)
    if not job:
        raise HTTPException(404, "Задание импорта не найдено")
    if job.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return job


@router.delete("/import/{job_id}")
def delete_import(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить задание импорта."""
    job = get_import_job(db, job_id)
    if not job:
        raise HTTPException(404, "Задание импорта не найдено")
    if job.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_import_job(db, job_id)
    return {"detail": "Удалено"}


# ═══════════════════════════════════════════════════════════════
# ЭКСПОРТ
# ═══════════════════════════════════════════════════════════════

@router.post("/export", response_model=ExportJobResponse)
def create_export(
    body: ExportJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать и выполнить экспорт данных."""
    allowed_formats = ("csv", "json", "xlsx")
    if body.export_format not in allowed_formats:
        raise HTTPException(400, f"Допустимые форматы: {', '.join(allowed_formats)}")

    allowed_entities = ("decisions", "portfolios")
    if body.target_entity not in allowed_entities:
        raise HTTPException(400, f"Допустимые сущности: {', '.join(allowed_entities)}")

    job = create_export_job(
        db,
        user_id=current_user.id,
        export_format=body.export_format,
        target_entity=body.target_entity,
        filters=body.filters,
    )
    return job


@router.get("/export", response_model=list[ExportJobResponse])
def list_exports(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История экспортов."""
    return list_export_jobs(db, current_user.id, limit)


@router.get("/export/{job_id}", response_model=ExportJobResponse)
def get_export_details(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Детали экспорта (включая данные)."""
    job = get_export_job(db, job_id)
    if not job:
        raise HTTPException(404, "Экспорт не найден")
    if job.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    return job


@router.delete("/export/{job_id}")
def delete_export(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить экспорт."""
    job = get_export_job(db, job_id)
    if not job:
        raise HTTPException(404, "Экспорт не найден")
    if job.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    delete_export_job(db, job_id)
    return {"detail": "Удалено"}
