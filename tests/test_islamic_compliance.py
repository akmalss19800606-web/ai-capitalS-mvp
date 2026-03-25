"""Tests for Islamic Compliance Service."""
import pytest

from app.services.islamic_compliance_service import ComplianceService


class TestComplianceService:
    """Test multi-standard Shariah compliance checking."""

    def test_aaoifi_compliant(self):
        result = ComplianceService.check_compliance(
            total_debt=20, interest_assets=10,
            haram_revenue_pct=3, receivables=30,
            market_cap=100, standard="AAOIFI",
        )
        assert result["standard"] == "AAOIFI"
        assert result["compliant"] is True
        assert result["score"] == 100.0

    def test_aaoifi_non_compliant(self):
        result = ComplianceService.check_compliance(
            total_debt=50, interest_assets=40,
            haram_revenue_pct=10, receivables=60,
            market_cap=100, standard="AAOIFI",
        )
        assert result["compliant"] is False
        assert result["score"] < 100

    def test_check_all_standards(self):
        results = ComplianceService.check_all_standards(
            total_debt=20, interest_assets=10,
            haram_revenue_pct=3, receivables=30,
            market_cap=100,
        )
        assert len(results) == 5
        standards = [r["standard"] for r in results]
        assert "AAOIFI" in standards
        assert "DJIM" in standards
        assert "MSCI" in standards

    def test_get_standards(self):
        standards = ComplianceService.get_standards()
        assert "AAOIFI" in standards
        assert "debt" in standards["AAOIFI"]
        assert standards["AAOIFI"]["debt"] == 30

    def test_zero_market_cap(self):
        result = ComplianceService.check_compliance(
            total_debt=0, interest_assets=0,
            haram_revenue_pct=0, receivables=0,
            market_cap=0, standard="AAOIFI",
        )
        assert result["compliant"] is True

    def test_boundary_threshold(self):
        result = ComplianceService.check_compliance(
            total_debt=30, interest_assets=30,
            haram_revenue_pct=5, receivables=49,
            market_cap=100, standard="AAOIFI",
        )
        assert result["compliant"] is True
        assert result["score"] == 100.0
