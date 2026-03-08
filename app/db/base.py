"""
Обновлённый db/base.py — импорт всех моделей для auto-create tables.
Фаза 3, Сессия 3 — добавлены модели MfaSettings, SsoProvider, UserSession,
AbacPolicy, CustomRole, DecisionAccess.
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
from app.db.models.dashboard_config import DashboardConfig, DashboardWidget
from app.db.models.auth_security import (
    MfaSettings, SsoProvider, UserSession,
    AbacPolicy, CustomRole, DecisionAccess,
)
