"""
Модуль безопасности — JWT, хеширование паролей.
Фаза 0: Добавлена проверка type в JWT, усилена валидация пароля.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Минимальные требования к паролю ──
MIN_PASSWORD_LENGTH = 8


def validate_password_strength(password: str) -> Optional[str]:
    """
    Проверяет силу пароля. Возвращает сообщение об ошибке или None.
    Требования:
    - Минимум 8 символов
    - Хотя бы одна заглавная буква
    - Хотя бы одна строчная буква
    - Хотя бы одна цифра
    - Хотя бы один спецсимвол
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Пароль должен быть минимум {MIN_PASSWORD_LENGTH} символов"
    if not any(c.isupper() for c in password):
        return "Пароль должен содержать хотя бы одну заглавную букву"
    if not any(c.islower() for c in password):
        return "Пароль должен содержать хотя бы одну строчную букву"
    if not any(c.isdigit() for c in password):
        return "Пароль должен содержать хотя бы одну цифру"
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:\'\",.\\<>?/~`]', password):
        return "Пароль должен содержать хотя бы один спецсимвол (!@#$%^&* и т.д.)"
    return None


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создать access-токен с type='access' в payload."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Создать refresh-токен с type='refresh' в payload."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Декодировать JWT токен (без проверки type)."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[dict]:
    """Декодировать и проверить что это access-токен (type == 'access')."""
    payload = decode_access_token(token)
    if payload is None:
        return None
    # Разрешаем токены без type для обратной совместимости с MFA temp tokens
    token_type = payload.get("type")
    if token_type is not None and token_type not in ("access", "mfa_pending"):
        return None
    return payload


def verify_refresh_token(token: str) -> Optional[dict]:
    """Декодировать и проверить что это refresh-токен (type == 'refresh')."""
    payload = decode_access_token(token)
    if payload is None:
        return None
    if payload.get("type") != "refresh":
        return None
    return payload


# Aliases for backward compatibility
hash_password = get_password_hash
decode_token = decode_access_token
