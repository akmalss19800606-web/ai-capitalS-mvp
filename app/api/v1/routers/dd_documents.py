"""
Роутер DD-документов — загрузка и анализ документов для Due Diligence.

Фаза 3, DD-002:
  - POST /dd-documents/upload — загрузка и анализ документа
  - GET  /dd-documents/analysis/{doc_id} — результат анализа
  - GET  /dd-documents/templates — доступные шаблоны
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.api.v1.deps import get_current_user
from app.services.document_analysis_service import DocumentAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dd-documents", tags=["DD Documents"])

# Допустимые типы файлов
ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "xlsx", "xls", "txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/upload", summary="Загрузка и анализ DD-документа")
async def upload_and_analyze(
    file: UploadFile = File(...),
    doc_type: str = Query("auto", description="Тип документа: auto, financial_report, charter, license, contract"),
    _current_user=Depends(get_current_user),
):
    """
    Загрузка документа и автоматический анализ.

    Поддерживаемые форматы: PDF, DOCX, XLSX, TXT.
    Извлекает: даты, суммы, ИНН, стороны контракта.
    Выявляет рисковые индикаторы для DD.
    """
    # Валидация расширения
    filename = file.filename or "unknown.txt"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат файла. Допустимые: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Читаем файл
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой. Максимум: {MAX_FILE_SIZE // (1024*1024)} МБ",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Файл пустой")

    # Анализ
    try:
        result = await DocumentAnalysisService.analyze_document(
            file_bytes=file_bytes,
            filename=filename,
            doc_type=doc_type,
        )
    except Exception as e:
        logger.error("Ошибка анализа документа '%s': %s", filename, e)
        raise HTTPException(
            status_code=500,
            detail="Ошибка при анализе документа",
        )

    return result


@router.get(
    "/analysis/{doc_id}",
    summary="Получение результата анализа по ID",
)
async def get_analysis(
    doc_id: str,
    _current_user=Depends(get_current_user),
):
    """
    Получение результата предыдущего анализа документа.
    """
    analysis = DocumentAnalysisService.get_analysis(doc_id)
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail=f"Анализ с ID {doc_id} не найден",
        )
    return analysis


@router.get("/templates", summary="Доступные шаблоны анализа")
async def get_templates(
    _current_user=Depends(get_current_user),
):
    """
    Список доступных шаблонов анализа документов.

    Типы: financial_report, charter, license, contract.
    """
    return DocumentAnalysisService.get_templates()
