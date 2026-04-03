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
            # E3-02: Расширенные поля
            director_name=req.director_name,
            legal_form=req.legal_form,
            authorized_capital=req.authorized_capital,
            founded_year=req.founded_year,
            licenses_info=req.licenses_info,
            servicing_bank=req.servicing_bank,
            key_counterparties=req.key_counterparties,
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
            # E3-02: Расширенные поля
            director_name=result.get("director_name"),
            legal_form=result.get("legal_form"),
            authorized_capital=result.get("authorized_capital"),
            founded_year=result.get("founded_year"),
            licenses_info=result.get("licenses_info"),
            servicing_bank=result.get("servicing_bank"),
            key_counterparties=result.get("key_counterparties"),
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

# ===============================================================
# DELETE / EXPORT / COMPARE / RED-FLAGS
# ===============================================================

@router.delete("/scoring/{score_id}")
def delete_dd_scoring(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a DD scoring result."""
    dd = db.query(DueDiligenceScore).filter(
        DueDiligenceScore.id == score_id,
        DueDiligenceScore.user_id == current_user.id,
    ).first()
    if not dd:
        raise HTTPException(status_code=404, detail="DD-scoring not found")
    db.delete(dd)
    db.commit()
    return {"detail": "Deleted", "id": score_id}


@router.get("/scoring/{score_id}/export")
def export_dd_scoring(
    score_id: int,
    format: str = Query("pdf", regex="^(pdf|json|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export DD scoring result."""
    dd = db.query(DueDiligenceScore).filter(DueDiligenceScore.id == score_id).first()
    if not dd:
        raise HTTPException(status_code=404, detail="DD-scoring not found")
    export_data = {
        "id": dd.id,
        "company_name": dd.company_name,
        "industry": dd.industry,
        "geography": dd.geography,
        "total_score": dd.total_score,
        "risk_level": dd.risk_level,
        "financial_score": dd.financial_score,
        "legal_score": dd.legal_score,
        "operational_score": dd.operational_score,
        "market_score": dd.market_score,
        "management_score": dd.management_score,
        "esg_score": dd.esg_score,
        "red_flags": dd.red_flags,
        "recommendation": dd.recommendation,
        "checklist_completion_pct": dd.checklist_completion_pct,
        "created_at": str(dd.created_at) if dd.created_at else None,
        "format": format,
    }
    return export_data


@router.post("/scoring/compare")
def compare_dd_scorings(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare multiple DD scoring results."""
    ids = data.get("ids", [])
    if len(ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 IDs required")
    results = db.query(DueDiligenceScore).filter(
        DueDiligenceScore.id.in_(ids),
    ).all()
    if len(results) < 2:
        raise HTTPException(status_code=404, detail="Not enough results found")
    comparison = []
    for dd in results:
        comparison.append({
            "id": dd.id,
            "company_name": dd.company_name,
            "total_score": dd.total_score,
            "risk_level": dd.risk_level,
            "financial_score": dd.financial_score,
            "legal_score": dd.legal_score,
            "operational_score": dd.operational_score,
            "market_score": dd.market_score,
            "management_score": dd.management_score,
            "esg_score": dd.esg_score,
        })
    return {"comparison": comparison, "count": len(comparison)}


@router.get("/scoring/{score_id}/red-flags")
def get_dd_red_flags(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get red flags for a DD scoring."""
    dd = db.query(DueDiligenceScore).filter(DueDiligenceScore.id == score_id).first()
    if not dd:
        raise HTTPException(status_code=404, detail="DD-scoring not found")
    return {
        "id": dd.id,
        "company_name": dd.company_name,
        "red_flags": dd.red_flags or [],
        "risk_level": dd.risk_level,
        "total_flags": len(dd.red_flags or []),
    }

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
