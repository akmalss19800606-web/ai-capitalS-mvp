"""
Конфигурация тестов — pytest fixtures.
Этап 0, Сессия 0.4 — Базовые тесты.

Используется SQLite in-memory для изоляции от production PostgreSQL.
"""
import os
import pytest
from typing import Generator

# ── Переменные окружения ДО импорта app ──
# Это критично: Settings валидирует SECRET_KEY при импорте
os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters-long-enough")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

# Создаём /app/uploads если не существует (для document_service)
try:
    os.makedirs("/app/uploads", exist_ok=True)
except PermissionError:
    os.makedirs("/tmp/app_uploads", exist_ok=True)
    os.environ.setdefault("UPLOAD_DIR", "/tmp/app_uploads")

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.session import Base
from app.api.v1.deps import get_db


# ── SQLite in-memory engine ──
SQLALCHEMY_TEST_URL = "sqlite://"

engine_test = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Включить поддержку FK в SQLite
@event.listens_for(engine_test, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine_test,
)


# ── Фикстура: тестовая БД (создаётся/удаляется для каждого теста) ──
@pytest.fixture(autouse=True)
def setup_database():
    """Создать все таблицы перед тестом, удалить после."""
    # Импортируем base.py чтобы все модели зарегистрировались в metadata
    import app.db.base  # noqa: F401
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


# ── Фикстура: тестовая сессия БД ──
@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Тестовая сессия SQLAlchemy."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── Фикстура: override get_db для FastAPI ──
def override_get_db() -> Generator[Session, None, None]:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── Фикстура: тестовый HTTP-клиент ──
@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI TestClient с подменённой БД."""
    # Ленивый импорт app чтобы env-переменные уже были установлены
    from app.main import app
    from app.db.session import get_db as session_get_db

    # Подменяем get_db во всех местах
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[session_get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ── Фикстура: зарегистрированный пользователь ──
@pytest.fixture
def registered_user(client: TestClient) -> dict:
    """
    Создать пользователя и вернуть данные.
    Возвращает: {"email": ..., "password": ..., "full_name": ..., "id": ...}
    """
    payload = {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "full_name": "Тестовый Пользователь",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200, f"Регистрация не удалась: {response.text}"
    data = response.json()
    return {**payload, "id": data["id"]}


# ── Фикстура: токен авторизации ──
@pytest.fixture
def auth_token(client: TestClient, registered_user: dict) -> str:
    """Получить access_token для зарегистрированного пользователя."""
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    assert response.status_code == 200, f"Логин не удался: {response.text}"
    return response.json()["access_token"]


# ── Фикстура: заголовки с токеном ──
@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    """Заголовки Authorization: Bearer <token>."""
    return {"Authorization": f"Bearer {auth_token}"}
