"""
Роутер AI-аналитики: Monte Carlo, SHAP, Efficient Frontier.
Фаза 2, Сессия 1.

Эндпоинты:
  POST /analytics/monte-carlo      — запуск Monte Carlo симуляции
  GET  /analytics/monte-carlo/{id}  — получить результат
  GET  /analytics/monte-carlo/history — история запусков
  POST /analytics/shap              — запуск SHAP-анализа
  GET  /analytics/shap/{id}         — получить результат
  POST /analytics/frontier           — Efficient Frontier
  GET  /analytics/frontier/{id}      — получить результат
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.portfolio import Portfolio
from app.db.models.ai_analytics import (
    MonteCarloSimulation,
    ShapAnalysis,
    PortfolioOptimization,
)
from app.schemas.ai_analytics import (
    MonteCarloRequest, MonteCarloResponse,
    ShapRequest, ShapResponse,
    EfficientFrontierRequest, EfficientFrontierResponse,
)
from app.services.ai_analytics_service import (
    run_monte_carlo,
    run_shap_analysis,
    run_efficient_frontier,
)

router = APIRouter(prefix="/analytics", tags=["ai-analytics"])


# ═══════════════════════════════════════════════════════════════════════════
# MONTE CARLO
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/monte-carlo", response_model=MonteCarloResponse)
def create_monte_carlo(
    req: MonteCarloRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запуск Monte Carlo симуляции для инвестиционного решения."""
    # Проверяем решение
    decision = db.query(InvestmentDecision).filter(
        InvestmentDecision.id == req.decision_id
    ).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Решение не найдено")

    # Подготовка параметров
    params_list = None
    if req.parameters:
        params_list = [p.model_dump() for p in req.parameters]

    # Запуск симуляции
    result = run_monte_carlo(
        initial_investment=req.initial_investment,
        time_horizon_months=req.time_horizon_months,
        num_iterations=req.num_iterations,
        parameters=params_list,
    )

    # Сохраняем в БД
    sim = MonteCarloSimulation(
        decision_id=req.decision_id,
        user_id=current_user.id,
        num_iterations=req.num_iterations,
        time_horizon_months=req.time_horizon_months,
        initial_investment=req.initial_investment,
        input_parameters=params_list or [],
        percentile_5=result["percentile_5"],
        percentile_25=result["percentile_25"],
        percentile_50=result["percentile_50"],
        percentile_75=result["percentile_75"],
        percentile_95=result["percentile_95"],
        mean_return=result["mean_return"],
        std_return=result["std_return"],
        probability_of_loss=result["probability_of_loss"],
        max_drawdown=result["max_drawdown"],
        distribution_data=result["distribution_data"],
        sensitivity_data=result["sensitivity_data"],
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)

    return sim


