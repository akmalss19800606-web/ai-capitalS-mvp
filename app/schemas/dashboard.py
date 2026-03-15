"""
Dashboard Schemas — Pydantic models for all dashboard widgets
TZ: Plan-dorabotki-Glavnaya-Panel-v1.0
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


# === A: Ticker Bar ===
class TickerItemSchema(BaseModel):
    code: str
    name: str
    rate: float
    diff: float
    diff_percent: float
    sparkline: List[float] = Field(default_factory=list, description="7-day rates")
    updated_at: Optional[datetime] = None


class TickerResponseSchema(BaseModel):
    items: List[TickerItemSchema]


# === B: News Feed ===
class NewsArticleSchema(BaseModel):
    id: str
    title: str
    summary: Optional[str] = None
    source: str
    source_url: str
    image_url: Optional[str] = None
    published_at: Optional[datetime] = None
    category: str = "finance"


class NewsFilterSchema(BaseModel):
    category: Optional[str] = None
    source: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None


class NewsListSchema(BaseModel):
    articles: List[NewsArticleSchema]
    total: int
    page: int
    per_page: int


# === C: UZSE Heatmap ===
class HeatmapStockSchema(BaseModel):
    ticker: str
    name: str
    sector: str
    price: float
    change_percent: float
    market_cap: float = 0


class HeatmapSectorSchema(BaseModel):
    name: str
    stocks: List[HeatmapStockSchema]
    total_change_percent: float = 0


class HeatmapResponseSchema(BaseModel):
    sectors: List[HeatmapSectorSchema]
    updated_at: Optional[datetime] = None


# === D: Watchlist ===
class WatchlistItemCreate(BaseModel):
    asset_type: Literal["stock", "currency", "index"]
    asset_code: str
    display_name: Optional[str] = None


class WatchlistItemSchema(BaseModel):
    id: str
    asset_type: str
    asset_code: str
    display_name: Optional[str] = None
    added_at: Optional[datetime] = None
    current_price: Optional[float] = None
    change_percent: Optional[float] = None


class WatchlistResponseSchema(BaseModel):
    items: List[WatchlistItemSchema]


# === E: Market Polls ===
class PollOptionSchema(BaseModel):
    id: str
    text: str
    votes_count: int = 0
    percentage: float = 0


class PollSchema(BaseModel):
    id: str
    question: str
    description: Optional[str] = None
    asset_code: Optional[str] = None
    options: List[PollOptionSchema]
    total_votes: int = 0
    is_active: bool = True
    expires_at: Optional[datetime] = None
    user_vote: Optional[str] = None


class PollCreateSchema(BaseModel):
    question: str
    description: Optional[str] = None
    asset_code: Optional[str] = None
    options: List[str] = Field(..., min_length=2)


class VoteSchema(BaseModel):
    option_id: str


# === F: Sector Breakdown ===
class SectorSchema(BaseModel):
    name: str
    code: str
    change_percent: float = 0
    weekly_change_percent: float = 0
    stocks_count: int = 0
    top_stocks: List[str] = Field(default_factory=list)


class SectorsResponseSchema(BaseModel):
    sectors: List[SectorSchema]
    updated_at: Optional[datetime] = None


# === G: AI Market Chat ===
class ChatMessageSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: Optional[datetime] = None


class ChatRequestSchema(BaseModel):
    message: str = Field(..., max_length=2000)
    context: Optional[Literal["market", "currency", "stocks", "macro"]] = None


class ChatResponseSchema(BaseModel):
    reply: str
    sources: List[str] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)


# === H: Organization KPI ===
class OrgKPISchema(BaseModel):
    org_id: int
    org_name: str
    total_assets: Decimal = Decimal("0")
    total_liabilities: Decimal = Decimal("0")
    equity: Decimal = Decimal("0")
    retained_profit: Decimal = Decimal("0")
    balance_valid: bool = True
    period_date: Optional[date] = None
    currency: str = "UZS"


# === I: Macro Widget ===
class MacroDataSchema(BaseModel):
    refinancing_rate: float = 14.0
    industrial_growth: float = 0
    trade_balance: float = 0
    updated_at: Optional[datetime] = None
