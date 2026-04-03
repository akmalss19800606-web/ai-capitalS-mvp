"""
Обновлённый db/base.py — импорт всех моделей для auto-create tables.
Этапы 2.1–3.1: добавлены модели макроданных, биржи, ИПЦ,
компаний, AI Chat Log.

ИНСТРУКЦИЯ: Замените существующий app/db/base.py целиком.
"""
from app.db.session import Base
from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision
from app.db.models.workflow import WorkflowDefinition, WorkflowInstance, WorkflowStep
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
    DimAccount, DimCurrency, DimDataType, FactBalanceOLAP,
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
# ═══ Этап 2, Сессия 2.1: Макроданные + Курсы валют ═══
from app.db.models.macro_data import MacroIndicator
from app.db.models.currency_rate import CurrencyRate
# ═══ Этап 2, Сессия 2.2: Биржа UZSE + ИПЦ ═══
from app.db.models.stock_exchange import StockQuote, StockEmitter
from app.db.models.cpi_data import CPIRecord
# ═══ Этап 2, Сессия 2.3: Поиск компаний по ИНН ═══
from app.db.models.company_lookup import CompanyProfile
# ═══ Этап 3, Сессия 3.1: AI Chat Log ═══
from app.db.models.ai_chat_log import AIChatLog
# === Islamic Finance Models ===
from app.db.models.islamic_finance import (
    IslamicScreening, ZakatCalculation, PurificationRecord,
    IslamicContract, PoSCReport, SSBFatwa, SSBMember,
    IslamicGlossary, HaramIndustryDB, IslamicP2PProject,
)

# === Organization Models (TZ#2) ===
from app.db.models.organization_models import (
    Organization, ChartOfAccounts, BalanceEntry, ImportSession,
)
# === Islamic Finance Stage 1 ===
from app.db.models.islamic_stage1 import (
    IslamicProfile, ZakatCalculationV2, IslamicGlossaryTerm,
    ShariahScreeningCompany, ShariahScreeningResult, IslamicReferenceRegistry,
)

# === Islamic Finance Stage 2 ===
from app.db.models.islamic_stage2 import (
    IslamicProductCatalog,
    IncomePurificationCase,
    CompanyImportBatch,
)

# === IFRS Models (E0-05) ===
from app.db.models.ifrs import IFRSAdjustment, FinancialStatement

# === News Models (E1-02) ===
from app.db.models.news import NewsArticle

# === QuickAsk History (E5-03) ===
from app.db.models.quick_ask_record import QuickAskRecord
