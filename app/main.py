"""
main.py — AI Capital Management MVP
Phase 1: Консолидированные роутеры (REF-001..003)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.users import router as users_router
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.portfolios import router as portfolios_router
from app.api.v1.routers.decisions import router as decisions_router
from app.api.v1.routers.roles import router as roles_router
from app.api.v1.routers.audit import router as audit_router
from app.api.v1.routers.relationships import router as relationships_router
from app.api.v1.routers.workflows import router as workflows_router
from app.api.v1.routers.etl import router as etl_router
from app.api.v1.routers.olap import router as olap_router
from app.api.v1.routers.ai_analytics import router as ai_analytics_router
from app.api.v1.routers.stress_retrospective import router as stress_retro_router
from app.api.v1.routers.dd_scoring import router as dd_scoring_router
from app.api.v1.routers.reports import router as reports_router
from app.api.v1.routers.charts import router as charts_router
from app.api.v1.routers.mfa import router as mfa_router
from app.api.v1.routers.sessions import router as sessions_router
from app.api.v1.routers.access_control import router as access_control_router
from app.api.v1.routers.collaboration import router as collaboration_router
from app.api.v1.routers.notifications import router as notifications_router
from app.api.v1.routers.preferences import router as preferences_router
from app.api.v1.routers.data_exchange import router as data_exchange_router
from app.api.v1.routers.architectural_principles import router as arch_principles_router
from app.api.v1.routers.macro_data import router as macro_data_router
from app.api.v1.routers.stock_exchange import router as stock_exchange_router
from app.api.v1.routers.cpi_data import router as cpi_data_router
from app.api.v1.routers.company_lookup import router as company_lookup_router

# Phase 1 REF-001: Consolidated dashboard (summary + builder)
from app.api.v1.routers.dashboard import router as dashboard_router
from app.api.v1.routers.dashboard import builder_router as dashboard_builder_router

# Phase 1 REF-002: Consolidated AI (ai + gateway)
from app.api.v1.routers.ai import router as ai_router
from app.api.v1.routers.ai import gateway_router as ai_gateway_router

# Phase 1 REF-003: Consolidated integrations (gateway + adapters)
from app.api.v1.routers.integrations import gateway_router as integrations_gateway_router
from app.api.v1.routers.integrations import adapters_router as integrations_adapters_router

# Beta modules
from app.api.v1.routers import email_digest
from app.api.v1.routers import onboarding
from app.api.v1.routers import documents
from app.api.v1.routers import branded_export
from app.api.v1.routers import admin_panel
from app.api.v1.routers import islamic_finance
from app.api.v1.routers import portfolio_analytics

from app.db.session import engine
from app.db.base import Base
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

from app.middleware.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)

from app.middleware.rate_limiter import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, rate_limit=120, window_seconds=60)

# ═══════════════════════════════════════════════════════════════
#  Register all routers
# ═══════════════════════════════════════════════════════════════
app.include_router(health_router)
app.include_router(auth_router, prefix='/api/v1')
app.include_router(users_router, prefix='/api/v1')
app.include_router(portfolios_router, prefix='/api/v1')
app.include_router(decisions_router, prefix='/api/v1')
app.include_router(roles_router, prefix='/api/v1')
app.include_router(audit_router, prefix='/api/v1')
app.include_router(relationships_router, prefix='/api/v1')
app.include_router(workflows_router, prefix='/api/v1')
app.include_router(etl_router, prefix='/api/v1')
app.include_router(olap_router, prefix='/api/v1')
app.include_router(ai_analytics_router, prefix='/api/v1')
app.include_router(stress_retro_router, prefix='/api/v1')
app.include_router(dd_scoring_router, prefix='/api/v1')
app.include_router(reports_router, prefix='/api/v1')
app.include_router(charts_router, prefix='/api/v1')
app.include_router(mfa_router, prefix='/api/v1')
app.include_router(sessions_router, prefix='/api/v1')
app.include_router(access_control_router, prefix='/api/v1')
app.include_router(collaboration_router, prefix='/api/v1')
app.include_router(notifications_router, prefix='/api/v1')
app.include_router(preferences_router, prefix='/api/v1')
app.include_router(data_exchange_router, prefix='/api/v1')
app.include_router(arch_principles_router, prefix='/api/v1')
app.include_router(macro_data_router, prefix='/api/v1')
app.include_router(stock_exchange_router, prefix='/api/v1')
app.include_router(cpi_data_router, prefix='/api/v1')
app.include_router(company_lookup_router, prefix='/api/v1')

# REF-001: Consolidated dashboard
app.include_router(dashboard_router, prefix='/api/v1')
app.include_router(dashboard_builder_router, prefix='/api/v1')

# REF-002: Consolidated AI
app.include_router(ai_router, prefix='/api/v1')
app.include_router(ai_gateway_router, prefix='/api/v1')

# REF-003: Consolidated integrations
app.include_router(integrations_gateway_router, prefix='/api/v1')
app.include_router(integrations_adapters_router, prefix='/api/v1')

# Beta modules
app.include_router(email_digest.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(branded_export.router, prefix="/api/v1")
app.include_router(admin_panel.router, prefix="/api/v1")

# Islamic Finance & Portfolio Analytics
app.include_router(islamic_finance.router, prefix="/api/v1")
app.include_router(portfolio_analytics.router, prefix="/api/v1")
