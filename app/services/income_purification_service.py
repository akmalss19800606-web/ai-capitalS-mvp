from typing import List, Optional
from decimal import Decimal
from datetime import date
import uuid
from sqlalchemy.orm import Session
from app.db.models.islamic_stage2 import IncomePurificationCase
from app.schemas.islamic_stage2 import PurificationCalculateRequest, PurificationCalculateResponse, PurificationHistoryItem


def _get_exchange_rate(db: Session) -> Decimal:
    try:
        from app.db.models.islamic_stage1 import CurrencyRate
        rate = db.query(CurrencyRate).filter(CurrencyRate.currency_code == "USD").order_by(CurrencyRate.rate_date.desc()).first()
        if rate:
            return Decimal(str(rate.rate_uzs))
    except Exception:
        pass
    return Decimal("12700")


def calculate_purification(db: Session, user_id: int, request: PurificationCalculateRequest) -> PurificationCalculateResponse:
    non_compliant_pct = request.non_compliant_pct

    # Если передан screening_result_id — берём % из него
    if request.screening_result_id:
        try:
            from app.db.models.islamic_stage1 import ShariahScreeningResult
            result = db.query(ShariahScreeningResult).filter(
                ShariahScreeningResult.id == request.screening_result_id
            ).first()
            if result and result.haram_revenue_pct is not None:
                non_compliant_pct = Decimal(str(result.haram_revenue_pct))
        except Exception as e:
            # ISL-09: Log screening lookup failure instead of silent swallow
            import logging
            logging.getLogger(__name__).warning(f"Screening lookup failed: {e}")

    exchange_rate = _get_exchange_rate(db)
    purification_uzs = (request.gross_income_uzs * non_compliant_pct / Decimal("100")).quantize(Decimal("0.01"))
    purification_usd = (purification_uzs / exchange_rate).quantize(Decimal("0.01"))

    case = IncomePurificationCase(
        id=uuid.uuid4(),
        user_id=user_id,
        mode=request.mode.value,
        calculation_date=date.today(),
        source_type=request.source_type,
        source_description=request.source_description,
        gross_income_uzs=request.gross_income_uzs,
        non_compliant_pct=non_compliant_pct,
        purification_amount_uzs=purification_uzs,
        exchange_rate_uzs=exchange_rate,
        purification_amount_usd=purification_usd,
        screening_result_id=request.screening_result_id,
        notes=request.notes,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    explanation = (
        f"Сумма очистки рассчитана по формуле: {request.gross_income_uzs:,.0f} UZS × {non_compliant_pct}% = "
        f"{purification_uzs:,.0f} UZS ({purification_usd:,.2f} USD). "
        f"Курс USD/UZS: {exchange_rate:,.0f}. "
        f"Очищенная сумма должна быть направлена на благотворительность согласно AAOIFI SS No. 21."
    )

    return PurificationCalculateResponse(
        id=case.id,
        calculation_date=case.calculation_date,
        gross_income_uzs=request.gross_income_uzs,
        non_compliant_pct=non_compliant_pct,
        purification_amount_uzs=purification_uzs,
        purification_amount_usd=purification_usd,
        exchange_rate_uzs=exchange_rate,
        explanation_ru=explanation,
    )


def get_history(db: Session, user_id: int) -> List[PurificationHistoryItem]:
    return db.query(IncomePurificationCase).filter(
        IncomePurificationCase.user_id == user_id
    ).order_by(IncomePurificationCase.created_at.desc()).limit(50).all()
