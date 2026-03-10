"""SEC-004: Tests for company lookup endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestCompanyLookup:
    """Tests for /api/v1/company-lookup endpoints."""

    @pytest.mark.company
    def test_search_company_by_inn(self, client: TestClient, auth_headers: dict):
        """Search company by INN."""
        response = client.get("/api/v1/company-lookup/search?inn=123456789", headers=auth_headers)
        assert response.status_code in (200, 404, 422)

    @pytest.mark.company
    def test_search_company_unauthorized(self, client: TestClient):
        """Company search without auth should fail."""
        response = client.get("/api/v1/company-lookup/search?inn=123456789")
        assert response.status_code == 401

    @pytest.mark.company
    def test_company_lookup_no_params(self, client: TestClient, auth_headers: dict):
        """Company search without parameters."""
        response = client.get("/api/v1/company-lookup/search", headers=auth_headers)
        assert response.status_code in (200, 422)
