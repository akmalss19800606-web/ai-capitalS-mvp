from fastapi import APIRouter
from app.api.v1.routers import (
    auth, users, portfolios, decisions, ai, health, roles,
    market_analysis, islamic_finance,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(portfolios.router)
api_router.include_router(decisions.router)
api_router.include_router(ai.router)
api_router.include_router(health.router)
api_router.include_router(roles.router)
api_router.include_router(market_analysis.router)
api_router.include_router(islamic_finance.router)
