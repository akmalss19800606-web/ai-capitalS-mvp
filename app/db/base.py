"""
db/base.py — Этап 0, Сессия 0.3.
Полный импорт ВСЕХ моделей для Alembic autogenerate.

Добавлены недостающие: Role, AuditEvent, DecisionVersion, DecisionRelationship.
"""
from app.db.session import Base
from app.db.models.user import User
from app.db.models.role import Role
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision
# Фаза 1, Сессия 2: Аудит, версионирование, граф зависимостей
from app.db.models.decision_version import DecisionVersion, AuditEvent
from app.db.models.decision_relationship import DecisionRelationship
# Фаза 1, Сессия 3: Workflow
from app.db.models.workflow import WorkflowDefinition, WorkflowInstance, WorkflowStep
# Фаза 1, Сессия 4: OLAP
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
)
# Фаза 2, Сессия 1: AI-аналитика
from app.db.models.ai_analytics import (
    MonteCarloSimulation, ShapAnalysis, PortfolioOptimization,
)
# Фаза 2, Сессия 2: Стресс-тест + Ретроспектива
from app.db.models.stress_retrospective import (
    StressTest, Retrospective,
)
# Фаза 2, Сессия 3: DD Scoring
from app.db.models.dd_scoring import DueDiligenceScore
# Фаза 2, Сессия 4: Отчёты
from app.db.models.reports import ReportTemplate, ReportInstance
# Фаза 3, Сессия 2: Динамические дашборды
from app.db.models.dashboard_config import DashboardConfig, DashboardWidget
# Фаза 3, Сессия 3: MFA + SSO + ABAC
from app.db.models.auth_security import (
    MfaSettings, SsoProvider, UserSession,
    AbacPolicy, CustomRole, DecisionAccess,
)
# Фаза 3, Сессия 4: Совместная работа + Персонализация
from app.db.models.collaboration import (
    ThreadComment, TaskItem, Notification, UserPreferences,
)
# Фаза 4, Сессия 1: Универсальный импорт/экспорт
from app.db.models.data_exchange import (
    ImportJob, ImportFieldMapping, ExportJob,
)
# Фаза 4, Сессия 2: API Gateway + Webhooks
from app.db.models.api_gateway import (
    ApiKey, WebhookSubscription, WebhookDeliveryLog, ApiUsageLog,
)
# Фаза 4, Сессия 3: Адаптеры внешних систем
from app.db.models.market_adapters import (
    MarketDataSource, MarketDataCache, CrmContact, CrmDeal,
    Document, DocumentVersion, ComparableCompany,
)
# Фаза 4, Сессия 4: Архитектурные принципы
from app.db.models.architectural_principles import (
    SystemEvent, HitlReview, AnalyticsSnapshot,
    EventBusMessage, SystemConstraint,
)
# Этап 0, Сессия 0.2: Курсы валют
from app.db.models.currency_rate import CurrencyRate
