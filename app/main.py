"""
Обновлённый main.py — добавлен роутер workflows.
Фаза 1, Сессия 3.
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
