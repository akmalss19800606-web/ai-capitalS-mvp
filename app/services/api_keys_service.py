"""
Сервис управления API-ключами.
Фаза 4, Сессия 2 — EXCH-GW-001.5.
"""
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db.models.api_gateway import ApiKey

logger = logging.getLogger(__name__)

API_KEY_PREFIX = "aicap_"  # префикс ключа для идентификации


def _generate_key() -> str:
    """Сгенерировать случайный API-ключ."""
    return API_KEY_PREFIX + secrets.token_urlsafe(32)


def _hash_key(key: str) -> str:
    """SHA-256 хэш ключа."""
    return hashlib.sha256(key.encode()).hexdigest()


def create_api_key(
    db: Session,
    user_id: int,
    name: str,
    scopes: Optional[List[str]] = None,
    rate_limit: int = 100,
    expires_days: Optional[int] = None,
) -> tuple:
    """
    Создать новый API-ключ. Возвращает (ApiKey, full_key).
    Полный ключ показывается только один раз.
    """
    full_key = _generate_key()
    key_hash = _hash_key(full_key)
    key_prefix = full_key[:12]  # aicap_ + 6 chars

    expires_at = None
    if expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    api_key = ApiKey(
        user_id=user_id,
        name=name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=scopes,
        is_active=True,
        expires_at=expires_at,
        rate_limit=rate_limit,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    logger.info(f"API key #{api_key.id} created for user #{user_id}: {key_prefix}...")
    return api_key, full_key


def verify_api_key(db: Session, raw_key: str) -> Optional[ApiKey]:
    """Проверить API-ключ. Возвращает ApiKey если валиден, иначе None."""
    key_hash = _hash_key(raw_key)
    api_key = db.query(ApiKey).filter(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True,
    ).first()

    if not api_key:
        return None

    # Проверить срок действия
    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        return None

    # Обновить last_used_at и счётчик
    api_key.last_used_at = datetime.now(timezone.utc)
    api_key.request_count += 1
    db.commit()

    return api_key


def list_api_keys(db: Session, user_id: int) -> List[ApiKey]:
    """Получить все ключи пользователя."""
    return (
        db.query(ApiKey)
        .filter(ApiKey.user_id == user_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )


def get_api_key(db: Session, key_id: int) -> Optional[ApiKey]:
    return db.query(ApiKey).filter(ApiKey.id == key_id).first()


def update_api_key(
    db: Session,
    key_id: int,
    name: Optional[str] = None,
    scopes: Optional[List[str]] = None,
    is_active: Optional[bool] = None,
    rate_limit: Optional[int] = None,
) -> Optional[ApiKey]:
    """Обновить настройки ключа."""
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not api_key:
        return None
    if name is not None:
        api_key.name = name
    if scopes is not None:
        api_key.scopes = scopes
    if is_active is not None:
        api_key.is_active = is_active
    if rate_limit is not None:
        api_key.rate_limit = rate_limit
    db.commit()
    db.refresh(api_key)
    return api_key


def revoke_api_key(db: Session, key_id: int) -> bool:
    """Отозвать (деактивировать) ключ."""
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not api_key:
        return False
    api_key.is_active = False
    db.commit()
    return True


def delete_api_key(db: Session, key_id: int) -> bool:
    """Удалить ключ полностью."""
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not api_key:
        return False
    db.delete(api_key)
    db.commit()
    return True
