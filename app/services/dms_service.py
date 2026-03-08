"""
Document Management System (DMS) — хранение, версионирование, поиск.
Фаза 4, Сессия 3 — EXCH-ADAPT-001.4.

В MVP: метаданные + версионирование в БД, файлы — на локальном диске.
В продакшене: S3 + Elasticsearch для полнотекстового поиска.
"""
from typing import Optional, List
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.models.market_adapters import Document, DocumentVersion


# ═══════════════════════════════════════════════════════════════
# DOCUMENTS
# ═══════════════════════════════════════════════════════════════

def create_document(db: Session, user_id: int, **kwargs) -> Document:
    doc = Document(user_id=user_id, **kwargs)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(
    db: Session,
    user_id: int,
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_archived: bool = False,
    limit: int = 100,
) -> List[Document]:
    q = db.query(Document).filter(Document.user_id == user_id)
    if not include_archived:
        q = q.filter(Document.is_archived == False)
    if category:
        q = q.filter(Document.category == category)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                Document.title.ilike(pattern),
                Document.description.ilike(pattern),
                Document.search_content.ilike(pattern),
            )
        )
    return q.order_by(Document.updated_at.desc()).limit(limit).all()


def get_document(db: Session, doc_id: int) -> Optional[Document]:
    return db.query(Document).filter(Document.id == doc_id).first()


def update_document(db: Session, doc_id: int, **kwargs) -> Optional[Document]:
    doc = get_document(db, doc_id)
    if not doc:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(doc, k, v)
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, doc_id: int):
    doc = get_document(db, doc_id)
    if doc:
        db.delete(doc)
        db.commit()


def archive_document(db: Session, doc_id: int) -> Optional[Document]:
    return update_document(db, doc_id, is_archived=True)


# ═══════════════════════════════════════════════════════════════
# VERSIONS
# ═══════════════════════════════════════════════════════════════

def add_version(
    db: Session,
    doc_id: int,
    user_id: int,
    file_name: str,
    file_size: Optional[int] = None,
    change_notes: Optional[str] = None,
    file_path: Optional[str] = None,
) -> DocumentVersion:
    doc = get_document(db, doc_id)
    if not doc:
        raise ValueError("Документ не найден")

    new_version_num = doc.current_version + 1

    version = DocumentVersion(
        document_id=doc_id,
        version_number=new_version_num,
        file_name=file_name,
        file_size=file_size,
        file_path=file_path,
        change_notes=change_notes,
        uploaded_by=user_id,
    )
    db.add(version)

    doc.current_version = new_version_num
    if file_size:
        doc.file_size = file_size
    db.commit()
    db.refresh(version)
    return version


def list_versions(db: Session, doc_id: int) -> List[DocumentVersion]:
    return (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc_id)
        .order_by(DocumentVersion.version_number.desc())
        .all()
    )


def get_version(db: Session, version_id: int) -> Optional[DocumentVersion]:
    return db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()


# ═══════════════════════════════════════════════════════════════
# ПОЛНОТЕКСТОВЫЙ ПОИСК (MVP: ILIKE)
# ═══════════════════════════════════════════════════════════════

def search_documents(
    db: Session,
    user_id: int,
    query: str,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> List[Document]:
    """Поиск документов по ключевым словам."""
    pattern = f"%{query}%"
    q = db.query(Document).filter(
        Document.user_id == user_id,
        Document.is_archived == False,
        or_(
            Document.title.ilike(pattern),
            Document.description.ilike(pattern),
            Document.search_content.ilike(pattern),
        )
    )
    if category:
        q = q.filter(Document.category == category)
    return q.order_by(Document.updated_at.desc()).limit(50).all()


def get_document_stats(db: Session, user_id: int) -> dict:
    """Статистика DMS."""
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    categories = {}
    total_size = 0
    for d in docs:
        cat = d.category or "без категории"
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
        total_size += d.file_size or 0

    return {
        "total_documents": len(docs),
        "total_size_bytes": total_size,
        "archived": sum(1 for d in docs if d.is_archived),
        "by_category": categories,
    }
