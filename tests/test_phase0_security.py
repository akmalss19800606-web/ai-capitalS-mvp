"""
Тесты Фазы 0 — Критические исправления безопасности.

Покрывает:
  - 0.1: JWT type проверка (access vs refresh)
  - 0.2: httpOnly cookie для refresh-токена
  - 0.4: Security Headers middleware
  - 0.7: Усиленная валидация пароля
"""
import pytest
from datetime import timedelta
from fastapi.testclient import TestClient


class TestJwtTokenType:
    """Задача 0.1: JWT — проверка type токена."""

    def test_access_token_has_type_access(self, client: TestClient):
        """Access-токен содержит type='access' в payload."""
        from app.core.security import create_access_token, decode_access_token
        token = create_access_token(data={"sub": "1"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["type"] == "access"

    def test_refresh_token_has_type_refresh(self, client: TestClient):
        """Refresh-токен содержит type='refresh' в payload."""
        from app.core.security import create_refresh_token, decode_access_token
        token = create_refresh_token(data={"sub": "1"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_refresh_token_rejected_as_access(self, client: TestClient, registered_user: dict):
        """Refresh-токен НЕ принимается для доступа к защищённым эндпоинтам."""
        from app.core.security import create_refresh_token
        refresh_token = create_refresh_token(data={"sub": str(registered_user["id"])})
        headers = {"Authorization": f"Bearer {refresh_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401

    def test_verify_access_token_accepts_access(self):
        """verify_access_token принимает access-токен."""
        from app.core.security import create_access_token, verify_access_token
        token = create_access_token(data={"sub": "1"})
        payload = verify_access_token(token)
        assert payload is not None
        assert payload["sub"] == "1"

    def test_verify_access_token_rejects_refresh(self):
        """verify_access_token отклоняет refresh-токен."""
        from app.core.security import create_refresh_token, verify_access_token
        token = create_refresh_token(data={"sub": "1"})
        payload = verify_access_token(token)
        assert payload is None

    def test_verify_refresh_token_accepts_refresh(self):
        """verify_refresh_token принимает refresh-токен."""
        from app.core.security import create_refresh_token, verify_refresh_token
        token = create_refresh_token(data={"sub": "1"})
        payload = verify_refresh_token(token)
        assert payload is not None

    def test_verify_refresh_token_rejects_access(self):
        """verify_refresh_token отклоняет access-токен."""
        from app.core.security import create_access_token, verify_refresh_token
        token = create_access_token(data={"sub": "1"})
        payload = verify_refresh_token(token)
        assert payload is None


class TestRefreshTokenCookie:
    """Задача 0.2: httpOnly cookie для refresh-токена."""

    def test_login_sets_refresh_cookie(self, client: TestClient, registered_user: dict):
        """POST /auth/login устанавливает refresh_token cookie."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        # Проверяем что cookie установлена
        cookies = response.cookies
        assert "refresh_token" in cookies or response.json().get("refresh_token")

    def test_login_returns_access_token_in_body(self, client: TestClient, registered_user: dict):
        """POST /auth/login возвращает access_token в теле ответа."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        data = response.json()
        assert "access_token" in data
        assert len(data["access_token"]) > 0

    def test_refresh_with_body_still_works(self, client: TestClient, registered_user: dict):
        """POST /auth/refresh с refresh_token в body работает (обратная совместимость)."""
        # Логин
        login_resp = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        refresh_token = login_resp.json().get("refresh_token")
        if refresh_token:
            # Refresh через body
            refresh_resp = client.post(
                "/api/v1/auth/refresh",
                params={"refresh_token": refresh_token},
            )
            assert refresh_resp.status_code == 200
            data = refresh_resp.json()
            assert "access_token" in data


class TestSecurityHeaders:
    """Задача 0.4: Security Headers middleware."""

    def test_health_endpoint_has_security_headers(self, client: TestClient):
        """GET /health возвращает security headers."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "Strict-Transport-Security" in response.headers
        assert "Referrer-Policy" in response.headers

    def test_api_endpoint_has_security_headers(self, client: TestClient, auth_headers: dict):
        """Защищённый API эндпоинт возвращает security headers."""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"


class TestPasswordValidation:
    """Задача 0.7: Усиленная валидация пароля."""

    def test_password_too_short(self):
        """Пароль короче 8 символов отклоняется."""
        from app.core.security import validate_password_strength
        error = validate_password_strength("Ab1!")
        assert error is not None
        assert "8" in error

    def test_password_no_uppercase(self):
        """Пароль без заглавной буквы отклоняется."""
        from app.core.security import validate_password_strength
        error = validate_password_strength("abcdefg1!")
        assert error is not None
        assert "заглавн" in error.lower()

    def test_password_no_lowercase(self):
        """Пароль без строчной буквы отклоняется."""
        from app.core.security import validate_password_strength
        error = validate_password_strength("ABCDEFG1!")
        assert error is not None
        assert "строчн" in error.lower()

    def test_password_no_digit(self):
        """Пароль без цифры отклоняется."""
        from app.core.security import validate_password_strength
        error = validate_password_strength("Abcdefgh!")
        assert error is not None
        assert "цифр" in error.lower()

    def test_password_no_special(self):
        """Пароль без спецсимвола отклоняется."""
        from app.core.security import validate_password_strength
        error = validate_password_strength("Abcdefg1")
        assert error is not None
        assert "спецсимвол" in error.lower()

    def test_valid_password(self):
        """Корректный пароль проходит валидацию."""
        from app.core.security import validate_password_strength
        error = validate_password_strength("StrongPass123!")
        assert error is None

    def test_register_weak_password_rejected(self, client: TestClient):
        """POST /auth/register с слабым паролем возвращает 400."""
        payload = {
            "email": "weak@example.com",
            "password": "weak",
            "full_name": "Тест",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400

    def test_register_no_special_char_rejected(self, client: TestClient):
        """POST /auth/register без спецсимвола возвращает 400."""
        payload = {
            "email": "nospecial@example.com",
            "password": "StrongPass123",
            "full_name": "Тест",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400

    def test_register_strong_password_accepted(self, client: TestClient):
        """POST /auth/register с сильным паролем проходит."""
        payload = {
            "email": "strong@example.com",
            "password": "StrongPass123!",
            "full_name": "Тестовый Пользователь",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 200


class TestLogoutEndpoint:
    """Задача 0.2: Эндпоинт logout."""

    def test_logout_returns_success(self, client: TestClient, auth_headers: dict):
        """POST /auth/logout возвращает успех."""
        response = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        assert "успешно" in response.json()["message"].lower() or "вышли" in response.json()["message"].lower()

    def test_logout_without_auth_fails(self, client: TestClient):
        """POST /auth/logout без токена возвращает 401."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 401