@router.get("/monte-carlo/{sim_id}", response_model=MonteCarloResponse)
def get_monte_carlo(
    sim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить результат Monte Carlo симуляции."""
    sim = db.query(MonteCarloSimulation).filter(
        MonteCarloSimulation.id == sim_id
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Симуляция не найдена")
    return sim


@router.get("/monte-carlo", response_model=List[MonteCarloResponse])
def list_monte_carlo(
    decision_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список запусков Monte Carlo."""
    q = db.query(MonteCarloSimulation).filter(
        MonteCarloSimulation.user_id == current_user.id
    )
    if decision_id:
        q = q.filter(MonteCarloSimulation.decision_id == decision_id)
    q = q.order_by(MonteCarloSimulation.created_at.desc())
    return q.offset((page - 1) * per_page).limit(per_page).all()


# ═══════════════════════════════════════════════════════════════════════════
# SHAP
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/shap", response_model=ShapResponse)
def create_shap_analysis(
    req: ShapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Запуск SHAP-анализа для решения или портфеля."""
    decision_data = {}

    if req.decision_id:
        decision = db.query(InvestmentDecision).filter(
            InvestmentDecision.id == req.decision_id
        ).first()
        if not decision:
            raise HTTPException(status_code=404, detail="Решение не найдено")
        decision_data = {
            "amount": decision.amount,
            "priority": decision.priority,
            "status": decision.status,
            "category": decision.category,
            "decision_type": decision.decision_type,
        }
    elif req.portfolio_id:
        portfolio = db.query(Portfolio).filter(
            Portfolio.id == req.portfolio_id
        ).first()
        if not portfolio:
            raise HTTPException(status_code=404, detail="Портфель не найден")
        decision_data = {
            "amount": portfolio.total_value,
            "priority": "medium",
            "status": "active",
        }
    else:
        raise HTTPException(status_code=400, detail="Укажите decision_id или portfolio_id")

    # Запуск анализа
    result = run_shap_analysis(decision_data, req.analysis_type)

    # Сохраняем
    analysis = ShapAnalysis(
        decision_id=req.decision_id,
        portfolio_id=req.portfolio_id,
        user_id=current_user.id,
        analysis_type=req.analysis_type,
        predicted_value=result["predicted_value"],
        model_confidence=result["model_confidence"],
        base_value=result["base_value"],
        shap_values=result["shap_values"],
        feature_importance=result["feature_importance"],
        narrative_explanation=result["narrative_explanation"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return analysis


@router.get("/shap/{analysis_id}", response_model=ShapResponse)
def get_shap_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить результат SHAP-анализа."""
    analysis = db.query(ShapAnalysis).filter(
        ShapAnalysis.id == analysis_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Анализ не найден")
    return analysis


@router.get("/shap", response_model=List[ShapResponse])
def list_shap(
    decision_id: Optional[int] = Query(None),
    portfolio_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список SHAP-анализов."""
    q = db.query(ShapAnalysis).filter(ShapAnalysis.user_id == current_user.id)
    if decision_id:
        q = q.filter(ShapAnalysis.decision_id == decision_id)
    if portfolio_id:
        q = q.filter(ShapAnalysis.portfolio_id == portfolio_id)
    q = q.order_by(ShapAnalysis.created_at.desc())
    return q.offset((page - 1) * per_page).limit(per_page).all()


# ═══════════════════════════════════════════════════════════════════════════
# EFFICIENT FRONTIER
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/frontier", response_model=EfficientFrontierResponse)
def create_frontier(
    req: EfficientFrontierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Оптимизация портфеля — Efficient Frontier."""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == req.portfolio_id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Портфель не найден")

    # Собираем активы из решений портфеля
    decisions = db.query(InvestmentDecision).filter(
        InvestmentDecision.portfolio_id == req.portfolio_id,
        InvestmentDecision.status.in_(["approved", "active", "in_progress"]),
    ).all()

    assets = []
    total_amount = sum(float(d.amount or 0) for d in decisions) or 1

    for d in decisions:
        amt = float(d.amount or 0)
        assets.append({
            "name": d.title or f"Решение #{d.id}",
            "weight": amt / total_amount,
            "expected_return": 0.10 + (hash(d.title or "") % 20) / 100,  # 10-30%
            "volatility": 0.10 + (hash(str(d.id)) % 25) / 100,  # 10-35%
        })

    # Запуск оптимизации
    result = run_efficient_frontier(
        assets=assets,
        risk_free_rate=req.risk_free_rate,
        num_frontier_points=req.num_frontier_points,
        optimization_target=req.optimization_target,
    )

    # Сохраняем
    opt = PortfolioOptimization(
        portfolio_id=req.portfolio_id,
        user_id=current_user.id,
        risk_free_rate=req.risk_free_rate,
        optimization_target=req.optimization_target,
        current_allocation=result["current_allocation"],
        optimal_allocation=result["optimal_allocation"],
        current_return=result["current_return"],
        current_risk=result["current_risk"],
        current_sharpe=result["current_sharpe"],
        optimal_return=result["optimal_return"],
        optimal_risk=result["optimal_risk"],
        optimal_sharpe=result["optimal_sharpe"],
        frontier_points=result["frontier_points"],
        var_95=result["var_95"],
        cvar_95=result["cvar_95"],
    )
    db.add(opt)
    db.commit()
    db.refresh(opt)

    return opt


@router.get("/frontier/{opt_id}", response_model=EfficientFrontierResponse)
def get_frontier(
    opt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить результат оптимизации."""
    opt = db.query(PortfolioOptimization).filter(
        PortfolioOptimization.id == opt_id
    ).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Оптимизация не найдена")
    return opt


@router.get("/frontier", response_model=List[EfficientFrontierResponse])
def list_frontier(
    portfolio_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список оптимизаций портфеля."""
    q = db.query(PortfolioOptimization).filter(
        PortfolioOptimization.user_id == current_user.id
    )
    if portfolio_id:
        q = q.filter(PortfolioOptimization.portfolio_id == portfolio_id)
    q = q.order_by(PortfolioOptimization.created_at.desc())
    return q.offset((page - 1) * per_page).limit(per_page).all()
