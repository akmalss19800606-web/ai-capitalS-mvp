"""
main.py — Этап 0, Сессия 0.3: Alembic миграции.

Изменения:
- Убран Base.metadata.create_all (заменён на Alembic)
- Добавлен автоматический запуск миграций при старте
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.users import router as users_router
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.portfolios import router as portfolios_router
from app.api.v1.routers.decisions import router as decisions_router
from app.api.v1.routers.ai import router as ai_router
from app.api.v1.routers.roles import router as roles_router
from app.api.v1.routers.dashboard import router as dashboard_router
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
from app.api.v1.routers.dashboards import router as dashboards_router
from app.api.v1.routers.mfa import router as mfa_router
from app.api.v1.routers.sessions import router as sessions_router
from app.api.v1.routers.access_control import router as access_control_router
from app.api.v1.routers.collaboration import router as collaboration_router
from app.api.v1.routers.notifications import router as notifications_router
from app.api.v1.routers.preferences import router as preferences_router
from app.api.v1.routers.data_exchange import router as data_exchange_router
from app.api.v1.routers.api_gateway import router as api_gateway_router
from app.api.v1.routers.market_adapters import router as market_adapters_router
from app.api.v1.routers.architectural_principles import router as arch_principles_router
from app.api.v1.routers.currency_rates import router as currency_rates_router
from app.core.config import settings

# ── Логирование ──
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Alembic: автоматический запуск миграций при старте ──
def run_migrations():
    """Запускает Alembic upgrade head при старте приложения."""
    try:
        from alembic.config import Config
        from alembic import command
        import os
        alembic_cfg = Config(os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini"))
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic: миграции применены успешно")
    except Exception as e:
        logger.error(f"Alembic: ошибка миграции — {e}")
        logger.warning("Alembic: приложение запускается без миграции")

run_migrations()

# ── Приложение ──
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── Middleware: Security Headers ──
from app.middleware.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)

# ── Middleware: CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Middleware: Rate Limiting ──
from app.middleware.rate_limiter import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, rate_limit=120, window_seconds=60)

# ── Роутеры ──
app.include_router(health_router)
app.include_router(auth_router, prefix='/api/v1')
app.include_router(users_router, prefix='/api/v1')
app.include_router(portfolios_router, prefix='/api/v1')
app.include_router(decisions_router, prefix='/api/v1')
app.include_router(ai_router, prefix='/api/v1')
app.include_router(roles_router, prefix='/api/v1')
app.include_router(dashboard_router, prefix='/api/v1')
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
app.include_router(dashboards_router, prefix='/api/v1')
app.include_router(mfa_router, prefix='/api/v1')
app.include_router(sessions_router, prefix='/api/v1')
app.include_router(access_control_router, prefix='/api/v1')
app.include_router(collaboration_router, prefix='/api/v1')
app.include_router(notifications_router, prefix='/api/v1')
app.include_router(preferences_router, prefix='/api/v1')
app.include_router(data_exchange_router, prefix='/api/v1')
app.include_router(api_gateway_router, prefix='/api/v1')
app.include_router(market_adapters_router, prefix='/api/v1')
app.include_router(arch_principles_router, prefix='/api/v1')
app.include_router(currency_rates_router, prefix='/api/v1')

# ── Лог при старте ──
logger.info("=" * 60)
logger.info(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
logger.info(f"  CORS origins: {settings.cors_origins_list}")
logger.info(f"  DEBUG: {settings.DEBUG}")
logger.info(f"  Migrations: Alembic (auto-upgrade at startup)")
logger.info(f"  Docs: {'enabled' if settings.DEBUG else 'disabled (set DEBUG=true)'}")
logger.info("=" * 60)
