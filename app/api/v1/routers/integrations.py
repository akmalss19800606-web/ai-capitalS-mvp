"""
integrations.py — Консолидированный модуль внешних интеграций.
Phase 1 REF-003: merged from api_gateway.py + market_adapters.py

Содержит два роутера:
  gateway_router  — /gateway  (API ключи, вебхуки, мониторинг)
  adapters_router — /adapters (рыночные данные, ETL, CRM, DMS, comparable)

Оба роутера сохраняют прежние пути для обратной совместимости с frontend.
"""

# Re-export routers from their modules (kept as sub-modules for maintainability)
from app.api.v1.routers._gateway import router as gateway_router
from app.api.v1.routers._adapters import router as adapters_router

__all__ = ["gateway_router", "adapters_router"]
