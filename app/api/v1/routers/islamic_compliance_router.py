"""Islamic Compliance Router - API endpoints for Shariah compliance checking."""
from fastapi import APIRouter, Query

from app.services.islamic_compliance_service import ComplianceService

router = APIRouter(prefix="/islamic/compliance", tags=["islamic-compliance"])


@router.get("/standards")
def get_standards():
    """Return available compliance standards and thresholds."""
    return ComplianceService.get_standards()


@router.get("/check")
def check_compliance(
    total_debt: float = Query(..., description="Total debt"),
    interest_assets: float = Query(..., description="Interest-bearing assets"),
    haram_revenue_pct: float = Query(..., description="Haram revenue percentage"),
    receivables: float = Query(..., description="Total receivables"),
    market_cap: float = Query(..., description="Market capitalization"),
    standard: str = Query("AAOIFI", description="Standard to check against"),
):
    """Check compliance against a specific standard."""
    return ComplianceService.check_compliance(
        total_debt, interest_assets, haram_revenue_pct,
        receivables, market_cap, standard,
    )


@router.get("/check-all")
def check_all_standards(
    total_debt: float = Query(..., description="Total debt"),
    interest_assets: float = Query(..., description="Interest-bearing assets"),
    haram_revenue_pct: float = Query(..., description="Haram revenue percentage"),
    receivables: float = Query(..., description="Total receivables"),
    market_cap: float = Query(..., description="Market capitalization"),
):
    """Check compliance against all standards."""
    return ComplianceService.check_all_standards(
        total_debt, interest_assets, haram_revenue_pct,
        receivables, market_cap,
    )
