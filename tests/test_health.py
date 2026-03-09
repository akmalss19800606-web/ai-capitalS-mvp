"""
Тесты Health Check.
Этап 0, Сессия 0.4 — Базовые тесты.

Проверяет:
  - GET /health возвращает 200
  - Формат ответа {"status": "ok"}
  - Эндпоинт доступен без авторизации
"""
import pytest
from fastapi.testclient import TestClient


class TestHealthCheck:
    """Тесты эндпоинта /health."""

    @pytest.mark.health
    def test_health_returns_200(self, client: TestClient):
        """GET /health должен вернуть HTTP 200."""
        response = client.get("/health")
        assert response.status_code == 200

    @pytest.mark.health
    def test_health_response_body(self, client: TestClient):
        """GET /health должен вернуть {"status": "ok"}."""
        response = client.get("/health")
        data = response.json()
        assert data == {"status": "ok"}
        assert data["status"] == "ok"

    @pytest.mark.health
    def test_health_no_auth_required(self, client: TestClient):
        """GET /health не требует авторизации (нет заголовка Authorization)."""
        response = client.get("/health")
        # Должен вернуть 200, а не 401/403
        assert response.status_code == 200

    @pytest.mark.health
    def test_health_content_type(self, client: TestClient):
        """GET /health возвращает application/json."""
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")
