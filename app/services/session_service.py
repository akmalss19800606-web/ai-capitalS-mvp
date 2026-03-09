"""
Сервис управления сессиями пользователей.
Фаза 3, Сессия 3 — COLLAB-AUTH-001.4.
Поддержка:
  - Создание и регистрация сессий при логине
  - Список активных сессий пользователя
  - Принудительный logout сессии
  - Автоматический logout при неактивности
  - Очистка истёкших сессий
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db.models.auth_security import UserSession


# ──────────────────────────────────────────────
# Конфигурация
# ──────────────────────────────────────────────

SESSION_MAX_AGE_HOURS = 24        # максимальное время жизни сессии
INACTIVITY_TIMEOUT_MINUTES = 120  # auto-logout при неактивности


# ──────────────────────────────────────────────
# Создание / регистрация
# ──────────────────────────────────────────────

def create_session(
    db: Session,
    user_id: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> str:
    """
    Создать новую сессию и вернуть token_jti.
    jti встраивается в JWT для связи токена с сессией.
    """
    jti = secrets.token_hex(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_MAX_AGE_HOURS)

    # Определить устройство из user-agent
    device = "Неизвестно"
    if user_agent:
        ua_lower = user_agent.lower()
        if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
            device = "Мобильное устройство"
        elif "windows" in ua_lower:
            device = "Windows"
        elif "macintosh" in ua_lower or "mac os" in ua_lower:
            device = "macOS"
        elif "linux" in ua_lower:
            device = "Linux"
        else:
            device = "Браузер"

    session_obj = UserSession(
        user_id=user_id,
        token_jti=jti,
        ip_address=ip_address,
        user_agent=user_agent[:512] if user_agent else None,
        device_info=device,
        is_active=True,
        expires_at=expires,
    )
    db.add(session_obj)
    db.commit()

    return jti


# ──────────────────────────────────────────────
# Валидация
# ──────────────────────────────────────────────

def validate_session(db: Session, jti: str) -> Optional[UserSession]:
    """
    Проверить сессию по jti.
    Возвращает объект сессии если активна, иначе None.
    Также проверяет inactivity timeout.
    """
    s = db.query(UserSession).filter(
        UserSession.token_jti == jti,
        UserSession.is_active == True,
    ).first()

    if not s:
        return None

    now = datetime.now(timezone.utc)

    # Проверить истечение срока
    if s.expires_at.replace(tzinfo=timezone.utc) < now:
        s.is_active = False
        db.commit()
        return None

    # Проверить неактивность
    last = s.last_activity.replace(tzinfo=timezone.utc) if s.last_activity else s.created_at.replace(tzinfo=timezone.utc)
    if (now - last) > timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES):
        s.is_active = False
        db.commit()
        return None

    # Обновить last_activity
    s.last_activity = now
    db.commit()

    return s


# ──────────────────────────────────────────────
# Список / управление
# ──────────────────────────────────────────────

def get_user_sessions(db: Session, user_id: int) -> List[dict]:
    """Получить список активных сессий пользователя."""
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user_id, UserSession.is_active == True)
        .order_by(UserSession.last_activity.desc())
        .all()
    )

    result = []
    now = datetime.now(timezone.utc)
    for s in sessions:
        # Проверить не истекла ли
        exp = s.expires_at.replace(tzinfo=timezone.utc) if s.expires_at else now
        if exp < now:
            s.is_active = False
            continue

        result.append({
            "id": s.id,
            "ip_address": s.ip_address or "—",
            "device_info": s.device_info or "Неизвестно",
            "last_activity": s.last_activity.isoformat() if s.last_activity else "—",
            "created_at": s.created_at.isoformat() if s.created_at else "—",
            "expires_at": s.expires_at.isoformat() if s.expires_at else "—",
            "is_current": False,  # will be set by router
        })

    db.commit()
    return result


def force_logout_session(db: Session, session_id: int, user_id: int) -> bool:
    """Принудительно завершить конкретную сессию."""
    s = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == user_id,
        UserSession.is_active == True,
    ).first()

    if not s:
        return False

    s.is_active = False
    db.commit()
    return True


def force_logout_all(db: Session, user_id: int, except_jti: Optional[str] = None) -> int:
    """
    Завершить все сессии пользователя.
    except_jti — текущая сессия, которую не трогаем.
    Возвращает количество завершённых сессий.
    """
    query = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.is_active == True,
    )
    if except_jti:
        query = query.filter(UserSession.token_jti != except_jti)

    sessions = query.all()
    count = 0
    for s in sessions:
        s.is_active = False
        count += 1

    db.commit()
    return count


def cleanup_expired_sessions(db: Session) -> int:
    """Очистить истёкшие / неактивные сессии (для периодического cron)."""
    now = datetime.now(timezone.utc)
    expired = db.query(UserSession).filter(
        UserSession.is_active == True,
        UserSession.expires_at < now,
    ).all()

    count = 0
    for s in expired:
        s.is_active = False
        count += 1

    db.commit()
    return count
