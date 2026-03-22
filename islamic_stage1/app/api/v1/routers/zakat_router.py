"""Zakat Router — /api/v1/islamic/zakat/..."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.islamic_stage1 import (
    NisabResponse,
    ZakatCalculateRequest,
    ZakatCalculateResponse,
    ZakatHistoryItem,
)
from app.services import nisab_service, zakat_service

router = APIRouter()


@router.get("/nisab", response_model=NisabResponse, summary="Текущий нисаб (85г золота)")
def get_nisab(db: Session = Depends(get_db)):
    data = nisab_service.get_nisab_today(db)
    return NisabResponse(**data)


@router.post("/calculate", response_model=ZakatCalculateResponse, summary="Рассчитать закят")
def calculate_zakat(
    request: ZakatCalculateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return zakat_service.calculate_zakat(db, current_user.id, request)


@router.get("/history", response_model=List[ZakatHistoryItem], summary="История расчётов закята")
def get_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return zakat_service.get_zakat_history(db, current_user.id, limit)
