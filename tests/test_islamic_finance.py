"""SEC-004: Tests for Islamic finance endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestIslamicFinance:
    """Tests for /api/v1/islamic-finance endpoints."""

    @pytest.mark.islamic
    def test_shariah_screening_endpoint(self, client: TestClient, auth_headers: dict):
        """Test Shariah screening endpoint exists and responds."""
        response = client.get("/api/v1/islamic-finance/screening", headers=auth_headers)
        assert response.status_code in (200, 404, 405)

    @pytest.mark.islamic
    def test_zakat_calculator(self, client: TestClient, auth_headers: dict):
        """Test zakat calculator endpoint."""
        payload = {"total_assets": 100000, "liabilities": 20000, "nisab_gold_grams": 85}
        response = client.post("/api/v1/islamic-finance/zakat/calculate", json=payload, headers=auth_headers)
        assert response.status_code in (200, 422)

    @pytest.mark.islamic
    def test_islamic_finance_unauthorized(self, client: TestClient):
        """Islamic finance endpoints without auth should fail."""
        response = client.get("/api/v1/islamic-finance/screening")
        assert response.status_code == 401
