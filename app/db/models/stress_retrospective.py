"""
Модели: Стресс-тестирование и Ретроспективный анализ.
Фаза 2, Сессия 2.

AI-PORT-001.2 — Стресс-тестирование при макроэкономических шоках
AI-PERF-001.1 — Ретроспективный анализ (forecast vs actual)
AI-PERF-001.2 — Variance analysis
AI-PERF-001.5 — Бенчмаркинг
"""
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from app.db.session import Base


class StressTest(Base):
    """Результат стресс-тестирования портфеля."""
    __tablename__ = "stress_tests"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Параметры
    scenario_name = Column(String(100), nullable=False)  # e.g. "financial_crisis_2008"
    scenario_description = Column(Text, nullable=True)

    # Шоковые параметры: [{factor, shock_pct, description}]
    shock_parameters = Column(JSON, nullable=False)

    # Результаты по активам: [{asset, original_value, stressed_value, loss_pct}]
    asset_impacts = Column(JSON, nullable=False)

    # Агрегированные метрики
    portfolio_value_before = Column(Float, nullable=False)
    portfolio_value_after = Column(Float, nullable=False)
    total_loss_pct = Column(Float, nullable=False)
    max_single_asset_loss_pct = Column(Float, nullable=False)
    recovery_time_months = Column(Float, nullable=True)

    # Concentration risk: [{dimension, category, weight_pct, loss_pct}]
    concentration_risks = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Retrospective(Base):
    """Ретроспективный анализ: прогноз vs факт."""
    __tablename__ = "retrospectives"

    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("investment_decisions.id"), nullable=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    analysis_type = Column(String(50), nullable=False)  # "decision" | "portfolio"

    # Прогноз vs Факт
    forecast_return = Column(Float, nullable=False)
    actual_return = Column(Float, nullable=False)
    variance = Column(Float, nullable=False)
    variance_pct = Column(Float, nullable=False)

    # Forecast accuracy metrics
    mae = Column(Float, nullable=True)  # Mean Absolute Error
    mape = Column(Float, nullable=True)  # Mean Absolute Percentage Error
    rmse = Column(Float, nullable=True)  # Root Mean Squared Error
    accuracy_score = Column(Float, nullable=True)  # 0-100

    # Variance decomposition: [{factor, contribution_pct, description}]
    variance_factors = Column(JSON, nullable=True)

    # Benchmarking: [{benchmark_name, benchmark_return, alpha, tracking_error}]
    benchmarks = Column(JSON, nullable=True)

    # Когнитивные искажения: [{bias_type, severity, description}]
    cognitive_biases = Column(JSON, nullable=True)

    # Lessons learned
    lessons = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
