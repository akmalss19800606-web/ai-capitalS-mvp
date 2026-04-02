"""
E2-04: IFRS Converter API — POST /analytics/ifrs-convert
Converts NSBU financial data to IFRS for a given portfolio and period.
Accepts JSON body (from frontend) with fallback to cache-based conversion.
"""
import logging
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.api.v1.routers.portfolios import _user_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics-ifrs"])


class IFRSConvertRequest(BaseModel):
    portfolio_id: int = 1
    organization_id: Optional[int] = None
    period_from: Optional[str] = None
    period_to: Optional[str] = None


def _convert_from_cache(accounts: dict) -> dict:
    """Compute IFRS adjustments directly from cached 1C data."""

    def _v(code: str, field: str = "current") -> float:
        acc = accounts.get(code)
        return acc[field] if acc else 0.0

    adjustments = []
    warnings = []
    total_nsbu = Decimal(0)
    total_ifrs = Decimal(0)
    oci = Decimal(0)

    # IFRS 16 — Leases (account 6970)
    lease_payment = _v("6970")
    if lease_payment > 0:
        discount_rate = 0.18
        lease_term = 5
        pv_factor = (1 - (1 + discount_rate) ** (-lease_term)) / discount_rate
        rou_asset = round(lease_payment * pv_factor, 2)
        nsbu_val = Decimal(str(round(lease_payment, 2)))
        ifrs_val = Decimal(str(rou_asset))
        diff = ifrs_val - nsbu_val
        total_nsbu += nsbu_val
        total_ifrs += ifrs_val
        adjustments.append({
            "type": "ifrs16_lease",
            "adjustment_type": "ifrs16_lease",
            "account": "6970",
            "nsbu": str(nsbu_val),
            "nsbu_amount": float(nsbu_val),
            "ifrs": str(ifrs_val),
            "ifrs_amount": float(ifrs_val),
            "diff": str(diff),
            "difference": float(diff),
            "description": f"IFRS 16: ПП-актив (PV аренды) = {rou_asset:,.0f}",
        })

    # IAS 16 — PPE revaluation (accounts 0100, 0200)
    gross_fa = _v("0100")
    depreciation = _v("0200")
    net_fa = gross_fa - depreciation
    if net_fa > 0:
        revaluation_factor = 1.15
        ifrs_fa = round(net_fa * revaluation_factor, 2)
        nsbu_val = Decimal(str(round(net_fa, 2)))
        ifrs_val = Decimal(str(ifrs_fa))
        diff = ifrs_val - nsbu_val
        total_nsbu += nsbu_val
        total_ifrs += ifrs_val
        oci += diff  # revaluation goes to OCI
        adjustments.append({
            "type": "ias16_revaluation",
            "adjustment_type": "ias16_revaluation",
            "account": "0100",
            "nsbu": str(nsbu_val),
            "nsbu_amount": float(nsbu_val),
            "ifrs": str(ifrs_val),
            "ifrs_amount": float(ifrs_val),
            "diff": str(diff),
            "difference": float(diff),
            "description": f"IAS 16: Переоценка ОС (+15%) = {ifrs_fa:,.0f}",
        })

    # IAS 36/IFRS 9 — Impairment / ECL (accounts 4010, 2010)
    receivables = _v("4010") or _v("2010")
    if receivables > 0:
        ecl_rate = 0.05
        ecl = round(receivables * ecl_rate, 2)
        nsbu_val = Decimal(str(round(receivables, 2)))
        ifrs_val = Decimal(str(round(receivables - ecl, 2)))
        diff = ifrs_val - nsbu_val
        total_nsbu += nsbu_val
        total_ifrs += ifrs_val
        adjustments.append({
            "type": "ias36_impairment",
            "adjustment_type": "ias36_impairment",
            "account": "4010" if _v("4010") else "2010",
            "nsbu": str(nsbu_val),
            "nsbu_amount": float(nsbu_val),
            "ifrs": str(ifrs_val),
            "ifrs_amount": float(ifrs_val),
            "diff": str(diff),
            "difference": float(diff),
            "description": f"IFRS 9: ECL-резерв (5%) = -{ecl:,.0f}",
        })

    status = "completed" if adjustments else "partial"
    if not adjustments:
        warnings.append("Нет счетов, подлежащих МСФО-корректировке.")

    return {
        "status": status,
        "adjustments_count": len(adjustments),
        "total_nsbu_assets": str(total_nsbu),
        "total_ifrs_assets": str(total_ifrs),
        "total_difference": str(total_ifrs - total_nsbu),
        "oci": str(oci),
        "warnings": warnings,
        "adjustments": adjustments,
    }


@router.post("/ifrs-convert")
def convert_to_ifrs(
    req: IFRSConvertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Конвертировать НСБУ → МСФО. Uses cached 1C data first, falls back to DB."""
    # Try cache-based conversion first
    cache = _user_cache(current_user.id)
    accounts = cache.get("accounts")
    if accounts:
        return _convert_from_cache(accounts)

    # Fallback: try DB-based conversion via IFRSConverter service
    try:
        from app.services.ifrs_converter import IFRSConverter
        from app.db.models.portfolio import Portfolio

        portfolio = db.query(Portfolio).filter(Portfolio.id == req.portfolio_id).first()
        if not portfolio:
            return {
                "status": "error",
                "adjustments_count": 0,
                "total_nsbu_assets": "0",
                "total_ifrs_assets": "0",
                "total_difference": "0",
                "oci": "0",
                "warnings": ["Нет данных. Импортируйте файл 1С."],
                "adjustments": [],
            }

        period_from = date.fromisoformat(req.period_from) if req.period_from else date(2025, 1, 1)
        period_to = date.fromisoformat(req.period_to) if req.period_to else date(2025, 12, 31)
        org_id = req.organization_id or 1

        converter = IFRSConverter()
        result = converter.convert(
            portfolio_id=req.portfolio_id,
            organization_id=org_id,
            period_from=period_from,
            period_to=period_to,
            db=db,
        )

        return {
            "status": result.status,
            "adjustments_count": len(result.adjustments),
            "total_nsbu_assets": str(result.total_nsbu_assets),
            "total_ifrs_assets": str(result.total_ifrs_assets),
            "total_difference": str(result.total_ifrs_assets - result.total_nsbu_assets),
            "oci": str(result.oci_amount),
            "warnings": result.warnings,
            "adjustments": [
                {
                    "type": a.adjustment_type,
                    "adjustment_type": a.adjustment_type,
                    "account": a.account_code,
                    "nsbu": str(a.nsbu_amount),
                    "nsbu_amount": float(a.nsbu_amount),
                    "ifrs": str(a.ifrs_amount),
                    "ifrs_amount": float(a.ifrs_amount),
                    "diff": str(a.difference),
                    "difference": float(a.difference),
                    "description": a.description,
                }
                for a in result.adjustments
            ],
        }
    except Exception as e:
        logger.warning("IFRS DB conversion failed, returning empty: %s", e)
        return {
            "status": "error",
            "adjustments_count": 0,
            "total_nsbu_assets": "0",
            "total_ifrs_assets": "0",
            "total_difference": "0",
            "oci": "0",
            "warnings": [f"Нет данных. Импортируйте файл 1С. ({e})"],
            "adjustments": [],
        }
