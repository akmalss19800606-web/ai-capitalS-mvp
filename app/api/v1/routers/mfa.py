"""
Роутер MFA — двухфакторная аутентификация.
Фаза 3, Сессия 3 — COLLAB-AUTH-001.1.

Эндпоинты:
  POST /auth/mfa/setup     — начать настройку MFA (получить QR + backup-коды)
  POST /auth/mfa/confirm   — подтвердить настройку MFA кодом из приложения
  POST /auth/mfa/disable   — отключить MFA
  GET  /auth/mfa/status     — статус MFA текущего пользователя
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.services import mfa_service

router = APIRouter(prefix="/auth/mfa", tags=["mfa"])


# ── Schemas ──

class MfaSetupResponse(BaseModel):
    provisioning_uri: str
    secret: str
    backup_codes: List[str]

class MfaCodeRequest(BaseModel):
    code: str

class MfaStatusResponse(BaseModel):
    is_enabled: bool
    has_backup_codes: bool
    backup_codes_remaining: int


# ── Endpoints ──

@router.get("/status", response_model=MfaStatusResponse)
def mfa_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить статус MFA текущего пользователя."""
    mfa = mfa_service.get_mfa_settings(db, current_user.id)
    if not mfa:
        return MfaStatusResponse(
            is_enabled=False,
            has_backup_codes=False,
            backup_codes_remaining=0,
        )
    return MfaStatusResponse(
        is_enabled=mfa.is_enabled,
        has_backup_codes=bool(mfa.backup_codes),
        backup_codes_remaining=len(mfa.backup_codes) if mfa.backup_codes else 0,
    )


@router.post("/setup", response_model=MfaSetupResponse)
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Начать настройку MFA.
    Возвращает provisioning URI (для QR-кода) и backup-коды.
    MFA не включается до вызова /confirm.
    """
    result = mfa_service.setup_mfa(db, current_user.id, current_user.email)
    return MfaSetupResponse(**result)


@router.post("/confirm")
def confirm_mfa(
    body: MfaCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Подтвердить настройку — ввести код из приложения-аутентификатора."""
    ok = mfa_service.confirm_mfa(db, current_user.id, body.code)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код. Проверьте приложение-аутентификатор.",
        )
    return {"message": "MFA успешно включено", "is_enabled": True}


@router.post("/disable")
def disable_mfa(
    body: MfaCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отключить MFA — требуется текущий TOTP-код."""
    ok = mfa_service.disable_mfa(db, current_user.id, body.code)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код или MFA не включено.",
        )
    return {"message": "MFA отключено", "is_enabled": False}
