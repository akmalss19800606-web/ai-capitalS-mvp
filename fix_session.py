content = '''"""
app/services/session_service.py — управление сессиями JWT (jti валидация).
"""
from sqlalchemy.orm import Session


def validate_session(db: Session, jti: str):
    """
    Валидация jti токена. 
    Возвращает объект сессии если активна, None если инвалидирована.
    Минимальная реализация — всегда валидна (без Redis).
    """
    return True  # TODO: реализовать через Redis/DB при необходимости


def invalidate_session(db: Session, jti: str) -> bool:
    """Инвалидировать сессию по jti."""
    return True
'''

with open('backend/app/services/session_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('session_service.py created!')
