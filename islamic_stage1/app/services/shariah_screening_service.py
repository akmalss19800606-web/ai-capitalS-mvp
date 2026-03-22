"""
Shariah Screening Service — скрининг компаний по AAOIFI SS No. 62.
Scoring 0–5:
  - Начинаем с 5.0
  - haram_revenue_pct > 5%  → -2.0 (critical)
  - debt_ratio > 33%        → -1.0 (major)
  - interest_income_pct > 5% → -1.5 (major)
"""
import uuid
from decimal import Decimal
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session

from app.schemas.islamic_stage1 import (
    ShariahScreenRequest,
    ShariahScreenResponse,
    CompanyListItem,
)

BASE_SCORE = Decimal("5.0")
THRESHOLDS = {
    "haram_revenue_pct": {"limit": Decimal("5.0"), "penalty": Decimal("2.0"), "label": "Выручка от харам-деятельности"},
    "debt_ratio": {"limit": Decimal("33.0"), "penalty": Decimal("1.0"), "label": "Долговая нагрузка"},
    "interest_income_pct": {"limit": Decimal("5.0"), "penalty": Decimal("1.5"), "label": "Процентный доход"},
}


def _compute_score(
    haram_revenue_pct: Optional[Decimal],
    debt_ratio: Optional[Decimal],
    interest_income_pct: Optional[Decimal],
) -> tuple[Decimal, dict, str]:
    score = BASE_SCORE
    violations = {}

    checks = {
        "haram_revenue_pct": haram_revenue_pct,
        "debt_ratio": debt_ratio,
        "interest_income_pct": interest_income_pct,
    }

    for key, value in checks.items():
        if value is None:
            continue
        cfg = THRESHOLDS[key]
        if value > cfg["limit"]:
            score -= cfg["penalty"]
            violations[key] = {
                "value": float(value),
                "threshold": float(cfg["limit"]),
                "label": cfg["label"],
            }

    score = max(Decimal("0"), score)

    if score >= Decimal("4.0"):
        status = "compliant"
        recommendation = "Компания соответствует стандартам AAOIFI SS No. 62. Инвестирование допустимо."
    elif score >= Decimal("2.5"):
        status = "questionable"
        recommendation = "Компания частично не соответствует стандартам. Рекомендуется консультация с ШСС."
    else:
        status = "noncompliant"
        recommendation = "Компания не соответствует стандартам AAOIFI. Инвестирование не рекомендуется."

    return score, violations, status, recommendation


def screen_company(
    db: Session,
    user_id: uuid.UUID,
    request: ShariahScreenRequest,
) -> ShariahScreenResponse:
    from app.db.models.islamic_stage1 import ShariahScreeningCompany, ShariahScreeningResult

    company_name = request.company_name or "Неизвестная компания"
    company_id = request.company_id

    if company_id:
        company = db.query(ShariahScreeningCompany).filter(
            ShariahScreeningCompany.id == company_id
        ).first()
        if company:
            company_name = company.name_ru

    score, violations, status, recommendation = _compute_score(
        request.haram_revenue_pct,
        request.debt_ratio,
        request.interest_income_pct,
    )

    result = ShariahScreeningResult(
        company_id=company_id,
        requested_by=user_id,
        analysis_date=date.today(),
        score=score,
        status=status,
        haram_revenue_pct=request.haram_revenue_pct,
        debt_ratio=request.debt_ratio,
        interest_income_pct=request.interest_income_pct,
        violations=violations if violations else None,
        standard_applied="AAOIFI SS No. 62",
        mode=request.mode,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return ShariahScreenResponse(
        id=result.id,
        company_name=company_name,
        score=score,
        status=status,
        violations=violations if violations else None,
        standard_applied="AAOIFI SS No. 62",
        analysis_date=date.today(),
        recommendation=recommendation,
        haram_revenue_pct=request.haram_revenue_pct,
        debt_ratio=request.debt_ratio,
        interest_income_pct=request.interest_income_pct,
    )


def get_companies(
    db: Session,
    search: Optional[str] = None,
    market_type: Optional[str] = None,
) -> List[CompanyListItem]:
    from app.db.models.islamic_stage1 import ShariahScreeningCompany
    query = db.query(ShariahScreeningCompany).filter(ShariahScreeningCompany.is_active == True)

    if market_type:
        query = query.filter(ShariahScreeningCompany.market_type == market_type)
    if search:
        like = f"%{search}%"
        query = query.filter(
            ShariahScreeningCompany.name_ru.ilike(like) |
            ShariahScreeningCompany.ticker.ilike(like) |
            ShariahScreeningCompany.name_en.ilike(like)
        )

    rows = query.order_by(ShariahScreeningCompany.name_ru).limit(100).all()
    return [CompanyListItem.model_validate(r) for r in rows]


def get_screening_results(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 20,
) -> List[ShariahScreenResponse]:
    from app.db.models.islamic_stage1 import ShariahScreeningResult, ShariahScreeningCompany
    rows = (
        db.query(ShariahScreeningResult)
        .filter(ShariahScreeningResult.requested_by == user_id)
        .order_by(ShariahScreeningResult.created_at.desc())
        .limit(limit)
        .all()
    )
    results = []
    for r in rows:
        company_name = "Неизвестная компания"
        if r.company_id:
            company = db.query(ShariahScreeningCompany).filter(
                ShariahScreeningCompany.id == r.company_id
            ).first()
            if company:
                company_name = company.name_ru

        _, _, _, recommendation = _compute_score(
            r.haram_revenue_pct, r.debt_ratio, r.interest_income_pct
        )
        results.append(ShariahScreenResponse(
            id=r.id,
            company_name=company_name,
            score=r.score,
            status=r.status,
            violations=r.violations,
            standard_applied=r.standard_applied,
            analysis_date=r.analysis_date,
            recommendation=recommendation,
            haram_revenue_pct=r.haram_revenue_pct,
            debt_ratio=r.debt_ratio,
            interest_income_pct=r.interest_income_pct,
        ))
    return results
