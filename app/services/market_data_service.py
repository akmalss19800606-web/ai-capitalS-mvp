"""
Объединённый сервис рыночных данных.
Фаза 1, REF-008: объединяет market_data_adapter_service, market_etl_service, market_service.

Все функции реэкспортируются для обратной совместимости.
"""

# ═══ Re-export from market_data_adapter_service ═══
from app.services.market_data_adapter_service import (
    create_source, list_sources, get_source,
    update_source, delete_source,
    fetch_quote, fetch_macro, list_cached_data,
    DEMO_QUOTES as ADAPTER_DEMO_QUOTES,
    DEMO_MACRO,
)

# ═══ Re-export from market_etl_service ═══
from app.services.market_etl_service import (
    run_etl_job, run_etl_all_sources, get_etl_status, cleanup_expired_cache,
)

# ═══ Re-export from market_service ═══
from app.services.market_service import (
    get_stock_price, get_market_overview,
)

__all__ = [
    # Adapter
    'create_source', 'list_sources', 'get_source',
    'update_source', 'delete_source',
    'fetch_quote', 'fetch_macro', 'list_cached_data',
    # ETL
    'run_etl_job', 'run_etl_all_sources', 'get_etl_status', 'cleanup_expired_cache',
    # Market
    'get_stock_price', 'get_market_overview',
]
