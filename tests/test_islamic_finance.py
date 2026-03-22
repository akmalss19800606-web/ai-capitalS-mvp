"""
Tests for Islamic Finance module.
Run: docker exec -it ai-capitals-mvp-backend-1 python -m pytest tests/test_islamic_finance.py -v
"""
import pytest
from decimal import Decimal

# ---- Unit tests for ScreeningService ----
from app.services.islamic_finance_service import ScreeningService, ZakatService


class TestScreeningService:
    def test_calc_ratios_aaoifi_compliant(self):
        result = ScreeningService.calc_ratios(
            total_debt=20, interest_bearing_securities=5,
            cash_and_interest=5, haram_revenue=2,
            receivables=30, market_cap=100,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        assert result["standard"] == "AAOIFI"
        assert result["is_compliant"] is True
        assert result["score"] == 100.0
        assert len(result["ratios"]) == 4

    def test_calc_ratios_aaoifi_non_compliant(self):
        result = ScreeningService.calc_ratios(
            total_debt=50, interest_bearing_securities=20,
            cash_and_interest=20, haram_revenue=10,
            receivables=60, market_cap=100,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        assert result["is_compliant"] is False
        assert result["score"] < 100

    def test_calc_ratios_all_standards(self):
        for std in ["AAOIFI", "DJIM", "FTSE", "SP", "MSCI"]:
            result = ScreeningService.calc_ratios(
                total_debt=10, interest_bearing_securities=5,
                cash_and_interest=5, haram_revenue=1,
                receivables=20, market_cap=100,
                total_assets=100, total_revenue=100, standard=std
            )
            assert result["standard"] == std
            assert "ratios" in result

    def test_debt_ratio_calculation(self):
        result = ScreeningService.calc_ratios(
            total_debt=30, interest_bearing_securities=0,
            cash_and_interest=0, haram_revenue=0,
            receivables=0, market_cap=100,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        debt = next(r for r in result["ratios"] if r["ratio_name"] == "debt_ratio")
        assert debt["value"] == 30.0
        assert debt["threshold"] == 30
        assert debt["passed"] is True

    def test_haram_revenue_ratio(self):
        result = ScreeningService.calc_ratios(
            total_debt=0, interest_bearing_securities=0,
            cash_and_interest=0, haram_revenue=6,
            receivables=0, market_cap=100,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        haram = next(r for r in result["ratios"] if r["ratio_name"] == "haram_revenue")
        assert haram["value"] == 6.0
        assert haram["passed"] is False


class TestZakatService:
    def test_nisab_gold_usd(self):
        nisab = ZakatService.get_nisab("gold", "USD")
        assert nisab == round(85 * 65.0 * 1, 2)

    def test_nisab_silver_usd(self):
        nisab = ZakatService.get_nisab("silver", "USD")
        assert nisab == round(595 * 0.8 * 1, 2)

    def test_nisab_gold_uzs(self):
        nisab = ZakatService.get_nisab("gold", "UZS")
        assert nisab > 0

    def test_nisab_info(self):
        info = ZakatService.get_nisab_info("USD")
        assert "nisab_gold" in info
        assert "nisab_silver" in info
        assert info["currency"] == "USD"
        assert info["nisab_gold"]["grams"] == 85
        assert info["nisab_silver"]["grams"] == 595


class TestScreeningThresholds:
    def test_boundary_exactly_at_threshold(self):
        result = ScreeningService.calc_ratios(
            total_debt=30, interest_bearing_securities=15,
            cash_and_interest=15, haram_revenue=5,
            receivables=49, market_cap=100,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        assert result["is_compliant"] is True

    def test_boundary_just_above_threshold(self):
        result = ScreeningService.calc_ratios(
            total_debt=30.01, interest_bearing_securities=15,
            cash_and_interest=15, haram_revenue=5,
            receivables=49, market_cap=100,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        assert result["is_compliant"] is False

    def test_zero_market_cap_uses_total_assets(self):
        result = ScreeningService.calc_ratios(
            total_debt=10, interest_bearing_securities=5,
            cash_and_interest=5, haram_revenue=1,
            receivables=20, market_cap=0,
            total_assets=100, total_revenue=100, standard="AAOIFI"
        )
        debt = next(r for r in result["ratios"] if r["ratio_name"] == "debt_ratio")
        assert debt["value"] == 10.0
