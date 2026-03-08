"""
Обновлённый main.py — добавлены роутеры MFA, Sessions, Access Control.
Фаза 3, Сессия 3.
"""
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
from app.db.session import engine
from app.db.base import Base
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

Base.metadata.create_all(bind=engine)

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
