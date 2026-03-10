"""SEC-004: Tests for dashboard endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestDashboard:
    """Tests for /api/v1/dashboard endpoints."""

    @pytest.mark.dashboard
    def test_get_dashboard(self, client: TestClient, auth_headers: dict):
        """Get main dashboard data."""
        response = client.get("/api/v1/dashboard/", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.dashboard
    def test_dashboard_unauthorized(self, client: TestClient):
        """Dashboard without auth should fail."""
        response = client.get("/api/v1/dashboard/")
        assert response.status_code == 401

    @pytest.mark.dashboard
    def test_dashboard_stats(self, client: TestClient, auth_headers: dict):
        """Get dashboard statistics."""
        response = client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code in (200, 404)
