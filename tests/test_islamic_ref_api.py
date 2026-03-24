"""
Tests for Islamic Finance Reference Data API endpoints.
Covers: /api/v1/islamic/products, /posc-rules, /recommendations
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestIslamicProducts:
    def test_list_products(self):
        resp = client.get("/api/v1/islamic/products")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_products_by_category(self):
        resp = client.get("/api/v1/islamic/products?category=equity")
        assert resp.status_code == 200

    def test_get_product_not_found(self):
        resp = client.get("/api/v1/islamic/products/nonexistent")
        assert resp.status_code == 404


class TestPoSCRules:
    def test_list_posc_rules(self):
        resp = client.get("/api/v1/islamic/posc-rules")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_by_category(self):
        resp = client.get("/api/v1/islamic/posc-rules?category=screening")
        assert resp.status_code == 200

    def test_list_by_severity(self):
        resp = client.get("/api/v1/islamic/posc-rules?severity=critical")
        assert resp.status_code == 200

    def test_get_rule_not_found(self):
        resp = client.get("/api/v1/islamic/posc-rules/nonexistent")
        assert resp.status_code == 404


class TestRecommendations:
    def test_list_recommendations(self):
        resp = client.get("/api/v1/islamic/recommendations")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_filter_by_profile(self):
        resp = client.get("/api/v1/islamic/recommendations?profile=conservative")
        assert resp.status_code == 200

    def test_filter_by_risk(self):
        resp = client.get("/api/v1/islamic/recommendations?risk=low")
        assert resp.status_code == 200
