"""
Роутер: Стресс-тестирование и Ретроспективный анализ.
Фаза 2, Сессия 2.

Эндпоинты:
  POST /analytics/stress-test          — запуск стресс-теста
  POST /analytics/stress-test/run/dual — двойной НСБУ+МСФО стресс-тест
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
from app.db.models.ifrs import FinancialStatement
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


@router.post("/stress-test")
def create_stress_test(
    req: StressTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запуск стресс-теста портфеля."""
    try:
        # Resolve portfolio: use provided id or fall back to first available
        portfolio_id = req.portfolio_id
        portfolio = None
        if portfolio_id is not None:
            try:
                portfolio = db.query(Portfolio).filter(
                    Portfolio.id == portfolio_id
                ).first()
            except Exception:
                pass
        if not portfolio:
            try:
                portfolio = db.query(Portfolio).order_by(Portfolio.id).first()
            except Exception:
                pass

        # Build assets from DB decisions or fallback to cached balance data
        assets = []
        actual_portfolio_id = portfolio.id if portfolio else 0

        if portfolio:
            try:
                decisions = db.query(InvestmentDecision).filter(
                    InvestmentDecision.portfolio_id == actual_portfolio_id,
                ).all()
                for d in decisions:
                    assets.append({
                        "name": d.asset_name or f"Решение #{d.id}",
                        "value": float(d.amount or 0),
                        "sector": d.category.value if hasattr(d, "category") and d.category else "Прочее",
                        "geography": d.geography if hasattr(d, "geography") and d.geography else "Узбекистан",
                    })
            except Exception as exc:
                logger.warning(f"StressTest: failed to load decisions: {exc}")

        # Fallback: use cached balance data to create synthetic assets
        if not assets:
            from app.api.v1.routers.analytics_chapter import _get_balance_aggregates
            agg = _get_balance_aggregates(user_id=current_user.id)
            if agg and agg["total_assets"] > 0:
                assets = [
                    {"name": "Основные средства", "value": agg["non_current_assets"], "sector": "Активы", "geography": "Узбекистан"},
                    {"name": "Запасы", "value": agg["inventories"], "sector": "Оборотные", "geography": "Узбекистан"},
                    {"name": "Дебиторская задолженность", "value": agg["receivables"], "sector": "Оборотные", "geography": "Узбекистан"},
                    {"name": "Денежные средства", "value": agg["cash"], "sector": "Денежные", "geography": "Узбекистан"},
                ]
                assets = [a for a in assets if a["value"] > 0]

        if not assets:
            # Return empty result instead of crashing
            assets = [{"name": "Портфель", "value": 1000000, "sector": "Прочее", "geography": "Узбекистан"}]

        logger.info(f"StressTest: portfolio_id={actual_portfolio_id}, assets={len(assets)}, scenario={req.scenario}")

        # Custom shocks
        custom_shocks = None
        if req.custom_shocks:
            custom_shocks = [s.model_dump() for s in req.custom_shocks]

        result = run_stress_test(
            assets=assets,
            scenario=req.scenario,
            severity=float(req.severity),
            custom_shocks=custom_shocks,
        )

        # Try to save to DB, but don't fail if it can't
        try:
            st = StressTest(
                portfolio_id=actual_portfolio_id or 1,
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
        except Exception as exc:
            logger.warning(f"StressTest: failed to save to DB: {exc}")
            try:
                db.rollback()
            except Exception:
                pass
            # Return result without DB record
            result["id"] = 0
            result["portfolio_id"] = actual_portfolio_id or 0
            result["created_at"] = __import__("datetime").datetime.now().isoformat()
            return result

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
# ДВОЙНОЙ СТРЕСС-ТЕСТ: НСБУ + МСФО
# ═══════════════════════════════════════════════════════════════

@router.post("/stress-test/run/dual")
def run_dual_stress_test(
    req: StressTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Запустить стресс-тест параллельно по НСБУ и МСФО.
    1. Запустить обычный стресс-тест (НСБУ данные)
    2. Если есть МСФО данные (financial_statements с standard='ifrs') — запустить по ним тоже
    3. Вернуть оба результата + сравнение
    """
    try:
        # Resolve portfolio: use provided id or fall back to first available
        portfolio_id = req.portfolio_id
        portfolio = None
        if portfolio_id is not None:
            try:
                portfolio = db.query(Portfolio).filter(
                    Portfolio.id == portfolio_id
                ).first()
            except Exception:
                pass
        if not portfolio:
            try:
                portfolio = db.query(Portfolio).order_by(Portfolio.id).first()
            except Exception:
                pass

        actual_portfolio_id = portfolio.id if portfolio else 0

        # ── НСБУ: собираем активы из решений портфеля ──
        nsbu_assets = []
        if portfolio:
            try:
                decisions = db.query(InvestmentDecision).filter(
                    InvestmentDecision.portfolio_id == actual_portfolio_id,
                ).all()
                for d in decisions:
                    nsbu_assets.append({
                        "name": d.asset_name or f"Решение #{d.id}",
                        "value": float(d.amount or 0),
                        "sector": d.category.value if hasattr(d, "category") and d.category else "Прочее",
                        "geography": d.geography if hasattr(d, "geography") and d.geography else "Узбекистан",
                    })
            except Exception as exc:
                logger.warning(f"DualStressTest: failed to load decisions: {exc}")

        # Fallback: use cached balance data
        if not nsbu_assets:
            from app.api.v1.routers.analytics_chapter import _get_balance_aggregates
            agg = _get_balance_aggregates(user_id=current_user.id)
            if agg and agg["total_assets"] > 0:
                nsbu_assets = [
                    {"name": "Основные средства", "value": agg["non_current_assets"], "sector": "Активы", "geography": "Узбекистан"},
                    {"name": "Запасы", "value": agg["inventories"], "sector": "Оборотные", "geography": "Узбекистан"},
                    {"name": "Дебиторская задолженность", "value": agg["receivables"], "sector": "Оборотные", "geography": "Узбекистан"},
                    {"name": "Денежные средства", "value": agg["cash"], "sector": "Денежные", "geography": "Узбекистан"},
                ]
                nsbu_assets = [a for a in nsbu_assets if a["value"] > 0]

        if not nsbu_assets:
            nsbu_assets = [{"name": "Портфель", "value": 1000000, "sector": "Прочее", "geography": "Узбекистан"}]

        custom_shocks = None
        if req.custom_shocks:
            custom_shocks = [s.model_dump() for s in req.custom_shocks]

        logger.info(f"DualStressTest: portfolio_id={actual_portfolio_id}, nsbu_assets={len(nsbu_assets)}, scenario={req.scenario}")

        # Запуск НСБУ стресс-теста
        nsbu_result = run_stress_test(
            assets=nsbu_assets,
            scenario=req.scenario,
            severity=float(req.severity),
            custom_shocks=custom_shocks,
        )

        # ── МСФО: ищем данные в financial_statements ──
        ifrs_stmt = None
        try:
            if actual_portfolio_id:
                ifrs_stmt = db.query(FinancialStatement).filter(
                    FinancialStatement.portfolio_id == actual_portfolio_id,
                    FinancialStatement.standard == "ifrs",
                ).order_by(FinancialStatement.created_at.desc()).first()
        except Exception:
            pass

        ifrs_available = ifrs_stmt is not None and ifrs_stmt.data is not None
        ifrs_result = None
        comparison = None

        if ifrs_available:
            # Построить активы из МСФО данных
            ifrs_data = ifrs_stmt.data or {}
            ifrs_assets = _build_ifrs_assets(ifrs_data, nsbu_assets)

            ifrs_result = run_stress_test(
                assets=ifrs_assets,
                scenario=req.scenario,
                severity=float(req.severity),
                custom_shocks=custom_shocks,
            )

            # Рассчитать сравнение
            comparison = {
                "loss_difference": round(
                    (ifrs_result["total_loss_pct"] or 0) - (nsbu_result["total_loss_pct"] or 0), 2
                ),
                "asset_impact_diff": round(
                    (ifrs_result["portfolio_value_after"] - ifrs_result["portfolio_value_before"])
                    - (nsbu_result["portfolio_value_after"] - nsbu_result["portfolio_value_before"]),
                    2,
                ),
                "equity_impact_diff": round(
                    (ifrs_result["total_loss_pct"] or 0) - (nsbu_result["total_loss_pct"] or 0), 2
                ),
                "recovery_diff": round(
                    (ifrs_result["recovery_time_months"] or 0) - (nsbu_result["recovery_time_months"] or 0), 1
                ),
                "ifrs_available": True,
            }

            logger.info(
                f"DualStressTest: NSBU loss={nsbu_result['total_loss_pct']}%, "
                f"IFRS loss={ifrs_result['total_loss_pct']}%"
            )
        else:
            comparison = {
                "loss_difference": 0,
                "asset_impact_diff": 0,
                "equity_impact_diff": 0,
                "recovery_diff": 0,
                "ifrs_available": False,
            }

        return {
            "nsbu": nsbu_result,
            "ifrs": ifrs_result,
            "comparison": comparison,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DualStressTest error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка двойного стресс-теста: {str(e)}")


def _build_ifrs_assets(
    ifrs_data: dict,
    nsbu_assets: list,
) -> list:
    """
    Построить список активов для МСФО стресс-теста.
    Берём НСБУ активы и корректируем их на основе МСФО данных
    (total_ifrs_assets / total_nsbu_assets ratio).
    """
    total_nsbu = float(ifrs_data.get("total_nsbu_assets", 0) or 0)
    total_ifrs = float(ifrs_data.get("total_ifrs_assets", 0) or 0)

    # Если есть корректировки — рассчитываем коэффициент МСФО/НСБУ
    if total_nsbu > 0 and total_ifrs > 0:
        ratio = total_ifrs / total_nsbu
    else:
        ratio = 1.0

    ifrs_assets = []
    for a in nsbu_assets:
        ifrs_assets.append({
            "name": f"{a['name']} (МСФО)",
            "value": round(float(a.get("value", 0)) * ratio, 2),
            "sector": a.get("sector", "Прочее"),
            "geography": a.get("geography", "Узбекистан"),
        })

    return ifrs_assets


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
