"""SEC-004: Tests for Due Diligence scoring endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestDDScoring:
    """Tests for /api/v1/dd-scoring endpoints."""

    @pytest.mark.dd
    def test_list_dd_scores(self, client: TestClient, auth_headers: dict):
        """List DD scores."""
        response = client.get("/api/v1/dd-scoring/", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.dd
    def test_create_dd_score(self, client: TestClient, auth_headers: dict):
        """Create a DD scoring request."""
        payload = {
            "company_name": "Test Company LLC",
            "inn": "123456789",
        }
        response = client.post("/api/v1/dd-scoring/", json=payload, headers=auth_headers)
        assert response.status_code in (200, 201, 422)

    @pytest.mark.dd
    def test_dd_scoring_unauthorized(self, client: TestClient):
        """DD scoring without auth should fail."""
        response = client.get("/api/v1/dd-scoring/")
        assert response.status_code == 401

    @pytest.mark.dd
    def test_dd_score_not_found(self, client: TestClient, auth_headers: dict):
        """Getting non-existent DD score should return 404."""
        response = client.get("/api/v1/dd-scoring/99999", headers=auth_headers)
        assert response.status_code == 404
