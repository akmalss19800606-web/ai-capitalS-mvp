"""
Модели для хранения результатов AI-аналитики.
Фаза 2, Сессия 1 — Monte Carlo, SHAP, Efficient Frontier.

Спецификация: AI-SCEN-001, AI-XAI-001, AI-PORT-001
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, JSON,
    ForeignKey, Enum as SAEnum,
)
from app.db.session import Base


class MonteCarloSimulation(Base):
    """Результаты Monte Carlo симуляции для решения."""
    __tablename__ = "monte_carlo_simulations"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Параметры симуляции
    num_iterations = Column(Integer, default=5000)
    time_horizon_months = Column(Integer, default=36)
    initial_investment = Column(Float, nullable=False)

    # Входные распределения (JSON: {param_name: {distribution, mean, std, min, max}})
    input_parameters = Column(JSON, nullable=False)

    # Результаты
    percentile_5 = Column(Float)   # P5 — пессимистичный
    percentile_25 = Column(Float)  # P25 — консервативный
    percentile_50 = Column(Float)  # P50 — медиана
    percentile_75 = Column(Float)  # P75 — оптимистичный
    percentile_95 = Column(Float)  # P95 — агрессивный
    mean_return = Column(Float)
    std_return = Column(Float)
    probability_of_loss = Column(Float)
    max_drawdown = Column(Float)

    # Полное распределение (JSON массив для гистограммы)
    distribution_data = Column(JSON)

    # Sensitivity (tornado) данные: [{param, low_impact, high_impact, base_value}]
    sensitivity_data = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)


class ShapAnalysis(Base):
    """Результаты SHAP-анализа для объяснимости AI."""
    __tablename__ = "shap_analyses"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id"), nullable=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Тип анализа
    analysis_type = Column(String(50), nullable=False)  # 'decision_scoring', 'portfolio_risk', 'return_prediction'

    # Предсказание модели
    predicted_value = Column(Float)
    model_confidence = Column(Float)

    # SHAP значения: [{feature, value, shap_value, contribution_pct}]
    shap_values = Column(JSON, nullable=False)

    # Base value (expected value without any features)
    base_value = Column(Float)

    # Feature importance ranking: [{feature, importance, direction}]
    feature_importance = Column(JSON)

    # Текстовое объяснение на русском
    narrative_explanation = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


class PortfolioOptimization(Base):
    """Результаты портфельной оптимизации (Efficient Frontier)."""
    __tablename__ = "portfolio_optimizations"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Параметры оптимизации
    risk_free_rate = Column(Float, default=0.05)
    optimization_target = Column(String(50), default="max_sharpe")  # max_sharpe, min_variance, max_return

    # Текущий портфель: [{asset, weight, expected_return, volatility}]
    current_allocation = Column(JSON, nullable=False)

    # Оптимальные веса: [{asset, current_weight, optimal_weight, change}]
    optimal_allocation = Column(JSON, nullable=False)

    # Метрики текущего vs оптимального
    current_return = Column(Float)
    current_risk = Column(Float)
    current_sharpe = Column(Float)
    optimal_return = Column(Float)
    optimal_risk = Column(Float)
    optimal_sharpe = Column(Float)

    # Efficient frontier точки: [{risk, return, sharpe, weights: {}}]
    frontier_points = Column(JSON)

    # VaR / CVaR
    var_95 = Column(Float)       # Value at Risk 95%
    cvar_95 = Column(Float)      # Conditional VaR 95%

    created_at = Column(DateTime, default=datetime.utcnow)
