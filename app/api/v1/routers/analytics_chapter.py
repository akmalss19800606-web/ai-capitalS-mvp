"""
Analytics chapter API stubs — KPI, DCF, multiples, stress-test, visualizations, decisions.
Returns empty/default responses so the frontend doesn't 404.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

router = APIRouter(tags=["analytics-chapter"])


@router.get("/analytics/kpi")
async def get_kpi(standard: Optional[str] = "nsbu"):
    """KPI groups by accounting standard."""
    return JSONResponse({"groups": []})


class DcfInput(BaseModel):
    revenue: float = 0
    growth_rate: float = 0
    wacc: float = 0
    terminal_growth: float = 0
    years: int = 5


@router.post("/analytics/dcf")
async def calculate_dcf(data: DcfInput):
    """DCF valuation stub."""
    return JSONResponse({
        "wacc": 0,
        "enterprise_value": 0,
        "equity_value": 0,
        "intrinsic_value_per_share": 0,
        "pv_fcff": 0,
        "terminal_value": 0,
    })


@router.get("/analytics/multiples")
async def get_multiples():
    """Market multiples stub."""
    return JSONResponse({})


class StressTestInput(BaseModel):
    scenarios: List[Dict[str, Any]] = []


@router.post("/analytics/stress-test")
async def run_stress_test(data: StressTestInput = StressTestInput()):
    """Stress test stub."""
    return JSONResponse({"results": [], "ai_summary": []})


@router.get("/analytics/visualizations")
async def get_visualizations():
    """Chart/visualization data stub."""
    return JSONResponse({})


class ImpactInput(BaseModel):
    decision_type: str = ""
    params: Dict[str, Any] = {}


@router.post("/decisions/impact")
async def calculate_impact(data: ImpactInput = ImpactInput()):
    """Decision impact calculator stub."""
    return JSONResponse({"rows": []})
