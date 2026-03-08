"""
Роутер: Стресс-тестирование и Ретроспективный анализ.
Фаза 2, Сессия 2.

Эндпоинты:
  POST /analytics/stress-test          — запуск стресс-теста
  GET  /analytics/stress-test/{id}     — получить результат
  GET  /analytics/stress-test          — история
  GET  /analytics/stress-scenarios     — список сценариев
  POST /analytics/retrospective        — запуск ретроспективы
  GET  /analytics/retrospective/{id}   — получить результат
  GET  /analytics/retrospective        — история
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
from app.db.models.portfolio import Portfolio
from app.db.models.stress_retrospective import StressTest, Retrospective
from app.schemas.stress_retrospective import (
    StressTestRequest, StressTestResponse,
    RetrospectiveRequest, RetrospectiveResponse,
)
from app.services.stress_retrospective_service import (
    run_stress_test,
    run_retrospective,
    STRESS_SCENARIOS,
)

router = APIRouter(prefix="/analytics", tags=["stress-retrospective"])


# ═══════════════════════════════════════════════════════════════
# СТРЕСС-ТЕСТИРОВАНИЕ
# ═══════════════════════════════════════════════════════════════

@router.get("/stress-scenarios")
def list_scenarios(
    current_user: User = Depends(get_current_user),
):
    """Список доступных стресс-сценариев."""
    result = []
    for key, s in STRESS_SCENARIOS.items():
        result.append({
            "key": key,
            "name": s["name"],
            "description": s["description"],
            "factors_count": len(s["shocks"]),
            "recovery_months": s.get("recovery_months", 24),
        })
    result.append({
        "key": "custom",
        "name": "Пользовательский сценарий",
        "description": "Задайте собственные параметры шока.",
        "factors_count": 0,
        "recovery_months": 24,
    })
    return result


@router.post("/stress-test", response_model=StressTestResponse)
def create_stress_test(
    req: StressTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запуск стресс-теста портфеля."""
    try:
        portfolio = db.query(Portfolio).filter(
            Portfolio.id == req.portfolio_id
        ).first()
        if not portfolio:
            raise HTTPException(status_code=404, detail="Портфель не найден")

        # Собираем активы из решений портфеля
        decisions = db.query(InvestmentDecision).filter(
            InvestmentDecision.portfolio_id == req.portfolio_id,
        ).all()

        logger.info(f"StressTest: portfolio_id={req.portfolio_id}, decisions={len(decisions)}, scenario={req.scenario}")

        assets = []
        for d in decisions:
            assets.append({
                "name": d.title or f"Решение #{d.id}",
                "value": float(d.amount or 0),
                "sector": d.sector if hasattr(d, "sector") and d.sector else "Прочее",
                "geography": d.geography if hasattr(d, "geography") and d.geography else "Узбекистан",
            })

        # Custom shocks
        custom_shocks = None
        if req.custom_shocks:
            custom_shocks = [s.model_dump() for s in req.custom_shocks]

        result = run_stress_test(
            assets=assets,
            scenario=req.scenario,
            severity=req.severity,
            custom_shocks=custom_shocks,
        )

        st = StressTest(
            portfolio_id=req.portfolio_id,
            user_id=current_user.id,
            scenario_name=result["scenario_name"],
            scenario_description=result["scenario_description"],
            shock_parameters=result["shock_parameters"],
            asset_impacts=result["asset_impacts"],
            portfolio_value_before=result["portfolio_value_before"],
            portfolio_value_after=result["portfolio_value_after"],
            total_loss_pct=result["total_loss_pct"],
            max_single_asset_loss_pct=result["max_single_asset_loss_pct"],
            recovery_time_months=result["recovery_time_months"],
            concentration_risks=result["concentration_risks"],
        )
        db.add(st)
        db.commit()
        db.refresh(st)
        return st

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"StressTest error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка стресс-теста: {str(e)}")


@router.get("/stress-test/{test_id}", response_model=StressTestResponse)
def get_stress_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить результат стресс-теста."""
    st = db.query(StressTest).filter(StressTest.id == test_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Стресс-тест не найден")
    return st


@router.get("/stress-test", response_model=List[StressTestResponse])
def list_stress_tests(
    portfolio_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История стресс-тестов."""
    q = db.query(StressTest).filter(StressTest.user_id == current_user.id)
    if portfolio_id:
        q = q.filter(StressTest.portfolio_id == portfolio_id)
    q = q.order_by(StressTest.created_at.desc())
    return q.offset((page - 1) * per_page).limit(per_page).all()


# ═══════════════════════════════════════════════════════════════
# РЕТРОСПЕКТИВНЫЙ АНАЛИЗ
# ═══════════════════════════════════════════════════════════════

@router.post("/retrospective", response_model=RetrospectiveResponse)
def create_retrospective(
    req: RetrospectiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запуск ретроспективного анализа."""
    try:
        # Валидация
        if req.analysis_type == "decision" and req.decision_id:
            dec = db.query(InvestmentDecision).filter(
                InvestmentDecision.id == req.decision_id
            ).first()
            if not dec:
                raise HTTPException(status_code=404, detail="Решение не найдено")
        elif req.analysis_type == "portfolio" and req.portfolio_id:
            port = db.query(Portfolio).filter(
                Portfolio.id == req.portfolio_id
            ).first()
            if not port:
                raise HTTPException(status_code=404, detail="Портфель не найден")

        logger.info(f"Retrospective: type={req.analysis_type}, forecast={req.forecast_return}, actual={req.actual_return}")

        result = run_retrospective(
            forecast_return=req.forecast_return,
            actual_return=req.actual_return,
            analysis_type=req.analysis_type,
        )

        retro = Retrospective(
            decision_id=req.decision_id,
            portfolio_id=req.portfolio_id,
            user_id=current_user.id,
            analysis_type=req.analysis_type,
            forecast_return=result["forecast_return"],
            actual_return=result["actual_return"],
            variance=result["variance"],
            variance_pct=result["variance_pct"],
            mae=result["mae"],
            mape=result["mape"],
            rmse=result["rmse"],
            accuracy_score=result["accuracy_score"],
            variance_factors=result["variance_factors"],
            benchmarks=result["benchmarks"],
            cognitive_biases=result["cognitive_biases"],
            lessons=result["lessons"],
        )
        db.add(retro)
        db.commit()
        db.refresh(retro)
        return retro

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Retrospective error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка ретроспективы: {str(e)}")


@router.get("/retrospective/{retro_id}", response_model=RetrospectiveResponse)
def get_retrospective(
    retro_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить результат ретроспективы."""
    r = db.query(Retrospective).filter(Retrospective.id == retro_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Ретроспектива не найдена")
    return r


@router.get("/retrospective", response_model=List[RetrospectiveResponse])
def list_retrospectives(
    decision_id: Optional[int] = Query(None),
    portfolio_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История ретроспективных анализов."""
    q = db.query(Retrospective).filter(Retrospective.user_id == current_user.id)
    if decision_id:
        q = q.filter(Retrospective.decision_id == decision_id)
    if portfolio_id:
        q = q.filter(Retrospective.portfolio_id == portfolio_id)
    q = q.order_by(Retrospective.created_at.desc())
    return q.offset((page - 1) * per_page).limit(per_page).all()
