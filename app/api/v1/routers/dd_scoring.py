"""
Роутер: Due Diligence Scoring.
Фаза 2, Сессия 3.

Эндпоинты:
  POST /dd/scoring                — запуск DD-скоринга
  GET  /dd/scoring/{id}          — получить результат по ID
  GET  /dd/scoring               — история скорингов
  PATCH /dd/scoring/{id}/checklist — обновить пункт чеклиста
  GET  /dd/benchmarks/templates  — шаблоны бенчмарков по отраслям
"""
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

logger = logging.getLogger(__name__)

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.dd_scoring import DueDiligenceScore
from app.schemas.dd_scoring import (
    DDScoringRequest, DDScoringResponse, ChecklistUpdateRequest,
)
from app.services.dd_scoring_service import (
    run_dd_scoring,
    INDUSTRY_BENCHMARKS, DEFAULT_BENCHMARK,
    DD_CHECKLIST_TEMPLATE,
)

router = APIRouter(prefix="/dd", tags=["due-diligence"])


# ═══════════════════════════════════════════════════════════════
# DD-СКОРИНГ
# ═══════════════════════════════════════════════════════════════

@router.post("/scoring", response_model=DDScoringResponse)
def create_dd_scoring(
    req: DDScoringRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запуск DD-скоринга компании."""
    try:
        # Проверяем decision_id если указан
        if req.decision_id:
            dec = db.query(InvestmentDecision).filter(
                InvestmentDecision.id == req.decision_id,
            ).first()
            if not dec:
                raise HTTPException(status_code=404, detail="Решение не найдено")

        logger.info(f"DD Scoring: company={req.company_name}, industry={req.industry}, geo={req.geography}")

        result = run_dd_scoring(
            company_name=req.company_name,
            industry=req.industry,
            geography=req.geography,
            revenue_mln=req.revenue_mln,
            profit_margin_pct=req.profit_margin_pct,
            debt_to_equity=req.debt_to_equity,
            years_in_business=req.years_in_business,
            employee_count=req.employee_count,
        )

        dd = DueDiligenceScore(
            decision_id=req.decision_id,
            user_id=current_user.id,
            company_name=result["company_name"],
            industry=result["industry"],
            geography=result["geography"],
            total_score=result["total_score"],
            risk_level=result["risk_level"],
            financial_score=result["financial_score"],
            legal_score=result["legal_score"],
            operational_score=result["operational_score"],
            market_score=result["market_score"],
            management_score=result["management_score"],
            esg_score=result["esg_score"],
            category_details=result["category_details"],
            checklist=result["checklist"],
            checklist_completion_pct=result["checklist_completion_pct"],
            benchmarks=result["benchmarks"],
            red_flags=result["red_flags"],
            recommendation=result["recommendation"],
        )
        db.add(dd)
        db.commit()
        db.refresh(dd)
        return dd

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DD Scoring error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка DD-скоринга: {str(e)}")


@router.get("/scoring/{score_id}", response_model=DDScoringResponse)
def get_dd_scoring(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить результат DD-скоринга."""
    dd = db.query(DueDiligenceScore).filter(DueDiligenceScore.id == score_id).first()
    if not dd:
        raise HTTPException(status_code=404, detail="DD-скоринг не найден")
    return dd


@router.get("/scoring", response_model=List[DDScoringResponse])
def list_dd_scorings(
    decision_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История DD-скорингов."""
    q = db.query(DueDiligenceScore).filter(DueDiligenceScore.user_id == current_user.id)
    if decision_id:
        q = q.filter(DueDiligenceScore.decision_id == decision_id)
    q = q.order_by(DueDiligenceScore.created_at.desc())
    return q.offset((page - 1) * per_page).limit(per_page).all()


@router.patch("/scoring/{score_id}/checklist", response_model=DDScoringResponse)
def update_checklist_item(
    score_id: int,
    req: ChecklistUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить статус пункта чеклиста."""
    dd = db.query(DueDiligenceScore).filter(DueDiligenceScore.id == score_id).first()
    if not dd:
        raise HTTPException(status_code=404, detail="DD-скоринг не найден")

    checklist = list(dd.checklist or [])
    found = False
    for item in checklist:
        if item.get("id") == req.item_id:
            item["status"] = req.status
            if req.note is not None:
                item["note"] = req.note
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Пункт чеклиста '{req.item_id}' не найден")

    # Пересчёт completion
    completed = sum(1 for c in checklist if c["status"] in ("passed", "failed", "na"))
    pct = round(completed / len(checklist) * 100, 1) if checklist else 0

    dd.checklist = checklist
    dd.checklist_completion_pct = pct
    db.commit()
    db.refresh(dd)
    return dd


# ═══════════════════════════════════════════════════════════════
# БЕНЧМАРКИ — ШАБЛОНЫ
# ═══════════════════════════════════════════════════════════════

@router.get("/benchmarks/templates")
def get_benchmark_templates(
    current_user: User = Depends(get_current_user),
):
    """Список отраслевых бенчмарков-шаблонов."""
    templates = []
    for industry, scores in INDUSTRY_BENCHMARKS.items():
        avg = round(sum(scores.values()) / len(scores), 1)
        templates.append({
            "industry": industry,
            "avg_score": avg,
            "financial": scores["financial"],
            "legal": scores["legal"],
            "operational": scores["operational"],
            "market": scores["market"],
            "management": scores["management"],
            "esg": scores["esg"],
        })
    templates.sort(key=lambda x: x["avg_score"], reverse=True)
    return templates
