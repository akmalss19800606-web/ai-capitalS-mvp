"""SEC-004: Tests for portfolio endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestPortfolios:
    """Tests for /api/v1/portfolios endpoints."""

    @pytest.mark.portfolios
    def test_create_portfolio(self, client: TestClient, auth_headers: dict):
        """Create a new portfolio."""
        payload = {"name": "Test Portfolio", "description": "Test description"}
        response = client.post("/api/v1/portfolios/", json=payload, headers=auth_headers)
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["name"] == "Test Portfolio"

    @pytest.mark.portfolios
    def test_list_portfolios(self, client: TestClient, auth_headers: dict):
        """List user's portfolios."""
        response = client.get("/api/v1/portfolios/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.portfolios
    def test_list_portfolios_unauthorized(self, client: TestClient):
        """Listing portfolios without auth should fail."""
        response = client.get("/api/v1/portfolios/")
        assert response.status_code == 401

    @pytest.mark.portfolios
    def test_create_portfolio_unauthorized(self, client: TestClient):
        """Creating portfolio without auth should fail."""
        payload = {"name": "Unauthorized Portfolio"}
        response = client.post("/api/v1/portfolios/", json=payload)
        assert response.status_code == 401

    @pytest.mark.portfolios
    def test_get_portfolio_not_found(self, client: TestClient, auth_headers: dict):
        """Getting non-existent portfolio should return 404."""
        response = client.get("/api/v1/portfolios/99999", headers=auth_headers)
        assert response.status_code == 404
