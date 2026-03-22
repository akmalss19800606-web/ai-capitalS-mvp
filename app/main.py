"""
AI Capital Management MVP — Main Application
Phase 0-1: Cleaned up routers, removed stubs and duplicates.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routers.market_analysis_export import router as market_export_router
from app.api.v1.routers.calculator_export import router as calc_export_router
from app.api.v1.routers.calculator_fe import router as calculator_fe_router
from app.api.v1.routers.organizations_router import router as org_router
from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.users import router as users_router
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.portfolios import router as portfolios_router
from app.api.v1.routers.decisions import router as decisions_router
from app.api.v1.routers.ai import router as ai_router
from app.api.v1.routers.roles import router as roles_router
from app.api.v1.routers.dashboard import router as dashboard_router, builder_router as dashboard_builder_router
from app.api.v1.routers.audit import router as audit_router
from app.api.v1.routers.relationships import router as relationships_router
from app.api.v1.routers.consolidation_router import router as consolidation_router
from app.api.v1.routers.workflows import router as workflows_router
# CLN-003: etl_router and olap_router REMOVED
from app.api.v1.routers.olap import router as olap_router
from app.api.v1.routers.etl import router as etl_router
from app.api.v1.routers.ai_analytics import router as ai_analytics_router
from app.api.v1.routers.stress_retrospective import router as stress_retro_router
from app.api.v1.routers.dd_scoring import router as dd_scoring_router
from app.api.v1.routers.reports import router as reports_router
from app.api.v1.routers.risk import router as risk_router
from app.api.v1.routers.charts import router as charts_router
# CLN-001: dashboards_router consolidated into dashboard_router
from app.api.v1.routers.mfa import router as mfa_router
from app.api.v1.routers.sessions import router as sessions_router
from app.api.v1.routers.access_control import router as access_control_router
from app.api.v1.routers.collaboration import router as collaboration_router
from app.api.v1.routers.notifications import router as notifications_router
from app.api.v1.routers.preferences import router as preferences_router
from app.api.v1.routers.data_exchange import router as data_exchange_router
from app.api.v1.routers.api_gateway import router as api_gateway_router
from app.api.v1.routers.market_adapters import router as market_adapters_router
# CLN-002: arch_principles_router REMOVED
# Этап 2: Макроданные + Курсы валют
from app.api.v1.routers.macro_data import router as macro_data_router
from app.api.v1.routers.stock_exchange import router as stock_exchange_router
from app.api.v1.routers.cpi_data import router as cpi_data_router
from app.api.v1.routers.company_lookup import router as company_lookup_router
# CLN-001: dashboard_realdata_router REMOVED (stub)
# REF-002: ai_gateway merged into ai.py
# Stage 4: Beta modules
from app.api.v1.routers import email_digest
from app.api.v1.routers import onboarding
from app.api.v1.routers import documents
from app.api.v1.routers import branded_export
from app.api.v1.routers import admin_panel
from app.api.v1.routers.uz_market import router as uz_market_router
from app.api.v1.routers.reference import router as reference_router

from contextlib import asynccontextmanager

from app.db.session import engine
from app.db.base import Base
from app.core.config import settings
from app.services.redis_cache_service import RedisCacheService

from app.api.v1.routers import islamic_finance
from app.api.v1.routers import portfolio_analytics
from app.api.v1.routers import currency_rates

# Phase 3: Telegram Bot
from app.services.telegram_bot_service import TelegramBotService, telegram_bot as _tg_ref

# Phase 3: New routers
from app.api.v1.routers import rate_limit
from app.api.v1.routers import dd_documents
# from app.api.v1.routers import calculator  # replaced by calculator_fe
from app.api.v1.routers import contacts
from app.api.v1.routers import excel_export

# Phase 4: Business Cases, Monte Carlo, AI orchestration
from app.api.v1.routers import business_cases
from app.api.v1.routers import monte_carlo_v2
from app.api.v1.routers import xai
from app.api.v1.routers import ai_orchestrator as ai_orch_router
from app.api.v1.routers import ai_provider_health

# Phase 5: Demo seed data
from app.api.v1.routers import demo as demo_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown: Redis + Telegram Bot + Auto-create tables."""
    import logging
    logger = logging.getLogger(__name__)

    # Startup — Ensure all DB tables exist (checkfirst=True is safe for existing DBs)
    try:
        from app.db.base import Base  # noqa — imports all models
        from app.db.session import engine
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Database tables verified/created")
    except Exception as e:
        logger.error("Failed to verify/create database tables: %s", e)

    # Startup — Redis
    redis_ok = await RedisCacheService.ping()
    if redis_ok:
        logger.info("Redis connected successfully")
    else:
        logger.warning("Redis unavailable — caching disabled")

    # Startup — Telegram Bot (TG-001)
    import app.services.telegram_bot_service as tg_module
    bot = TelegramBotService(token=settings.TELEGRAM_BOT_TOKEN)
    started = await bot.start()
    if started:
        tg_module.telegram_bot = bot
        logger.info("Telegram Bot started")
    else:
        logger.info("Telegram Bot not started (token not configured or lib missing)")

    yield

    # Shutdown — Telegram Bot
    if bot.is_running:
        await bot.stop()
    # Shutdown — Redis
    await RedisCacheService.close()


