"""
Роутер DD-документов — загрузка, список, удаление документов для Due Diligence.

E3-03: multipart/form-data загрузка реальных файлов.
 - POST /dd/documents/upload          — загрузка файла (multipart/form-data)
 - GET  /dd/documents/                — список всех загруженных документов
 - GET  /dd/documents/{session_id}    — список документов по сессии
 - DELETE /dd/documents/{doc_id}      — удаление документа
 - GET  /dd/documents/templates       — доступные шаблоны/типы
"""
import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.api.v1.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dd/documents", tags=["DD Documents"])

# Допустимые типы файлов (PDF, XLSX, DOCX, PNG, JPG)
ALLOWED_EXTENSIONS = {"pdf", "xlsx", "xls", "docx", "doc", "png", "jpg", "jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILES_PER_SESSION = 20
UPLOAD_DIR = "/uploads/dd"

# Типы документов DD
DOC_TYPES = {
    "balance": {"label": "Баланс (Форма 1)", "checklist_key": "asset_liability_assessment"},
    "income_statement": {"label": "ОПУ (Форма 2)", "checklist_key": "audited_financials"},
    "cash_flow": {"label": "Cash Flow", "checklist_key": "cash_flow_analysis"},
    "charter": {"label": "Учредительные", "checklist_key": "registration_docs"},
    "license": {"label": "Лицензии", "checklist_key": "licenses_permits"},
    "other": {"label": "Прочие", "checklist_key": None},
}

# In-memory storage (для MVP; в проде — PostgreSQL)
_documents: dict[str, dict] = {}


class DocUploadResponse(BaseModel):
    id: str
    session_id: str
    filename: str
    doc_type: str
    doc_type_label: str
    size_bytes: int
    checklist_key: str | None
    uploaded_at: str


@router.post("/upload", response_model=DocUploadResponse, summary="Загрузка DD-документа")
async def upload_document(
    file: UploadFile = File(..., description="Файл документа (PDF, XLSX, DOCX, PNG, JPG)"),
    doc_type: str = Query("other", description="Тип: balance, income_statement, cash_flow, charter, license, other"),
    session_id: str = Query("", description="ID сессии DD (если пусто — создаётся новый)"),
    _current_user=Depends(get_current_user),
):
    """
    Загрузка документа для DD-сессии через multipart/form-data.
    Поддерживаемые форматы: PDF, XLSX, DOCX, PNG, JPG.
    Лимит: 10 МБ на файл.
    """
    # Валидация типа документа
    if doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Неизвестный тип документа. Допустимые: {', '.join(DOC_TYPES.keys())}")

    # Валидация расширения
    filename = file.filename or "unknown.pdf"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат '{extension}'. Допустимые: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Читаем файл
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Файл пустой")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой ({len(file_bytes) // (1024*1024)} МБ). Максимум: {MAX_FILE_SIZE // (1024*1024)} МБ",
        )

    # Сессия
    sid = session_id.strip() if session_id else str(uuid.uuid4())

    # Проверка лимита файлов на сессию
    session_docs = [d for d in _documents.values() if d["session_id"] == sid]
    if len(session_docs) >= MAX_FILES_PER_SESSION:
        raise HTTPException(status_code=400, detail=f"Максимум {MAX_FILES_PER_SESSION} файлов на сессию")

    # Сохраняем файл на диск
    doc_id = str(uuid.uuid4())
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_filename = f"{doc_id}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    doc_info = DOC_TYPES[doc_type]
    doc = {
        "id": doc_id,
        "session_id": sid,
        "filename": filename,
        "doc_type": doc_type,
        "doc_type_label": doc_info["label"],
        "size_bytes": len(file_bytes),
        "checklist_key": doc_info["checklist_key"],
        "file_path": file_path,
        "uploaded_at": datetime.utcnow().isoformat(),
    }
    _documents[doc_id] = doc
    logger.info("DD document uploaded: %s (%d bytes) session=%s", filename, len(file_bytes), sid)

    return DocUploadResponse(**{k: v for k, v in doc.items() if k != "file_path"})


@router.get("/", summary="Список всех DD-документов")
async def list_all_documents(
    _current_user=Depends(get_current_user),
):
    """
    Список всех загруженных DD-документов (для текущего MVP — из in-memory хранилища).
    """
    docs = [
        {k: v for k, v in d.items() if k != "file_path"}
        for d in _documents.values()
    ]
    return {"total": len(docs), "documents": docs}


@router.get("/templates", summary="Типы DD-документов")
async def get_document_types(
    _current_user=Depends(get_current_user),
):
    """
    Список доступных типов документов для DD.
    Каждый тип привязан к пункту чеклиста.
    """
    return [
        {
            "key": key,
            "label": info["label"],
            "checklist_key": info["checklist_key"],
        }
        for key, info in DOC_TYPES.items()
    ]


@router.get("/{session_id}", summary="Список документов DD-сессии")
async def list_session_documents(
    session_id: str,
    _current_user=Depends(get_current_user),
):
    """
    Получение списка загруженных документов для DD-сессии.
    """
    docs = [
        {k: v for k, v in d.items() if k != "file_path"}
        for d in _documents.values()
        if d["session_id"] == session_id
    ]
    return {"session_id": session_id, "total": len(docs), "documents": docs}


@router.delete("/{doc_id}", summary="Удаление DD-документа")
async def delete_document(
    doc_id: str,
    _current_user=Depends(get_current_user),
):
    """
    Удаление загруженного документа по ID.
    """
    doc = _documents.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Документ {doc_id} не найден")

    # Удаляем файл с диска
    file_path = doc.get("file_path", "")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    del _documents[doc_id]
    return {"status": "deleted", "doc_id": doc_id}
