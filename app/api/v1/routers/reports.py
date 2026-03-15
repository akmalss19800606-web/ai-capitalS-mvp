"""
Роутер: Генератор отчётов.
Фаза 2, Сессия 4.

Эндпоинты:
  GET  /reports/templates           — список шаблонов
  POST /reports/generate            — генерация отчёта
  GET  /reports/history             — история отчётов (пользователя)
  GET  /reports/history/{id}        — получить конкретный отчёт
  DELETE /reports/history/{id}      — удалить отчёт
  POST /reports/portfolio-summary   — быстрый «Отчёт по портфелю»
  POST /reports/decision-memo       — быстрый «Аналитическая записка»
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.db.models.reports import ReportTemplate, ReportInstance
from app.schemas.reports import (
    ReportGenerateRequest,
    ReportTemplateResponse,
    ReportInstanceResponse,
)
from app.services.report_service import REPORT_TEMPLATES, generate_report
from app.api.v1.routers.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


# ═══════════════════════════════════════════════════════════════
# SEED TEMPLATES — вызывается при первом обращении
# ═══════════════════════════════════════════════════════════════

def _ensure_templates(db: Session):
    """Создаёт шаблоны в БД, если их ещё нет."""
    existing = db.query(ReportTemplate).count()
    if existing >= len(REPORT_TEMPLATES):
        return
    for key, tpl in REPORT_TEMPLATES.items():
        exists = db.query(ReportTemplate).filter(ReportTemplate.template_key == key).first()
        if not exists:
            db.add(ReportTemplate(
                name=tpl["name"],
                template_key=key,
                description=tpl["description"],
                sections=tpl["sections"],
                available_metrics=tpl.get("available_metrics"),
                is_system=True,
            ))
    db.commit()


# ═══════════════════════════════════════════════════════════════
# ШАБЛОНЫ
# ═══════════════════════════════════════════════════════════════

@router.get("/templates", response_model=List[ReportTemplateResponse])
def list_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _ensure_templates(db)
    return db.query(ReportTemplate).order_by(ReportTemplate.id).all()


# ═══════════════════════════════════════════════════════════════
# ГЕНЕРАЦИЯ
# ═══════════════════════════════════════════════════════════════

def _collect_context(db: Session, user_id: int, req: ReportGenerateRequest):
    """Собирает контекстные данные из БД для генерации отчёта."""
    from app.db.models.portfolio import Portfolio
    from app.db.models.investment_decision import InvestmentDecision

    portfolio_data = None
    decision_data = None
    decisions_list = None

    if req.portfolio_id:
        port = db.query(Portfolio).filter(
            Portfolio.id == req.portfolio_id,
            Portfolio.user_id == user_id,
        ).first()
        if port:
            portfolio_data = {
                "id": port.id,
                "name": port.name,
                "description": port.description,
                "total_value": float(port.total_value or 0),
            }
            decs = db.query(InvestmentDecision).filter(
                InvestmentDecision.portfolio_id == port.id,
            ).all()
            decisions_list = [
                {
                    "title": d.title,
                    "amount": float(d.amount or 0),
                    "status": d.status,
                    "category": d.category,
                    "description": d.description,
                }
                for d in decs
            ]

    if req.decision_id:
        dec = db.query(InvestmentDecision).filter(
            InvestmentDecision.id == req.decision_id,
        ).first()
        if dec:
            decision_data = {
                "id": dec.id,
                "title": dec.title,
                "amount": float(dec.amount or 0),
                "status": dec.status,
                "category": dec.category,
                "description": dec.description,
            }

    return portfolio_data, decision_data, decisions_list


@router.post("/generate", response_model=ReportInstanceResponse)
def generate_report_endpoint(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if req.template_key not in REPORT_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Шаблон '{req.template_key}' не найден")

    portfolio_data, decision_data, decisions_list = _collect_context(db, user.id, req)

    result = generate_report(
        template_key=req.template_key,
        title=req.title,
        portfolio_data=portfolio_data,
        decision_data=decision_data,
        decisions_list=decisions_list,
        selected_sections=req.selected_sections,
        selected_metrics=req.selected_metrics,
        period_label=req.period_label,
    )

    instance = ReportInstance(
        user_id=user.id,
        template_key=req.template_key,
        title=result["title"],
        portfolio_id=req.portfolio_id,
        decision_id=req.decision_id,
        selected_sections=req.selected_sections,
        selected_metrics=req.selected_metrics,
        content=result["content"],
        executive_summary=result["executive_summary"],
        meta=result["meta"],
        status="completed",
    )
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


# ═══════════════════════════════════════════════════════════════
# ИСТОРИЯ
# ═══════════════════════════════════════════════════════════════

@router.get("/history", response_model=List[ReportInstanceResponse])
def list_report_history(
    template_key: Optional[str] = Query(None),
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(ReportInstance).filter(ReportInstance.user_id == user.id)
    if template_key:
        q = q.filter(ReportInstance.template_key == template_key)
    if portfolio_id:
        q = q.filter(ReportInstance.portfolio_id == portfolio_id)
    return q.order_by(ReportInstance.created_at.desc()).limit(50).all()


@router.get("/history/{report_id}", response_model=ReportInstanceResponse)
def get_report_instance(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    instance = db.query(ReportInstance).filter(
        ReportInstance.id == report_id,
        ReportInstance.user_id == user.id,
    ).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Отчёт не найден")
    return instance


@router.delete("/history/{report_id}")
def delete_report_instance(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    instance = db.query(ReportInstance).filter(
        ReportInstance.id == report_id,
        ReportInstance.user_id == user.id,
    ).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Отчёт не найден")
    db.delete(instance)
    db.commit()
    return {"detail": "Отчёт удалён"}


# ═══════════════════════════════════════════════════════════════
# БЫСТРЫЕ ШОРТКАТЫ
# ═══════════════════════════════════════════════════════════════

@router.post("/portfolio-summary", response_model=ReportInstanceResponse)
def portfolio_summary_shortcut(
    portfolio_id: int = Query(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Быстрая генерация «Отчёт по портфелю» со всеми разделами."""
    req = ReportGenerateRequest(
        template_key="portfolio_report",
        portfolio_id=portfolio_id,
    )
    return generate_report_endpoint(req, db, user)


