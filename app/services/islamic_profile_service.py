"""Islamic Profile Service — создаёт/обновляет профиль пользователя."""
from sqlalchemy.orm import Session
from app.schemas.islamic_stage1 import IslamicProfileUpsert, IslamicProfileResponse


def get_or_create_profile(db: Session, user_id: int) -> IslamicProfileResponse:
    from app.db.models.islamic_stage1 import IslamicProfile
    profile = db.query(IslamicProfile).filter(IslamicProfile.user_id == user_id).first()
    if not profile:
        profile = IslamicProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return IslamicProfileResponse.model_validate(profile)


def update_profile(
    db: Session,
    user_id: int,
    data: IslamicProfileUpsert,
) -> IslamicProfileResponse:
    from app.db.models.islamic_stage1 import IslamicProfile
    profile = db.query(IslamicProfile).filter(IslamicProfile.user_id == user_id).first()
    if not profile:
        profile = IslamicProfile(user_id=user_id)
        db.add(profile)

    profile.mode = data.mode
    profile.default_currency = data.default_currency
    profile.language = data.language
    db.commit()
    db.refresh(profile)
    return IslamicProfileResponse.model_validate(profile)
