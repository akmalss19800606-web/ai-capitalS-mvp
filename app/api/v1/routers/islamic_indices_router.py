"""Islamic Indices Router - market indices and risk assessment API."""
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.islamic_indices_service import (
    get_indices,
    get_index_history,
    assess_risk,
)

router = APIRouter(prefix="/islamic/indices", tags=["islamic-indices"])


@router.get("/")
def list_indices():
    """Get all Islamic market indices with current values."""
    return get_indices()


@router.get("/{index_id}/history")
def index_history(
    index_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
):
    """Get historical data for a specific index."""
    result = get_index_history(index_id, days)
    if not result:
        return {"error": "Index not found"}
    return result


class RiskAssessmentRequest(BaseModel):
    portfolio_value: float
    shariah_compliant_pct: float = 100.0


@router.post("/risk-assessment")
def risk_assessment(req: RiskAssessmentRequest):
    """Assess risk for an Islamic portfolio."""
    return assess_risk(
        portfolio_value=req.portfolio_value,
        shariah_pct=req.shariah_compliant_pct,
    )
