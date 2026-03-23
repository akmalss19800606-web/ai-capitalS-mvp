from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.islamic_stage2 import (
    PurificationCalculateRequest, PurificationCalculateResponse, PurificationHistoryItem
)
from app.services import income_purification_service

router = APIRouter(prefix="/islamic/purification", tags=["islamic-purification"])


@router.post("/calculate", response_model=PurificationCalculateResponse)
def calculate(
    request: PurificationCalculateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return income_purification_service.calculate_purification(db, current_user.id, request)


@router.get("/history", response_model=List[PurificationHistoryItem])
def history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return income_purification_service.get_history(db, current_user.id)
