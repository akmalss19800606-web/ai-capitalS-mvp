"""E2E Integration Tests - Islamic Finance Module.

Verifies all Islamic finance endpoints respond correctly.
"""
import pytest
from fastapi.testclient import TestClient


def get_client():
    from app.main import app
    return TestClient(app)


ISLAMIC_ENDPOINTS = [
    # Zakat
    ("/api/v1/islamic/zakat/nisab", 200),
    # Screening
    ("/api/v1/islamic/screening/companies", 200),
    ("/api/v1/islamic/screening/results", 200),
    # Glossary
    ("/api/v1/islamic/glossary", 200),
    # References/Standards
    ("/api/v1/islamic/references/standards", 200),
    # SSB
    ("/api/v1/islamic/ssb/members", 200),
    ("/api/v1/islamic/ssb/fatwas", 200),
    # P2P
    ("/api/v1/islamic/p2p/projects", 200),
    # Sukuk
    ("/api/v1/islamic/sukuk", 200),
    # Takaful
    ("/api/v1/islamic/takaful", 200),
    # Waqf
    ("/api/v1/islamic/waqf", 200),
    ("/api/v1/islamic/waqf/stats", 200),
    # Products
    ("/api/v1/islamic/products", 200),
    # Contracts
    ("/api/v1/islamic/contracts/", 200),
    ("/api/v1/islamic/contracts/types", 200),
    # Compliance
    ("/api/v1/islamic/compliance/standards", 200),
    ("/api/v1/islamic/compliance/check", 200),
    # Education
    ("/api/v1/islamic/education/courses", 200),
    ("/api/v1/islamic/education/categories", 200),
    # Indices
    ("/api/v1/islamic/indices/", 200),
    ("/api/v1/islamic/indices/providers", 200),
]


class TestIslamicFinanceE2E:
    """End-to-end smoke tests for all Islamic finance endpoints."""

    @pytest.mark.parametrize("endpoint,expected_status", ISLAMIC_ENDPOINTS)
    def test_endpoint_responds(self, endpoint, expected_status):
        client = get_client()
        resp = client.get(endpoint)
        assert resp.status_code == expected_status, (
            f"{endpoint} returned {resp.status_code}, expected {expected_status}"
        )

    def test_zakat_calculate(self):
        client = get_client()
        resp = client.post("/api/v1/islamic/zakat/calculate", json={
            "zakat_type": "wealth",
            "assets": {"cash": 100000000, "gold": 50000000},
            "liabilities_uzs": 10000000,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "zakat_due_uzs" in data

    def test_screening_flow(self):
        client = get_client()
        resp = client.post("/api/v1/islamic/screening/screen", json={
            "company_name": "Test Company",
            "haram_revenue_pct": 2.0,
            "debt_ratio": 25.0,
            "interest_income_pct": 1.5,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data

    def test_takaful_calculator(self):
        client = get_client()
        resp = client.post("/api/v1/islamic/takaful/calculate", json={
            "coverage_amount": 50000000,
            "takaful_type": "family",
            "term_months": 12,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "monthly_contribution" in data

    def test_all_endpoints_return_json(self):
        client = get_client()
        for endpoint, _ in ISLAMIC_ENDPOINTS:
            resp = client.get(endpoint)
            if resp.status_code == 200:
                assert resp.headers.get("content-type", "").startswith("application/json")
