"""Islamic Profile Router — /api/v1/islamic/profile/..."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.deps import get_current_user
from app.schemas.islamic_stage1 import IslamicProfileUpsert, IslamicProfileResponse
from app.services import islamic_profile_service

router = APIRouter()


@router.get("", response_model=IslamicProfileResponse, summary="Мой исламский профиль")
def get_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return islamic_profile_service.get_or_create_profile(db, current_user.id)


@router.put("", response_model=IslamicProfileResponse, summary="Обновить исламский профиль")
def update_profile(
    data: IslamicProfileUpsert,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return islamic_profile_service.update_profile(db, current_user.id, data)
