"""
Pydantic-схемы для адаптеров внешних систем.
Фаза 4, Сессия 3.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ───────────────── Market Data Sources ──────────────────────

class MarketDataSourceCreate(BaseModel):
    name: str
    provider: str  # alpha_vantage, yahoo_finance, world_bank
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    sync_interval_minutes: int = 60


class MarketDataSourceResponse(BaseModel):
    id: int
    user_id: int
    name: str
    provider: str
    is_active: bool
    config: Optional[Dict[str, Any]]
    last_sync_at: Optional[datetime]
    sync_interval_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True


class MarketDataSourceUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None


# ───────────────── Market Data Cache ─────────────────────────

class MarketQuoteResponse(BaseModel):
    symbol: str
    price: Optional[float]
    change: Optional[str]
    change_percent: Optional[str]
    volume: Optional[str]
    source: str  # alpha_vantage, yahoo_finance, demo
    fetched_at: Optional[datetime] = None
    note: Optional[str] = None


class MacroIndicatorResponse(BaseModel):
    indicator: str  # GDP, CPI, INFLATION, UNEMPLOYMENT
    country: str
    value: Optional[float]
    period: Optional[str]
    unit: Optional[str]
    source: str
    data: Optional[List[Dict[str, Any]]] = None


class MarketDataCacheResponse(BaseModel):
    id: int
    source_id: int
    symbol: str
    data_type: str
    data: Any
    period: Optional[str]
    fetched_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


# ───────────────── ETL Pipeline ──────────────────────────────

class EtlJobRequest(BaseModel):
    source_id: int
    symbols: Optional[List[str]] = None  # если не указано — все из config


class EtlJobResponse(BaseModel):
    source_id: int
    provider: str
    symbols_processed: int
    records_cached: int
    errors: List[str]
    duration_seconds: float
    started_at: datetime
    completed_at: datetime


# ───────────────── CRM Contacts ──────────────────────────────

class CrmContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    contact_type: str = "investor"
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    crm_source: Optional[str] = "manual"


class CrmContactResponse(BaseModel):
    id: int
    user_id: int
    external_id: Optional[str]
    first_name: str
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    position: Optional[str]
    contact_type: str
    tags: Optional[List[str]]
    notes: Optional[str]
    crm_source: Optional[str]
    last_interaction_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CrmContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    contact_type: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


# ───────────────── CRM Deals ─────────────────────────────────

DEAL_STAGES = [
    "lead", "qualified", "proposal",
    "negotiation", "closed_won", "closed_lost",
]


class CrmDealCreate(BaseModel):
    title: str
    contact_id: Optional[int] = None
    stage: str = "lead"
    amount: Optional[float] = None
    currency: str = "USD"
    probability: Optional[float] = None
    expected_close_date: Optional[datetime] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class CrmDealResponse(BaseModel):
    id: int
    user_id: int
    contact_id: Optional[int]
    external_id: Optional[str]
    title: str
    stage: str
    amount: Optional[float]
    currency: str
    probability: Optional[float]
    expected_close_date: Optional[datetime]
    description: Optional[str]
    tags: Optional[List[str]]
    crm_source: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CrmDealUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[int] = None
    stage: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    probability: Optional[float] = None
    expected_close_date: Optional[datetime] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


# ───────────────── DMS (Documents) ───────────────────────────

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class DocumentResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    category: Optional[str]
    tags: Optional[List[str]]
    mime_type: Optional[str]
    file_size: Optional[int]
    current_version: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_archived: Optional[bool] = None


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    file_name: str
    file_size: Optional[int]
    change_notes: Optional[str]
    uploaded_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentVersionCreate(BaseModel):
    file_name: str
    file_size: Optional[int] = None
    change_notes: Optional[str] = None


class DocumentSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None


# ───────────────── Comparable Companies ──────────────────────

class ComparableCompanyCreate(BaseModel):
    company_name: str
    ticker: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    market_cap: Optional[float] = None
    revenue: Optional[float] = None
    ebitda: Optional[float] = None
    net_income: Optional[float] = None
    ev_revenue: Optional[float] = None
    ev_ebitda: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    source: Optional[str] = "manual"
    notes: Optional[str] = None


class ComparableCompanyResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    ticker: Optional[str]
    sector: Optional[str]
    industry: Optional[str]
    country: Optional[str]
    market_cap: Optional[float]
    revenue: Optional[float]
    ebitda: Optional[float]
    net_income: Optional[float]
    ev_revenue: Optional[float]
    ev_ebitda: Optional[float]
    pe_ratio: Optional[float]
    pb_ratio: Optional[float]
    ps_ratio: Optional[float]
    dividend_yield: Optional[float]
    data_date: Optional[datetime]
    source: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComparableCompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    ticker: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    market_cap: Optional[float] = None
    revenue: Optional[float] = None
    ebitda: Optional[float] = None
    net_income: Optional[float] = None
    ev_revenue: Optional[float] = None
    ev_ebitda: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class ComparableAnalysisResponse(BaseModel):
    """Результат анализа мультипликаторов."""
    total_companies: int
    sector: Optional[str]
    median_ev_revenue: Optional[float]
    median_ev_ebitda: Optional[float]
    median_pe: Optional[float]
    median_pb: Optional[float]
    avg_ev_revenue: Optional[float]
    avg_ev_ebitda: Optional[float]
    avg_pe: Optional[float]
    avg_pb: Optional[float]
    companies: List[ComparableCompanyResponse]
