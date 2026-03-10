"""
Зависимости FastAPI — подключение к БД и авторизация.
Фаза 0: get_current_user проверяет type токена через verify_access_token.
"""
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import verify_access_token, decode_token
from app.db.session import SessionLocal
from app.db.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Используем verify_access_token — отклоняет refresh-токены
    payload = verify_access_token(token)
    if payload is None:
        raise credentials_exception

    # Блокировка MFA-pending токенов (они не дают доступ к API)
    if payload.get("type") == "mfa_pending":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    # Проверка is_active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован. Обратитесь к администратору.",
        )

    return user
