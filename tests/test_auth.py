"""
Тесты аутентификации.
Этап 0, Сессия 0.4 — Базовые тесты.

Проверяет:
  - POST /auth/register — регистрация нового пользователя
  - POST /auth/login — получение JWT-токена (OAuth2 form)
  - GET /auth/me — получение данных текущего пользователя
  - Дублирование email при регистрации
  - Неверные учётные данные при логине
  - Запрос без токена / с невалидным токеном
"""
import pytest
from fastapi.testclient import TestClient


class TestRegister:
    """Тесты регистрации POST /api/v1/auth/register."""

    @pytest.mark.auth
    def test_register_success(self, client: TestClient):
        """Успешная регистрация нового пользователя."""
        payload = {
            "email": "newuser@example.com",
            "password": "StrongPass123!",
            "full_name": "Новый Пользователь",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "Новый Пользователь"
        assert data["is_active"] is True
        assert "id" in data
        assert isinstance(data["id"], int)
        # Пароль НЕ должен возвращаться
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.auth
    def test_register_duplicate_email(self, client: TestClient, registered_user: dict):
        """Повторная регистрация с тем же email возвращает 400."""
        payload = {
            "email": registered_user["email"],
            "password": "AnotherPass123!",
            "full_name": "Другой Пользователь",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    @pytest.mark.auth
    def test_register_invalid_email(self, client: TestClient):
        """Регистрация с невалидным email возвращает 422."""
        payload = {
            "email": "not-an-email",
            "password": "StrongPass123!",
            "full_name": "Тест",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    @pytest.mark.auth
    def test_register_missing_password(self, client: TestClient):
        """Регистрация без пароля возвращает 422."""
        payload = {
            "email": "test2@example.com",
            "full_name": "Тест",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422


class TestLogin:
    """Тесты логина POST /api/v1/auth/login."""

    @pytest.mark.auth
    def test_login_success(self, client: TestClient, registered_user: dict):
        """Успешный логин возвращает access_token."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    @pytest.mark.auth
    def test_login_wrong_password(self, client: TestClient, registered_user: dict):
        """Логин с неверным паролем возвращает 401."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": "WrongPassword!",
            },
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.auth
    def test_login_nonexistent_user(self, client: TestClient):
        """Логин несуществующего пользователя возвращает 401."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "SomePass123!",
            },
        )
        assert response.status_code == 401

    @pytest.mark.auth
    def test_login_returns_refresh_token(self, client: TestClient, registered_user: dict):
        """Логин возвращает refresh_token."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        data = response.json()
        # refresh_token должен присутствовать (может быть None если MFA)
        assert "refresh_token" in data


class TestMe:
    """Тесты GET /api/v1/auth/me."""

    @pytest.mark.auth
    def test_me_with_valid_token(self, client: TestClient, auth_headers: dict, registered_user: dict):
        """GET /auth/me с валидным токеном возвращает данные пользователя."""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["full_name"] == registered_user["full_name"]
        assert data["id"] == registered_user["id"]
        assert data["is_active"] is True

    @pytest.mark.auth
    def test_me_without_token(self, client: TestClient):
        """GET /auth/me без токена возвращает 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.auth
    def test_me_with_invalid_token(self, client: TestClient):
        """GET /auth/me с невалидным токеном возвращает 401."""
        headers = {"Authorization": "Bearer invalid-token-12345"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401

    @pytest.mark.auth
    def test_me_with_expired_token(self, client: TestClient, registered_user: dict):
        """GET /auth/me с истёкшим токеном возвращает 401."""
        from datetime import timedelta
        from app.core.security import create_access_token

        # Создаём токен с отрицательным временем жизни (уже истёк)
        expired_token = create_access_token(
            data={"sub": str(registered_user["id"])},
            expires_delta=timedelta(seconds=-10),
        )
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
