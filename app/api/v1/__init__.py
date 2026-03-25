from fastapi import APIRouter
from app.api.v1.routers import (
    auth, users, portfolios, decisions, ai, health, roles,
    market_analysis, islamic_finance, islamic_stage3, islamic_ask, sukuk_takaful_waqf_router,
    islamic_compliance_router, islamic_contracts_router, islamic_education_router,
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
api_router.include_router(islamic_stage3.router)
api_router.include_router(islamic_ask.router)
api_router.include_router(sukuk_takaful_waqf_router.router)
api_router.include_router(islamic_compliance_router.router)
api_router.include_router(islamic_contracts_router.router)
api_router.include_router(islamic_education_router.router)
