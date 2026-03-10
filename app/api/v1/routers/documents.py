"""
Роутер загрузки и AI-анализа документов.

Эндпоинты:
  POST /api/v1/documents/upload — загрузка документа
  GET  /api/v1/documents — список документов пользователя
  GET  /api/v1/documents/{doc_id} — детали документа
  POST /api/v1/documents/{doc_id}/analyze — AI-анализ документа
  DELETE /api/v1/documents/{doc_id} — удалить документ
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services.document_service import (
    save_uploaded_file,
    extract_text,
    analyze_document_with_ai,
    delete_uploaded_file,
    ALLOWED_EXTENSIONS,
)

router = APIRouter(prefix="/documents", tags=["documents"])


# ─── Схемы ───────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size: int
    uploaded_at: str
    text_extracted: bool
    text_length: int
    analysis_count: int

class DocumentDetailResponse(DocumentResponse):
    extracted_text_preview: str = ""
    analyses: list = []

class AnalyzeRequest(BaseModel):
    analysis_type: str = "summary"  # summary | extract_fields | dd_analysis | risk_assessment


# ─── In-memory хранилище документов (MVP — без доп. таблицы в БД) ────

_documents_store: dict = {}
_doc_counter: int = 0


def _next_doc_id() -> int:
    global _doc_counter
    _doc_counter += 1
    return _doc_counter


# ─── Эндпоинты ───────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    description: str = Form(""),
    current_user: User = Depends(get_current_user),
):
    """Загрузка документа (PDF, DOCX, XLSX, TXT, CSV)."""
    # Проверка расширения
    filename = file.filename or "unnamed"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Неподдерживаемый формат: {ext}. Разрешены: {', '.join(ALLOWED_EXTENSIONS.keys())}",
        )

    # Читаем файл
    file_data = await file.read()
    if len(file_data) == 0:
        raise HTTPException(400, "Файл пустой")

    # Сохраняем
    try:
        stored_path, file_hash, file_size = save_uploaded_file(
            file_data, filename, current_user.id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Извлекаем текст
    extracted_text = extract_text(stored_path)

    # Сохраняем метаданные
    doc_id = _next_doc_id()
    _documents_store[doc_id] = {
        "id": doc_id,
        "user_id": current_user.id,
        "filename": filename,
        "file_type": ext.lstrip("."),
        "file_size": file_size,
        "stored_path": stored_path,
        "file_hash": file_hash,
        "description": description,
        "extracted_text": extracted_text,
        "uploaded_at": datetime.now().isoformat(),
        "analyses": [],
    }

    return DocumentResponse(
        id=doc_id,
        filename=filename,
        file_type=ext.lstrip("."),
        file_size=file_size,
        uploaded_at=_documents_store[doc_id]["uploaded_at"],
        text_extracted=bool(extracted_text),
        text_length=len(extracted_text),
        analysis_count=0,
    )


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
):
    """Список документов текущего пользователя."""
    user_docs = [
        doc for doc in _documents_store.values()
        if doc["user_id"] == current_user.id
    ]
    return [
        DocumentResponse(
            id=doc["id"],
            filename=doc["filename"],
            file_type=doc["file_type"],
            file_size=doc["file_size"],
            uploaded_at=doc["uploaded_at"],
            text_extracted=bool(doc["extracted_text"]),
            text_length=len(doc["extracted_text"]),
            analysis_count=len(doc["analyses"]),
        )
        for doc in sorted(user_docs, key=lambda x: x["uploaded_at"], reverse=True)
    ]


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
):
    """Детали документа."""
    doc = _documents_store.get(doc_id)
    if not doc or doc["user_id"] != current_user.id:
        raise HTTPException(404, "Документ не найден")

    return DocumentDetailResponse(
        id=doc["id"],
        filename=doc["filename"],
        file_type=doc["file_type"],
        file_size=doc["file_size"],
        uploaded_at=doc["uploaded_at"],
        text_extracted=bool(doc["extracted_text"]),
        text_length=len(doc["extracted_text"]),
        analysis_count=len(doc["analyses"]),
        extracted_text_preview=doc["extracted_text"][:500] if doc["extracted_text"] else "",
        analyses=doc["analyses"],
    )


@router.post("/{doc_id}/analyze")
async def analyze_document(
    doc_id: int,
    data: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    """AI-анализ загруженного документа."""
    doc = _documents_store.get(doc_id)
    if not doc or doc["user_id"] != current_user.id:
        raise HTTPException(404, "Документ не найден")

    if not doc["extracted_text"]:
        raise HTTPException(400, "Из документа не удалось извлечь текст")

    valid_types = ["summary", "extract_fields", "dd_analysis", "risk_assessment"]
    if data.analysis_type not in valid_types:
        raise HTTPException(400, f"Тип анализа должен быть одним из: {', '.join(valid_types)}")

    result = await analyze_document_with_ai(
        text=doc["extracted_text"],
        analysis_type=data.analysis_type,
    )

    # Сохраняем анализ
    analysis_entry = {
        "type": data.analysis_type,
        "result": result,
        "created_at": datetime.now().isoformat(),
    }
    doc["analyses"].append(analysis_entry)

    return {
        "document_id": doc_id,
        "filename": doc["filename"],
        **result,
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
):
    """Удалить документ."""
    doc = _documents_store.get(doc_id)
    if not doc or doc["user_id"] != current_user.id:
        raise HTTPException(404, "Документ не найден")

    # Удаляем файл с диска
    delete_uploaded_file(doc["stored_path"])

    # Удаляем из хранилища
    del _documents_store[doc_id]

    return {"status": "deleted", "document_id": doc_id}
