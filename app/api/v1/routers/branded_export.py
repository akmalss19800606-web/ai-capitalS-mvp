"""
Роутер брендированного экспорта PDF.

Эндпоинты:
  POST /api/v1/export/portfolio-pdf — PDF сводка по портфелю
  POST /api/v1/export/dd-report-pdf — PDF Due Diligence заключение
  POST /api/v1/export/decision-pdf — PDF меморандум решения
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.services.branded_pdf_service import (
    generate_portfolio_summary_pdf,
    generate_dd_report_pdf,
    generate_decision_memo_pdf,
)

router = APIRouter(prefix="/export", tags=["export"])


# ─── Схемы ───────────────────────────────────────────────────────────

class PortfolioPdfRequest(BaseModel):
    portfolio_id: int
    include_ai_recommendation: bool = True

class DdReportPdfRequest(BaseModel):
    company_name: str
    inn: str = ""
    scores: dict = {}
    red_flags: list = []
    ai_analysis: str = ""

class DecisionPdfRequest(BaseModel):
    decision_id: int
    include_history: bool = True


# ─── Эндпоинты ───────────────────────────────────────────────────────

@router.post("/portfolio-pdf")
async def export_portfolio_pdf(
    data: PortfolioPdfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Экспорт PDF сводки по портфелю."""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == data.portfolio_id,
        Portfolio.user_id == current_user.id,
    ).first()
    if not portfolio:
        raise HTTPException(404, "Портфель не найден")

    # Собираем данные портфеля
    assets = []
    total_value = 0
    if hasattr(portfolio, "assets") and portfolio.assets:
        for asset in portfolio.assets:
            val = getattr(asset, "current_value", 0) or 0
            total_value += val
            assets.append({
                "name": getattr(asset, "name", "—"),
                "symbol": getattr(asset, "symbol", "—"),
                "quantity": getattr(asset, "quantity", 0),
                "price": getattr(asset, "price", 0),
                "value": f"{val:,.0f}",
                "weight": "",
            })

    # AI-рекомендация
    ai_rec = ""
    if data.include_ai_recommendation:
        try:
            from app.services.ai_service import get_investment_recommendation
            result = await get_investment_recommendation(
                portfolio.name, total_value,
            )
            ai_rec = result.get("result", "") if isinstance(result, dict) else str(result)
        except Exception:
            ai_rec = ""

    owner_name = getattr(current_user, "full_name", "") or current_user.email
    pdf_bytes = generate_portfolio_summary_pdf(
        portfolio_name=portfolio.name,
        total_value=f"{total_value:,.0f}",
        currency="UZS",
        assets=assets,
        ai_recommendation=ai_rec,
        owner_name=owner_name,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="portfolio_{portfolio.id}_summary.pdf"',
        },
    )


@router.post("/dd-report-pdf")
async def export_dd_report_pdf(
    data: DdReportPdfRequest,
    current_user: User = Depends(get_current_user),
):
    """Экспорт PDF Due Diligence заключения."""
    pdf_bytes = generate_dd_report_pdf(
        company_name=data.company_name,
        inn=data.inn,
        scores=data.scores,
        red_flags=data.red_flags,
        ai_analysis=data.ai_analysis,
    )

    safe_name = "".join(c for c in data.company_name if c.isascii() and (c.isalnum() or c in " _-")).strip().replace(" ", "_")[:30] or "company"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dd_report_{safe_name}.pdf"',
        },
    )


@router.post("/decision-pdf")
async def export_decision_pdf(
    data: DecisionPdfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Экспорт PDF меморандума решения."""
    from app.db.models.decision import Decision

    decision = db.query(Decision).filter(
        Decision.id == data.decision_id,
    ).first()
    if not decision:
        raise HTTPException(404, "Решение не найдено")

    # Проверяем доступ (владелец портфеля)
    portfolio_name = ""
    if hasattr(decision, "portfolio_id") and decision.portfolio_id:
        portfolio = db.query(Portfolio).filter(
            Portfolio.id == decision.portfolio_id,
        ).first()
        if portfolio:
            portfolio_name = portfolio.name

    # История
    history = []
    if data.include_history:
        try:
            from app.db.models.decision import DecisionVersion
            versions = db.query(DecisionVersion).filter(
                DecisionVersion.decision_id == decision.id,
            ).order_by(DecisionVersion.version_number).all()
            for v in versions:
                history.append({
                    "date": v.created_at.strftime("%d.%m.%Y %H:%M") if v.created_at else "",
                    "action": f"Версия {v.version_number}",
                    "by": getattr(v, "changed_by", ""),
                })
        except Exception:
            pass

    pdf_bytes = generate_decision_memo_pdf(
        decision_title=decision.title,
        status=decision.status,
        description=decision.description or "",
        portfolio_name=portfolio_name,
        history=history,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="decision_{decision.id}_memo.pdf"',
        },
    )
