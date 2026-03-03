from sqlalchemy.orm import Session
from app.db.models.user import User
from app.schemas.user import UserCreate, UserRead

def create_user(db: Session, user_in: UserCreate) -> UserRead:
    user = User(email=user_in.email, full_name=user_in.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


def get_users(db: Session) -> list[UserRead]:
    users = db.query(User).all()
    return [UserRead.model_validate(u) for u in users]


def get_user_by_id(db: Session, user_id: int) -> UserRead | None:
    user = db.query(User).filter(User.id == user_id).first()
    return UserRead.model_validate(user) if user else None


def update_user(db: Session, user_id: int, user_in: UserCreate) -> UserRead | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.email = user_in.email
    user.full_name = user_in.full_name
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


def delete_user(db: Session, user_id: int) -> bool:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True