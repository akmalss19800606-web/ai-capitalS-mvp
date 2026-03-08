"""
Pydantic-схемы для OLAP / ETL / Analytics.
Фаза 1, Сессия 4 — STORE-OLAP-001
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


# ─── ETL ──────────────────────────────────────────────────────────────────────

class ETLRunResponse(BaseModel):
    status: str
    dimensions_loaded: Dict[str, int]
    facts_loaded: Dict[str, int]
    materialized_views_refreshed: List[str]
    duration_seconds: float
    message: str


class ETLStatusResponse(BaseModel):
    last_run_at: Optional[datetime] = None
    total_facts: Dict[str, int]
    total_dimensions: Dict[str, int]


# ─── OLAP Queries ─────────────────────────────────────────────────────────────

class OLAPTimeSeriesItem(BaseModel):
    period: str          # "2026-01", "2026-Q1", "2026"
    total_value: float
    count: int
    avg_value: float


class OLAPTimeSeriesResponse(BaseModel):
    granularity: str     # "month", "quarter", "year"
    items: List[OLAPTimeSeriesItem]
    total_value: float
    total_count: int


class OLAPBreakdownItem(BaseModel):
    dimension: str       # "equity", "UZ", "BUY", etc.
    label: str           # Human-readable label
    total_value: float
    count: int
    percentage: float    # % от общего


class OLAPBreakdownResponse(BaseModel):
    dimension_name: str  # "category", "geography", "decision_type", "status", "priority"
    items: List[OLAPBreakdownItem]
    total_value: float
    total_count: int


class OLAPPortfolioTrendItem(BaseModel):
    period: str
    portfolio_name: str
    total_value: float
    decision_count: int


class OLAPPortfolioTrendResponse(BaseModel):
    items: List[OLAPPortfolioTrendItem]


class OLAPEventSummaryItem(BaseModel):
    event_type: str
    count: int
    label: str


class OLAPEventSummaryResponse(BaseModel):
    period: str
    items: List[OLAPEventSummaryItem]
    total_events: int


class OLAPOverviewResponse(BaseModel):
    """Сводная OLAP-панель — все ключевые метрики."""
    total_investment_value: float
    total_decisions: int
    avg_decision_value: float
    top_categories: List[OLAPBreakdownItem]
    top_geographies: List[OLAPBreakdownItem]
    monthly_trend: List[OLAPTimeSeriesItem]
    status_breakdown: List[OLAPBreakdownItem]
    type_breakdown: List[OLAPBreakdownItem]
    last_etl_run: Optional[datetime] = None


# ─── Materialized Views ──────────────────────────────────────────────────────

class MaterializedViewInfo(BaseModel):
    name: str
    description: str
    row_count: int
    last_refreshed: Optional[datetime] = None


class MaterializedViewsListResponse(BaseModel):
    views: List[MaterializedViewInfo]
