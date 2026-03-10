"""SEC-004: Tests for investment decision endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestDecisions:
    """Tests for /api/v1/decisions endpoints."""

    @pytest.mark.decisions
    def test_list_decisions(self, client: TestClient, auth_headers: dict):
        """List investment decisions."""
        response = client.get("/api/v1/decisions/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.decisions
    def test_create_decision(self, client: TestClient, auth_headers: dict):
        """Create a new investment decision."""
        payload = {
            "title": "Test Investment Decision",
            "description": "Evaluating market entry",
            "decision_type": "invest",
            "status": "draft",
        }
        response = client.post("/api/v1/decisions/", json=payload, headers=auth_headers)
        assert response.status_code in (200, 201)

    @pytest.mark.decisions
    def test_decisions_unauthorized(self, client: TestClient):
        """Decisions list without auth should fail."""
        response = client.get("/api/v1/decisions/")
        assert response.status_code == 401

    @pytest.mark.decisions
    def test_get_decision_not_found(self, client: TestClient, auth_headers: dict):
        """Getting non-existent decision should return 404."""
        response = client.get("/api/v1/decisions/99999", headers=auth_headers)
        assert response.status_code == 404
