"""
Роутер аутентификации.
Фаза 0: httpOnly cookie для refresh-токена, проверка type,
         усиленная валидация пароля при регистрации.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.api.v1.deps import get_db, get_current_user
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_password,
    decode_access_token,
    verify_refresh_token,
    validate_password_strength,
)
from app.db.models.user import User
from app.db.models.auth_security import SsoProvider
from app.schemas.user import Token, UserCreate, UserRead
from app.services import mfa_service, session_service

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Cookie settings ──
REFRESH_COOKIE_KEY = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 дней
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Установить refresh-токен в httpOnly cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=refresh_token,
        httponly=True,
        secure=False,  # True в продакшне (HTTPS)
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path=REFRESH_COOKIE_PATH,
    )


def _delete_refresh_cookie(response: Response) -> None:
    """Удалить refresh-токен cookie."""
    response.delete_cookie(
        key=REFRESH_COOKIE_KEY,
        path=REFRESH_COOKIE_PATH,
    )


# ── Schemas ──

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None  # Оставляем для обратной совместимости (может быть None)
    token_type: str = "bearer"
    mfa_required: bool = False
    mfa_temp_token: Optional[str] = None

class MfaVerifyRequest(BaseModel):
    mfa_temp_token: str
    code: str

class SsoProviderRead(BaseModel):
    id: int
    name: str
    protocol: str
    is_active: bool
    class Config:
        from_attributes = True

class SsoProviderCreate(BaseModel):
    name: str
    protocol: str
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    issuer_url: Optional[str] = None
    metadata_url: Optional[str] = None


# ── Auth endpoints ──

@router.post("/register", response_model=UserRead)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Валидация силы пароля
    password_error = validate_password_strength(user_in.password)
    if password_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=password_error,
        )

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Логин с поддержкой MFA.
    Refresh-токен устанавливается как httpOnly cookie.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Проверить нужна ли MFA
    if mfa_service.is_mfa_required(db, user.id):
        from datetime import timedelta
        temp_token = create_access_token(
            data={"sub": str(user.id), "type": "mfa_pending"},
            expires_delta=timedelta(minutes=5),
        )
        return LoginResponse(
            access_token="",
            refresh_token=None,
            token_type="bearer",
            mfa_required=True,
            mfa_temp_token=temp_token,
        )

    # MFA не требуется — выдать полные токены и зарегистрировать сессию
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    jti = session_service.create_session(db, user.id, ip, ua)

    access_token = create_access_token(data={"sub": str(user.id), "jti": jti})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Устанавливаем refresh-токен в httpOnly cookie
    _set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,  # Также в body для обратной совместимости
        "token_type": "bearer",
        "mfa_required": False,
    }


@router.post("/mfa-verify")
def mfa_verify(
    body: MfaVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Верификация MFA-кода после логина."""
    payload = decode_access_token(body.mfa_temp_token)
    if not payload or payload.get("type") != "mfa_pending":
        raise HTTPException(status_code=401, detail="Недействительный MFA-токен")

    user_id = int(payload["sub"])
    if not mfa_service.verify_mfa_code(db, user_id, body.code):
        raise HTTPException(status_code=400, detail="Неверный MFA-код")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Создать сессию
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    jti = session_service.create_session(db, user.id, ip, ua)

    access_token = create_access_token(data={"sub": str(user.id), "jti": jti})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Устанавливаем refresh-токен в httpOnly cookie
    _set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "mfa_required": False,
    }


@router.post("/refresh", response_model=Token)
def refresh_token_endpoint(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Обновление access-токена.
    Refresh-токен берётся из httpOnly cookie (приоритет)
    или из body (обратная совместимость).
    """
    # Приоритет: cookie > body
    token = request.cookies.get(REFRESH_COOKIE_KEY) or refresh_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
        )

    payload = verify_refresh_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access = create_access_token(data={"sub": str(user.id)})
    new_refresh = create_refresh_token(data={"sub": str(user.id)})

    # Обновляем cookie
    _set_refresh_cookie(response, new_refresh)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    """Логаут — удаляет refresh cookie."""
    _delete_refresh_cookie(response)
    return {"message": "Вы успешно вышли из системы"}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── SSO Provider management (COLLAB-AUTH-001.2) ──

@router.get("/sso/providers", response_model=List[SsoProviderRead])
def list_sso_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список настроенных SSO-провайдеров."""
    return db.query(SsoProvider).order_by(SsoProvider.name).all()


@router.post("/sso/providers", response_model=SsoProviderRead, status_code=201)
def create_sso_provider(
    body: SsoProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать SSO-провайдер (только Admin)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin")
    provider = SsoProvider(
        name=body.name,
        protocol=body.protocol,
        client_id=body.client_id,
        client_secret=body.client_secret,
        issuer_url=body.issuer_url,
        metadata_url=body.metadata_url,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@router.delete("/sso/providers/{provider_id}")
def delete_sso_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Только Admin")
    p = db.query(SsoProvider).filter(SsoProvider.id == provider_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Провайдер не найден")
    db.delete(p)
    db.commit()
    return {"message": f"SSO-провайдер '{p.name}' удалён"}
