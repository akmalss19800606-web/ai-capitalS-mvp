"""Integration tests for Sukuk, Takaful and Waqf API endpoints."""
import pytest
from unittest.mock import patch, MagicMock

# ---- Sukuk tests ----

def test_sukuk_list_empty(mocker):
    """GET /sukuk returns empty list when no data."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []
    from app.services.sukuk_takaful_waqf_service import get_sukuk_list
    result = get_sukuk_list(mock_db)
    assert result == []


def test_sukuk_list_with_filter(mocker):
    """GET /sukuk?type=ijara filters by sukuk_type."""
    mock_db = MagicMock()
    mock_item = MagicMock()
    mock_item.sukuk_type = "ijara"
    mock_db.query.return_value.filter.return_value.all.return_value = [mock_item]
    from app.services.sukuk_takaful_waqf_service import get_sukuk_list
    result = get_sukuk_list(mock_db, sukuk_type="ijara")
    assert len(result) == 1

# ---- Takaful tests ----

def test_takaful_calculator_returns_monthly_contribution():
    """Takaful calculator returns correct monthly contribution."""
    from app.services.sukuk_takaful_waqf_service import calculate_takaful_contribution
    result = calculate_takaful_contribution(
        coverage_amount=50000000, takaful_type="family", term_months=12
    )
    assert "monthly_contribution" in result
    assert result["monthly_contribution"] > 0
    assert result["total_contribution"] == result["monthly_contribution"] * 12


def test_takaful_list_empty():
    """get_takaful_plans returns empty list from mock DB."""
    mock_db = MagicMock()
    mock_db.query.return_value.all.return_value = []
    from app.services.sukuk_takaful_waqf_service import get_takaful_plans
    result = get_takaful_plans(mock_db)
    assert result == []

# ---- Waqf tests ----

def test_waqf_list_empty():
    """get_waqf_projects returns empty list from mock DB."""
    mock_db = MagicMock()
    mock_db.query.return_value.all.return_value = []
    from app.services.sukuk_takaful_waqf_service import get_waqf_projects
    result = get_waqf_projects(mock_db)
    assert result == []


def test_waqf_stats_structure():
    """get_waqf_stats returns correct dict structure."""
    mock_db = MagicMock()
    mock_db.query.return_value.count.return_value = 3
    mock_db.query.return_value.filter.return_value.count.return_value = 2
    mock_db.query.return_value.with_entities.return_value.scalar.return_value = 1000000
    from app.services.sukuk_takaful_waqf_service import get_waqf_stats
    result = get_waqf_stats(mock_db)
    assert "total_projects" in result
    assert "total_raised" in result
    assert "active_projects" in result
