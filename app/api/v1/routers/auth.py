"""
Обновлённый роутер аутентификации.
Фаза 3, Сессия 3 — добавлена поддержка MFA при логине,
регистрация сессий, SSO-провайдеры (конфигурация).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.api.v1.deps import get_db, get_current_user
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    hash_password, decode_access_token, decode_refresh_token,
)
from app.db.models.user import User
from app.db.models.auth_security import SsoProvider
from app.schemas.user import Token, UserCreate, UserRead
from app.services import mfa_service, session_service

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ──

# SEC-002: Cookie settings for refresh token
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 3600  # 7 days


class LoginResponse(BaseModel):
    access_token: str
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


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Логин с поддержкой MFA.
    Если MFA включено — возвращает mfa_required=true и mfa_temp_token.
    Клиент затем вызывает /auth/mfa-verify с кодом.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Проверить нужна ли MFA
    if mfa_service.is_mfa_required(db, user.id):
        # Выдать временный токен (короткоживущий) для MFA-подтверждения
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
    refresh_tok = create_refresh_token(data={"sub": str(user.id)})

    # SEC-002: Set refresh token as httpOnly cookie
    response_body = LoginResponse(
        access_token=access_token,
        token_type="bearer",
        mfa_required=False,
    )
    response = JSONResponse(content=response_body.model_dump())
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_tok,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )
    return response


@router.post("/mfa-verify")
def mfa_verify(
    body: MfaVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Верификация MFA-кода после логина."""
    # MFA temp tokens have type='access' due to create_access_token usage
    payload = decode_access_token(body.mfa_temp_token)
    if not payload:
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
    refresh_tok = create_refresh_token(data={"sub": str(user.id)})

    # SEC-002: Set refresh token as httpOnly cookie
    response_body = LoginResponse(
        access_token=access_token,
        token_type="bearer",
        mfa_required=False,
    )
    response = JSONResponse(content=response_body.model_dump())
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_tok,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )
    return response


@router.post("/refresh")
def refresh_token_endpoint(request: Request, db: Session = Depends(get_db)):
    """SEC-002: Read refresh token from httpOnly cookie."""
    refresh_tok = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_tok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing",
        )
    payload = decode_refresh_token(refresh_tok)
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

    response = JSONResponse(content={"access_token": new_access, "token_type": "bearer"})
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )
    return response


@router.post("/logout")
def logout(response: Response, current_user: User = Depends(get_current_user)):
    """SEC-002: Clear refresh token cookie on logout."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/v1/auth",
    )
    return {"message": "Logged out successfully"}


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