@router.post("/decision-memo", response_model=ReportInstanceResponse)
def decision_memo_shortcut(
    decision_id: int = Query(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Быстрая генерация «Аналитическая записка» для решения."""
    req = ReportGenerateRequest(
        template_key="analytical_note",
        decision_id=decision_id,
    )
    return generate_report_endpoint(req, db, user)


# — Tasks 51-65: OLAP-powered report endpoints (appended) ————
from fastapi.responses import StreamingResponse
import io as _io
try:
    from app.services.olap_report_service import (
        generate_portfolio_report as _gen_report,
        export_decisions_csv as _export_csv,
        generate_ai_insights as _gen_insights,
        generate_trend_analysis as _gen_trends,
    )
    _olap_service_available = True
except ImportError:
    _olap_service_available = False


@router.get("/olap/portfolio")
def olap_portfolio_report(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 51-53: OLAP portfolio analytics report."""
    if not _olap_service_available:
        return {"error": "OLAP report service not available"}
    return _gen_report(db, portfolio_id)


@router.get("/olap/insights")
def olap_insights(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 54-57: AI-driven portfolio insights."""
    if not _olap_service_available:
        return {"error": "OLAP report service not available"}
    return _gen_insights(db, portfolio_id)


@router.get("/olap/trends")
def olap_trends(
    months: int = Query(12),
    db: Session = Depends(get_db),
):
    """Task 58-60: Investment trend analysis."""
    if not _olap_service_available:
        return {"error": "OLAP report service not available"}
    return _gen_trends(db, months)


@router.get("/olap/export/csv")
def olap_export_csv(
    portfolio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Task 61-65: Export decisions as CSV."""
    if not _olap_service_available:
        return {"error": "OLAP report service not available"}
    csv_data = _export_csv(db, portfolio_id)
    fname = f"decisions_portfolio_{portfolio_id or 'all'}.csv"
    return StreamingResponse(
        _io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )
