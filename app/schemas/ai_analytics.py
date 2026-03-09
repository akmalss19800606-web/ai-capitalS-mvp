"""
Pydantic-схемы для AI-аналитики.
Фаза 2, Сессия 1 — Monte Carlo, SHAP, Efficient Frontier.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Monte Carlo ─────────────────────────────────────────────────────────

class MonteCarloInputParam(BaseModel):
    name: str
    display_name: str
    distribution: str = "normal"  # normal, uniform, triangular, lognormal
    mean: float
    std: Optional[float] = None
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    mode: Optional[float] = None  # for triangular


class MonteCarloRequest(BaseModel):
    decision_id: int
    initial_investment: float = Field(gt=0, description="Начальная сумма инвестиции")
    time_horizon_months: int = Field(default=36, ge=6, le=120, description="Горизонт в месяцах")
    num_iterations: int = Field(default=5000, ge=1000, le=50000, description="Количество итераций")
    parameters: Optional[List[MonteCarloInputParam]] = None  # если пусто — автогенерация


class MonteCarloSensitivityItem(BaseModel):
    param: str
    display_name: str
    low_impact: float
    high_impact: float
    base_value: float
    range_impact: float


class MonteCarloResponse(BaseModel):
    id: int
    decision_id: int
    num_iterations: int
    time_horizon_months: int
    initial_investment: float

    # Ключевые перцентили
    percentile_5: float
    percentile_25: float
    percentile_50: float
    percentile_75: float
    percentile_95: float
    mean_return: float
    std_return: float
    probability_of_loss: float
    max_drawdown: float

    # Данные для графиков
    distribution_data: List[Dict[str, Any]]  # гистограмма
    sensitivity_data: List[MonteCarloSensitivityItem]  # tornado

    created_at: datetime

    class Config:
        from_attributes = True


# ─── SHAP ────────────────────────────────────────────────────────────────

class ShapRequest(BaseModel):
    decision_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    analysis_type: str = "decision_scoring"  # decision_scoring, portfolio_risk, return_prediction


class ShapFeatureItem(BaseModel):
    feature: str
    display_name: str
    value: float
    shap_value: float
    contribution_pct: float
    direction: str  # "positive", "negative"


class ShapResponse(BaseModel):
    id: int
    decision_id: Optional[int]
    portfolio_id: Optional[int]
    analysis_type: str
    predicted_value: float
    model_confidence: float
    base_value: float

    shap_values: List[ShapFeatureItem]
    feature_importance: List[Dict[str, Any]]
    narrative_explanation: Optional[str]

    created_at: datetime

    class Config:
        from_attributes = True


# ─── Efficient Frontier ──────────────────────────────────────────────────

class EfficientFrontierRequest(BaseModel):
    portfolio_id: int
    risk_free_rate: float = Field(default=0.05, ge=0, le=0.30, description="Безрисковая ставка")
    optimization_target: str = "max_sharpe"  # max_sharpe, min_variance, max_return
    num_frontier_points: int = Field(default=50, ge=20, le=200)


class AllocationItem(BaseModel):
    asset: str
    current_weight: float
    optimal_weight: float
    change: float
    expected_return: float
    volatility: float


class FrontierPoint(BaseModel):
    risk: float
    returns: float
    sharpe: float


class EfficientFrontierResponse(BaseModel):
    id: int
    portfolio_id: int
    risk_free_rate: float
    optimization_target: str

    current_allocation: List[AllocationItem]
    optimal_allocation: List[AllocationItem]

    current_return: float
    current_risk: float
    current_sharpe: float
    optimal_return: float
    optimal_risk: float
    optimal_sharpe: float

    frontier_points: List[FrontierPoint]

    var_95: float
    cvar_95: float

    created_at: datetime

    class Config:
        from_attributes = True
