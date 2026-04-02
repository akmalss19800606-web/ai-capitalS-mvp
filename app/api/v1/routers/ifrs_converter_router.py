"""
E2-04: IFRS Converter API — POST /analytics/ifrs-convert
Converts NSBU financial data to IFRS for a given portfolio and period.
"""
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.services.ifrs_converter import IFRSConverter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics-ifrs"])


@router.post("/ifrs-convert")
def convert_to_ifrs(
    portfolio_id: int = Form(...),
    organization_id: int = Form(...),
    period_from: date = Form(...),
    period_to: date = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Конвертировать НСБУ → МСФО для выбранного портфеля и организации."""
    # Validate portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Портфель не найден")

    if period_from > period_to:
        raise HTTPException(
            status_code=400,
            detail="period_from должен быть раньше period_to",
        )

    converter = IFRSConverter()
    result = converter.convert(
        portfolio_id=portfolio_id,
        organization_id=organization_id,
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
                "account": a.account_code,
                "nsbu": str(a.nsbu_amount),
                "ifrs": str(a.ifrs_amount),
                "diff": str(a.difference),
                "description": a.description,
            }
            for a in result.adjustments
        ],
    }
