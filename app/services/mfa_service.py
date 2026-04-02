"""
Сервис двухфакторной аутентификации (MFA / TOTP).
Фаза 3, Сессия 3 — COLLAB-AUTH-001.1.
Поддержка:
  - Генерация TOTP-секрета и provisioning URI (для QR)
  - Верификация TOTP-кодов
  - Генерация и использование backup-кодов
  - Включение / отключение MFA
"""
import secrets
import hashlib
import hmac
import struct
import time
import base64
from typing import Optional, Tuple, List
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.db.models.auth_security import MfaSettings
from app.db.models.user import User


# ──────────────────────────────────────────────
# TOTP implementation (RFC 6238) — no pyotp dep
# ──────────────────────────────────────────────

TOTP_DIGITS = 6
TOTP_PERIOD = 30
TOTP_ALGORITHM = "sha1"
TOTP_VALID_WINDOW = 1  # allow ±1 period drift


def _generate_secret(length: int = 20) -> str:
    """Генерировать случайный секрет и вернуть base32."""
    raw = secrets.token_bytes(length)
    return base64.b32encode(raw).decode("ascii").rstrip("=")


def _hotp(secret_b32: str, counter: int) -> str:
    """HMAC-based One-Time Password (RFC 4226)."""
    # Pad secret back to proper base32
    padding = (8 - len(secret_b32) % 8) % 8
    secret_bytes = base64.b32decode(secret_b32 + "=" * padding, casefold=True)
    counter_bytes = struct.pack(">Q", counter)
    h = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    truncated = struct.unpack(">I", h[offset:offset + 4])[0] & 0x7FFFFFFF
    code = truncated % (10 ** TOTP_DIGITS)
    return str(code).zfill(TOTP_DIGITS)


def _current_counter() -> int:
    return int(time.time()) // TOTP_PERIOD


def verify_totp(secret_b32: str, code: str) -> bool:
    """Проверить TOTP-код с учётом допустимого окна."""
    counter = _current_counter()
    for drift in range(-TOTP_VALID_WINDOW, TOTP_VALID_WINDOW + 1):
        # Use constant-time comparison to prevent timing attacks (AUTH-03)
        if hmac.compare_digest(_hotp(secret_b32, counter + drift), code.strip()):
            return True
    return False


def generate_totp(secret_b32: str) -> str:
    """Сгенерировать текущий TOTP-код (для тестирования)."""
    return _hotp(secret_b32, _current_counter())


def build_provisioning_uri(secret_b32: str, email: str, issuer: str = "AI Capital") -> str:
    """Построить otpauth:// URI для QR-кода."""
    label = quote(f"{issuer}:{email}", safe="")
    params = f"secret={secret_b32}&issuer={quote(issuer)}&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_PERIOD}"
    return f"otpauth://totp/{label}?{params}"


# ──────────────────────────────────────────────
# Backup codes
# ──────────────────────────────────────────────

def _generate_backup_codes(count: int = 8) -> Tuple[List[str], List[str]]:
    """Вернуть (plain_codes, hashed_codes)."""
    plain = [secrets.token_hex(4).upper() for _ in range(count)]
    hashed = [hashlib.sha256(c.encode()).hexdigest() for c in plain]
    return plain, hashed


def _verify_backup_code(code: str, hashed_codes: List[str]) -> Tuple[bool, List[str]]:
    """Проверить backup-код, вернуть (success, remaining_hashed)."""
    h = hashlib.sha256(code.strip().upper().encode()).hexdigest()
    if h in hashed_codes:
        remaining = [c for c in hashed_codes if c != h]
        return True, remaining
    return False, hashed_codes


# ──────────────────────────────────────────────
# Service CRUD
# ──────────────────────────────────────────────

def get_mfa_settings(db: Session, user_id: int) -> Optional[MfaSettings]:
    """Получить настройки MFA пользователя."""
    return db.query(MfaSettings).filter(MfaSettings.user_id == user_id).first()


def setup_mfa(db: Session, user_id: int, email: str) -> dict:
    """
    Начать настройку MFA — генерировать секрет.
    Возвращает provisioning URI (для QR) и backup-коды.
    MFA НЕ включается до вызова confirm_mfa.
    """
    existing = get_mfa_settings(db, user_id)

    secret = _generate_secret()
    plain_codes, hashed_codes = _generate_backup_codes()
    uri = build_provisioning_uri(secret, email)

    if existing:
        existing.totp_secret = secret
        existing.backup_codes = hashed_codes
        existing.is_enabled = False
    else:
        mfa = MfaSettings(
            user_id=user_id,
            totp_secret=secret,
            backup_codes=hashed_codes,
            is_enabled=False,
        )
        db.add(mfa)

    db.commit()

    return {
        "provisioning_uri": uri,
        "secret": secret,
        "backup_codes": plain_codes,
    }


def confirm_mfa(db: Session, user_id: int, code: str) -> bool:
    """Подтвердить настройку MFA — пользователь вводит код из приложения."""
    mfa = get_mfa_settings(db, user_id)
    if not mfa or not mfa.totp_secret:
        return False

    if verify_totp(mfa.totp_secret, code):
        mfa.is_enabled = True
        db.commit()
        return True
    return False


def disable_mfa(db: Session, user_id: int, code: str) -> bool:
    """Отключить MFA — требуется текущий TOTP-код."""
    mfa = get_mfa_settings(db, user_id)
    if not mfa or not mfa.is_enabled:
        return False

    if verify_totp(mfa.totp_secret, code):
        mfa.is_enabled = False
        mfa.totp_secret = None
        mfa.backup_codes = None
        db.commit()
        return True
    return False


def verify_mfa_code(db: Session, user_id: int, code: str) -> bool:
    """
    Проверить MFA-код при логине.
    Сначала пробуем TOTP, потом backup-коды.
    """
    mfa = get_mfa_settings(db, user_id)
    if not mfa or not mfa.is_enabled:
        return True  # MFA не включено — пропускаем

    # Try TOTP
    if mfa.totp_secret and verify_totp(mfa.totp_secret, code):
        return True

    # Try backup code
    if mfa.backup_codes:
        ok, remaining = _verify_backup_code(code, mfa.backup_codes)
        if ok:
            mfa.backup_codes = remaining
            db.commit()
            return True

    return False


def is_mfa_required(db: Session, user_id: int) -> bool:
    """Проверить, включено ли MFA у пользователя."""
    mfa = get_mfa_settings(db, user_id)
    return mfa is not None and mfa.is_enabled
