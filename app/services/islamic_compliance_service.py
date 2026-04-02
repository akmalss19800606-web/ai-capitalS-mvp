"""Islamic Compliance Service - multi-standard Shariah compliance checking."""
import logging
from typing import Any

logger = logging.getLogger(__name__)

STANDARDS = {
    "AAOIFI": {"debt": 30, "interest": 30, "haram": 5, "receivables": 49},
    "DJIM": {"debt": 33, "interest": 33, "haram": 5, "receivables": 33},
    "FTSE": {"debt": 33, "interest": 33, "haram": 5, "receivables": 50},
    "SP": {"debt": 33, "interest": 33, "haram": 5, "receivables": 49},
    "MSCI": {"debt": 33.33, "interest": 33.33, "haram": 5, "receivables": 33.33},
}


class ComplianceService:
    """Multi-standard Shariah compliance checker."""

    @staticmethod
    def check_compliance(
        total_debt: float,
        interest_assets: float,
        haram_revenue_pct: float,
        receivables: float,
        market_cap: float,
        standard: str = "AAOIFI",
    ) -> dict[str, Any]:
        """Check compliance against a specific standard."""
        thresholds = STANDARDS.get(standard, STANDARDS["AAOIFI"])
        # ISL-15: Return error for invalid market_cap instead of using mc=1
        if market_cap <= 0:
            return {"error": "Market cap must be positive", "compliant": False, "score": 0, "checks": []}
        mc = market_cap
        checks = [
            {
                "name": "debt_ratio",
                "value": round((total_debt / mc) * 100, 2),
                "threshold": thresholds["debt"],
                "pass": (total_debt / mc) * 100 <= thresholds["debt"],
            },
            {
                "name": "interest_ratio",
                "value": round((interest_assets / mc) * 100, 2),
                "threshold": thresholds["interest"],
                "pass": (interest_assets / mc) * 100 <= thresholds["interest"],
            },
            {
                "name": "haram_revenue",
                "value": round(haram_revenue_pct, 2),
                "threshold": thresholds["haram"],
                "pass": haram_revenue_pct <= thresholds["haram"],
            },
            {
                "name": "receivables_ratio",
                "value": round((receivables / mc) * 100, 2),
                "threshold": thresholds["receivables"],
                "pass": (receivables / mc) * 100 <= thresholds["receivables"],
            },
        ]
        passed = sum(1 for c in checks if c["pass"])
        return {
            "standard": standard,
            "compliant": passed == 4,
            "score": round((passed / 4) * 100, 1),
            "checks": checks,
        }

    @staticmethod
    def check_all_standards(
        total_debt: float,
        interest_assets: float,
        haram_revenue_pct: float,
        receivables: float,
        market_cap: float,
    ) -> list[dict[str, Any]]:
        """Check compliance against all standards."""
        results = []
        for std in STANDARDS:
            result = ComplianceService.check_compliance(
                total_debt, interest_assets, haram_revenue_pct,
                receivables, market_cap, std,
            )
            results.append(result)
        return results

    @staticmethod
    def get_standards() -> dict:
        """Return available standards and thresholds."""
        return STANDARDS
