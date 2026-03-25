"""Tests for Islamic Contracts API endpoints."""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


def get_client():
    from app.main import app
    return TestClient(app)


class TestIslamicContractsAPI:
    """Test Islamic contracts catalog endpoints."""

    def test_list_contracts(self):
        client = get_client()
        resp = client.get("/api/v1/islamic/contracts/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_contracts_filter_by_type(self):
        client = get_client()
        resp = client.get("/api/v1/islamic/contracts/", params={"contract_type": "exchange"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        for item in data:
            assert item.get("contract_type") == "exchange" or "exchange" in str(item.get("category", "")).lower()

    def test_get_contract_types(self):
        client = get_client()
        resp = client.get("/api/v1/islamic/contracts/types")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_contract_by_id(self):
        client = get_client()
        # First get list to find a valid ID
        list_resp = client.get("/api/v1/islamic/contracts/")
        contracts = list_resp.json()
        if contracts:
            contract_id = contracts[0].get("id") or contracts[0].get("slug")
            resp = client.get(f"/api/v1/islamic/contracts/{contract_id}")
            assert resp.status_code == 200

    def test_get_contract_not_found(self):
        client = get_client()
        resp = client.get("/api/v1/islamic/contracts/nonexistent-contract-999")
        assert resp.status_code == 404

    def test_contract_has_required_fields(self):
        client = get_client()
        resp = client.get("/api/v1/islamic/contracts/")
        data = resp.json()
        if data:
            contract = data[0]
            assert "id" in contract or "slug" in contract
            assert "name_ru" in contract or "name" in contract
