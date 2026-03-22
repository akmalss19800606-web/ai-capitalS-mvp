"""Shariah Screening Router — /api/v1/islamic/screening/..."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.islamic_stage1 import (
    ShariahScreenRequest,
    ShariahScreenResponse,
    CompanyListItem,
)
from app.services import shariah_screening_service

router = APIRouter()


@router.get("/companies", response_model=List[CompanyListItem], summary="Список компаний UzSE/ЦКТСБ")
def get_companies(
    search: Optional[str] = Query(None, description="Поиск по названию или тикеру"),
    market_type: Optional[str] = Query(None, description="uzse | cktsb | private | other"),
    db: Session = Depends(get_db),
):
    return shariah_screening_service.get_companies(db, search, market_type)


@router.post("/screen", response_model=ShariahScreenResponse, summary="Провести скрининг компании")
def screen_company(
    request: ShariahScreenRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return shariah_screening_service.screen_company(db, current_user.id, request)


@router.get("/results", response_model=List[ShariahScreenResponse], summary="Мои результаты скрининга")
def get_results(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return shariah_screening_service.get_screening_results(db, current_user.id, limit)
