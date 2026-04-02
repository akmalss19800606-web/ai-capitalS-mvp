from app.db.models.user import User
from app.db.models.portfolio import Portfolio
from app.db.models.investment_decision import InvestmentDecision

# OLAP Balance models (Аналитика v1.0)
from app.db.models.olap import (
    DimTime, DimCompany, DimGeography, DimCategory,
    DimAccount, DimCurrency, DimDataType,
    FactInvestmentPerformance, FactDecisionEvent, FactPortfolioSnapshot,
    FactBalanceOLAP,
)

# Organization Models (TZ#2)
from app.db.models.organization_models import (
    Organization, ChartOfAccounts, BalanceEntry, ImportSession,
)

# Islamic Finance Models
from app.db.models.islamic_finance import (
    IslamicScreening, ZakatCalculation, PurificationRecord,
    IslamicContract, PoSCReport, SSBFatwa, SSBMember,
    IslamicGlossary, HaramIndustryDB, IslamicP2PProject,
)

from app.db.models.islamic_stage2 import IslamicProductCatalog, IncomePurificationCase, CompanyImportBatch

# Islamic Finance Stage 3 Models
from app.db.models.islamic_stage3 import (
    PoSCRule, PoSCCase, PoSCFinding,
    SSBReviewQueue, IslamicAuditorRegistry, P2PIslamicProject,
    SukukIssuance, TakafulPlan, WaqfProject,
)


# Islamic Finance Seed Reference Data
from app.db.models.islamic_products import IslamicProduct
from app.db.models.posc_rules import PoSCRuleSeed
from app.db.models.recommendation_rules import ProductRecommendationRule

# IFRS Models (E0-05)
from app.db.models.ifrs import IFRSAdjustment, FinancialStatement