app = FastAPI(
    title="AI Capital Management API",
    description=(
        "Интеллектуальная система управления инвестициями для рынка Центральной Азии.\n\n"
        "## Возможности\n\n"
        "- **Портфельный анализ**: CRUD портфелей, инвестиционные решения, версионирование\n"
        "- **AI-аналитика**: Monte Carlo, SHAP, XAI (объяснимость), мульти-провайдер оркестрация\n"
        "- **Due Diligence**: скоринг компаний, загрузка документов, чеклисты\n"
        "- **Калькулятор**: DCF, NPV, IRR, Payback, WACC\n"
        "- **Исламские финансы**: шариатский скрининг, закят-калькулятор\n"
        "- **50+ бизнес-кейсов**: валидация через аналитический движок\n"
        "- **Экспорт**: брендированный PDF, Excel с формулами\n"
        "- **Интеграции**: Telegram Bot, курсы ЦБ Узбекистана, биржа UZSE\n\n"
        "## Аутентификация\n\n"
        "API использует JWT Bearer Token. Получите токен через `POST /api/v1/auth/login`.\n\n"
        "## Rate Limiting\n\n"
        "120 запросов / 60 секунд на клиента."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "auth", "description": "Аутентификация и авторизация (JWT, MFA, SSO)"},
        {"name": "portfolios", "description": "Управление инвестиционными портфелями"},
        {"name": "decisions", "description": "Инвестиционные решения (CRUD, версионирование)"},
        {"name": "ai-analytics", "description": "AI-аналитика: Monte Carlo, SHAP, Frontier"},
        {"name": "due-diligence", "description": "Due Diligence скоринг компаний"},
        {"name": "Investment Calculator", "description": "Финансовые расчёты: DCF, NPV, IRR, WACC"},
        {"name": "Business Cases", "description": "50+ бизнес-кейсов с валидацией"},
        {"name": "Monte Carlo v2", "description": "Monte Carlo v2 — калиброванный под экономику УЗ"},
        {"name": "xai", "description": "Объяснимость AI-решений (XAI)"},
        {"name": "islamic-finance", "description": "Исламские финансы: скрининг, закят"},
        {"name": "Currency Rates", "description": "Курсы валют ЦБ Узбекистана"},
        {"name": "export", "description": "Экспорт отчётов в PDF"},
        {"name": "Excel Export", "description": "Экспорт данных в Excel"},
        {"name": "dashboard", "description": "Дашборд и KPI"},
        {"name": "users", "description": "Управление пользователями"},
        {"name": "ai", "description": "AI-ассистент: анализ, чат"},
        {"name": "ai-orchestrator", "description": "Оркестрация AI-провайдеров"},
        {"name": "ai-provider-health", "description": "Мониторинг AI-провайдеров"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

from app.middleware.rate_limiter import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, rate_limit=120, window_seconds=60)

# ── Core routers ──
app.include_router(health_router)
app.include_router(auth_router, prefix='/api/v1')
app.include_router(users_router, prefix='/api/v1')
app.include_router(portfolios_router, prefix='/api/v1')
app.include_router(decisions_router, prefix='/api/v1')
app.include_router(ai_router, prefix='/api/v1')
app.include_router(roles_router, prefix='/api/v1')
app.include_router(dashboard_router, prefix='/api/v1')
app.include_router(dashboard_builder_router, prefix='/api/v1')  # REF-001: merged from dashboards.py
app.include_router(audit_router, prefix='/api/v1')
app.include_router(relationships_router, prefix='/api/v1')
app.include_router(consolidation_router, prefix="/api/v1")
app.include_router(workflows_router, prefix='/api/v1')
app.include_router(market_export_router, prefix="/api/v1")
app.include_router(org_router, prefix="/api/v1")
app.include_router(calc_export_router, prefix="/api/v1")
# CLN-003: etl and olap REMOVED
app.include_router(olap_router, prefix='/api/v1')
app.include_router(etl_router, prefix='/api/v1')
app.include_router(ai_analytics_router, prefix='/api/v1')
app.include_router(stress_retro_router, prefix='/api/v1')
app.include_router(dd_scoring_router, prefix='/api/v1')
app.include_router(reports_router, prefix='/api/v1')
app.include_router(charts_router, prefix='/api/v1')
# CLN-001: dashboards_router REMOVED (merged into dashboard)
app.include_router(mfa_router, prefix='/api/v1')
app.include_router(sessions_router, prefix='/api/v1')
app.include_router(access_control_router, prefix='/api/v1')
app.include_router(collaboration_router, prefix='/api/v1')
app.include_router(notifications_router, prefix='/api/v1')
app.include_router(preferences_router, prefix='/api/v1')
app.include_router(data_exchange_router, prefix='/api/v1')
app.include_router(api_gateway_router, prefix='/api/v1')
app.include_router(market_adapters_router, prefix='/api/v1')
# CLN-002: arch_principles REMOVED
# Этап 2
app.include_router(macro_data_router, prefix='/api/v1')
app.include_router(stock_exchange_router, prefix='/api/v1')
app.include_router(cpi_data_router, prefix='/api/v1')
app.include_router(company_lookup_router, prefix='/api/v1')
app.include_router(currency_rates.router, prefix='/api/v1')
# CLN-001: dashboard_realdata REMOVED
# REF-002: ai_gateway merged into ai.py, no separate router needed
# Stage 4: Beta modules
app.include_router(email_digest.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(branded_export.router, prefix="/api/v1")
app.include_router(admin_panel.router, prefix="/api/v1")
# Stage 5: Islamic Finance
app.include_router(islamic_finance.router, prefix="/api/v1")
# Stage 6: Portfolio Analytics Engine
app.include_router(portfolio_analytics.router, prefix="/api/v1")
# Phase 3: New routers
app.include_router(rate_limit.router, prefix="/api/v1")
app.include_router(dd_documents.router, prefix="/api/v1")
# app.include_router(calculator.router, prefix="/api/v1")  # replaced by calculator_fe_router
app.include_router(uz_market_router, prefix="/api/v1")
app.include_router(contacts.router, prefix="/api/v1")
app.include_router(excel_export.router, prefix="/api/v1")
# Phase 4: New routers
app.include_router(calculator_fe_router, prefix="/api/v1")
app.include_router(business_cases.router, prefix="/api/v1")
app.include_router(reference_router, prefix='/api/v1')
app.include_router(monte_carlo_v2.router, prefix="/api/v1")
app.include_router(xai.router, prefix="/api/v1")
app.include_router(ai_orch_router.router, prefix="/api/v1")
app.include_router(ai_provider_health.router, prefix="/api/v1")
# Phase 5: Demo seed data
app.include_router(demo_router.router, prefix="/api/v1")
app.include_router(risk_router, prefix='/api/v1')
# NSBU Balance Import
from app.api.v1.routers.import_router import router as nsbu_import_router
app.include_router(nsbu_import_router, prefix="/api/v1")
from app.api.v1.routers.zakat_router import router as zakat_router
from app.api.v1.routers.shariah_screening_router import router as screening_router
from app.api.v1.routers.glossary_router import router as glossary_router
from app.api.v1.routers.islamic_profile_router import router as islamic_profile_router
from app.api.v1.routers.islamic_reference_router import router as islamic_reference_router

app.include_router(zakat_router,            prefix="/api/v1/islamic/zakat",      tags=["Islamic: Zakat"])
app.include_router(screening_router,        prefix="/api/v1/islamic/screening",  tags=["Islamic: Screening"])
app.include_router(glossary_router,         prefix="/api/v1/islamic/glossary",   tags=["Islamic: Glossary"])
app.include_router(islamic_profile_router,  prefix="/api/v1/islamic/profile",    tags=["Islamic: Profile"])
app.include_router(islamic_reference_router,prefix="/api/v1/islamic/references", tags=["Islamic: References"])