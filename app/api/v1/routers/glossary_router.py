"""Glossary Router — /api/v1/islamic/glossary/..."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas.islamic_stage1 import GlossaryTermResponse
from app.services import islamic_glossary_service

router = APIRouter()


@router.get("", response_model=List[GlossaryTermResponse], summary="Глоссарий терминов")
def get_glossary(
    category: Optional[str] = Query(None, description="contract|prohibition|instrument|regulatory|concept"),
    search: Optional[str] = Query(None, description="Поиск по названию"),
    db: Session = Depends(get_db),
):
    return islamic_glossary_service.get_all_terms(db, category, search)


@router.get("/{slug}", response_model=GlossaryTermResponse, summary="Термин по slug")
def get_term(slug: str, db: Session = Depends(get_db)):
    term = islamic_glossary_service.get_term_by_slug(db, slug)
    if not term:
        raise HTTPException(status_code=404, detail="Термин не найден")
    return term
