"""Tests for Islamic Indices Service."""
from app.services.islamic_indices_service import (
    get_indices,
    get_index_history,
    assess_risk,
)


def test_get_indices():
    result = get_indices()
    assert len(result) == 5
    for idx in result:
        assert "current_value" in idx
        assert "daily_change_pct" in idx
        assert "monthly_change_pct" in idx


def test_get_index_history_found():
    result = get_index_history("DJIM", 30)
    assert result is not None
    assert result["id"] == "DJIM"
    assert "history" in result
    assert len(result["history"]) == 30


def test_get_index_history_not_found():
    result = get_index_history("NONEXISTENT")
    assert result is None


def test_assess_risk_full_compliant():
    result = assess_risk(1000000, 100.0)
    assert result["risk_level"] == "low"
    assert result["risk_score"] == 10.0


def test_assess_risk_partial_compliant():
    result = assess_risk(1000000, 70.0)
    assert result["risk_level"] == "high"
    assert result["shariah_compliant_pct"] == 70.0


def test_assess_risk_recommendations():
    result = assess_risk(500000, 90.0)
    assert len(result["recommendations"]) == 3
    assert "активов" in result["recommendations"][0]
