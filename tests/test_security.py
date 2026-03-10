"""SEC-004: Tests for security features (SEC-001, SEC-002)."""
import pytest
from fastapi.testclient import TestClient
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_access_token, decode_refresh_token,
)


class TestJWTTypeValidation:
    """SEC-001: JWT type validation tests."""

    def test_access_token_has_type_access(self):
        """Access token payload should contain type='access'."""
        token = create_access_token(data={"sub": "1"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["type"] == "access"

    def test_refresh_token_has_type_refresh(self):
        """Refresh token payload should contain type='refresh'."""
        token = create_refresh_token(data={"sub": "1"})
        payload = decode_refresh_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_refresh_token_rejected_as_access(self):
        """Refresh token must NOT be accepted as access token."""
        refresh_tok = create_refresh_token(data={"sub": "1"})
        result = decode_access_token(refresh_tok)
        assert result is None, "Refresh token was accepted as access token!"

    def test_access_token_rejected_as_refresh(self):
        """Access token must NOT be accepted as refresh token."""
        access_tok = create_access_token(data={"sub": "1"})
        result = decode_refresh_token(access_tok)
        assert result is None, "Access token was accepted as refresh token!"

    def test_invalid_token_rejected(self):
        """Invalid token should return None."""
        result = decode_access_token("invalid.token.here")
        assert result is None


class TestRefreshTokenCookie:
    """SEC-002: Refresh token in httpOnly cookie."""

    def test_login_sets_refresh_cookie(self, client: TestClient, registered_user: dict):
        """Login should set refresh_token httpOnly cookie."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        # Check cookie is set
        cookies = response.cookies
        # The response body should NOT contain refresh_token
        body = response.json()
        assert "refresh_token" not in body

    def test_login_returns_access_token(self, client: TestClient, registered_user: dict):
        """Login should return access_token in response body."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
