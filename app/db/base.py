"""
Обновлённый db/base.py — импорт всех моделей для auto-create tables.
Фаза 2, Сессия 4 — добавлены модели ReportTemplate, ReportInstance.
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
from app.db.models.stress_retrospective import (
    StressTest, Retrospective,
)
from app.db.models.dd_scoring import DueDiligenceScore
from app.db.models.reports import ReportTemplate, ReportInstance
