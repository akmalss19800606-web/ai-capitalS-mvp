"""Islamic Reference Router — /api/v1/islamic/references/..."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas.islamic_stage1 import ReferenceRegistryItem
from app.services import islamic_reference_service

router = APIRouter()


@router.get("/standards", response_model=List[ReferenceRegistryItem], summary="Стандарты AAOIFI / IFSB")
def get_standards(
    org: Optional[str] = Query(None, description="aaoifi_standard | ifsb_standard"),
    db: Session = Depends(get_db),
):
    return islamic_reference_service.get_standards(db, org)


@router.get("/standards/{code}", response_model=ReferenceRegistryItem, summary="Стандарт по коду")
def get_standard(code: str, db: Session = Depends(get_db)):
    item = islamic_reference_service.get_standard_by_code(db, code)
    if not item:
        raise HTTPException(status_code=404, detail="Стандарт не найден")
    return item
