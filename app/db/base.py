"""
Обновлённый db/base.py — импорт всех моделей для auto-create tables.
Фаза 2, Сессия 1 — добавлены модели AI-аналитики.
"""
from app.db.session import Base
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.workflow import WorkflowDefinition, WorkflowInstance, WorkflowStep
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
)
from app.db.models.ai_analytics import (
    MonteCarloSimulation, ShapAnalysis, PortfolioOptimization,
)
