"""
Zakat Service — расчёт закята по методу AAOIFI (2.5% от чистых активов).
Хранит историю в таблице zakat_calculation_v2.
"""
import uuid
from decimal import Decimal
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session

from app.services.nisab_service import get_nisab_today
from app.schemas.islamic_stage1 import (
    ZakatCalculateRequest,
    ZakatCalculateResponse,
    ZakatHistoryItem,
)

ZAKAT_RATE = Decimal("0.025")  # 2.5%


def calculate_zakat(
    db: Session,
    user_id: uuid.UUID,
    request: ZakatCalculateRequest,
) -> ZakatCalculateResponse:
    nisab_data = get_nisab_today(db)

    calc_date = request.calculation_date or date.today()
    assets_total = sum(item.amount_uzs for item in request.assets)
    net_assets = assets_total - request.liabilities_uzs

    is_due = net_assets >= nisab_data["nisab_uzs"]
    zakat_uzs = (net_assets * ZAKAT_RATE).quantize(Decimal("0.01")) if is_due else Decimal("0")
    zakat_usd = (zakat_uzs / nisab_data["exchange_rate_uzs"]).quantize(Decimal("0.01"))

    if is_due:
        explanation = (
            f"Ваши чистые активы ({net_assets:,.0f} UZS) превышают нисаб "
            f"({nisab_data['nisab_uzs']:,.0f} UZS = 85 г золота). "
            f"Закят составляет 2.5% от чистых активов = {zakat_uzs:,.0f} UZS."
        )
    else:
        explanation = (
            f"Ваши чистые активы ({net_assets:,.0f} UZS) не достигают нисаба "
            f"({nisab_data['nisab_uzs']:,.0f} UZS = 85 г золота). "
            f"Закят не обязателен."
        )

    # Сохранить в БД
    record_id = None
    try:
        from app.db.models.islamic_stage1 import ZakatCalculationV2
        record = ZakatCalculationV2(
            user_id=user_id,
            mode=request.mode,
            calculation_date=calc_date,
            zakat_type=request.zakat_type,
            assets_total_uzs=assets_total,
            liabilities_uzs=request.liabilities_uzs,
            nisab_uzs=nisab_data["nisab_uzs"],
            gold_price_uzs=nisab_data["gold_price_uzs"],
            exchange_rate_uzs=nisab_data["exchange_rate_uzs"],
            zakat_due_uzs=zakat_uzs,
            zakat_due_usd=zakat_usd,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        record_id = record.id
    except Exception as e:
        db.rollback()

    return ZakatCalculateResponse(
        calculation_date=calc_date,
        assets_total_uzs=assets_total,
        liabilities_uzs=request.liabilities_uzs,
        net_assets_uzs=net_assets,
        nisab_uzs=nisab_data["nisab_uzs"],
        gold_price_uzs=nisab_data["gold_price_uzs"],
        exchange_rate_uzs=nisab_data["exchange_rate_uzs"],
        zakat_due_uzs=zakat_uzs,
        zakat_due_usd=zakat_usd,
        is_zakat_due=is_due,
        explanation=explanation,
        record_id=record_id,
    )


def get_zakat_history(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 20,
) -> List[ZakatHistoryItem]:
    try:
        from app.db.models.islamic_stage1 import ZakatCalculationV2
        rows = (
            db.query(ZakatCalculationV2)
            .filter(ZakatCalculationV2.user_id == user_id)
            .order_by(ZakatCalculationV2.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            ZakatHistoryItem(
                id=r.id,
                calculation_date=r.calculation_date,
                zakat_type=r.zakat_type,
                assets_total_uzs=r.assets_total_uzs,
                zakat_due_uzs=r.zakat_due_uzs,
                zakat_due_usd=r.zakat_due_usd,
                is_zakat_due=r.zakat_due_uzs > 0,
                created_at=r.created_at,
            )
            for r in rows
        ]
    except Exception:
        return []
