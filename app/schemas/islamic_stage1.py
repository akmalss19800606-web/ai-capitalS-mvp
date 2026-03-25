from pydantic import BaseModel, UUID4, Field
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class IslamicMode(str, Enum):
    individual = "individual"
    professional = "professional"


# ─── Islamic Profile ──────────────────────────────────────────────────────────

class IslamicProfileUpsert(BaseModel):
    mode: IslamicMode = IslamicMode.individual
    default_currency: str = "UZS"
    language: str = "ru"

    class Config:
        use_enum_values = True


class IslamicProfileResponse(IslamicProfileUpsert):
    id: UUID4
    user_id: int
    jurisdiction: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Nisab ────────────────────────────────────────────────────────────────────

class NisabResponse(BaseModel):
    nisab_gold_grams: Decimal
    gold_price_uzs: Decimal
    nisab_uzs: Decimal
    exchange_rate_uzs: Decimal
    nisab_usd: Decimal
    rate_date: date
    source: str


# ─── Zakat Calculation ────────────────────────────────────────────────────────

class ZakatAssetItem(BaseModel):
    category: str  # cash, gold, silver, trade_goods, investments, receivables
    amount_uzs: Decimal


class ZakatCalculateRequest(BaseModel):
    zakat_type: str = Field(..., description="wealth | trade | investment | savings")
    mode: IslamicMode = IslamicMode.individual
    assets: List[ZakatAssetItem]
    liabilities_uzs: Decimal = Decimal("0")
    calculation_date: Optional[date] = None

    class Config:
        use_enum_values = True


class ZakatCalculateResponse(BaseModel):
    calculation_date: date
    assets_total_uzs: Decimal
    liabilities_uzs: Decimal
    net_assets_uzs: Decimal
    nisab_uzs: Decimal
    gold_price_uzs: Decimal
    exchange_rate_uzs: Decimal
    zakat_due_uzs: Decimal
    zakat_due_usd: Decimal
    is_zakat_due: bool
    explanation: str
    record_id: Optional[UUID4] = None

    class Config:
        from_attributes = True


class ZakatHistoryItem(BaseModel):
    id: UUID4
    calculation_date: date
    zakat_type: str
    assets_total_uzs: Decimal
    zakat_due_uzs: Decimal
    zakat_due_usd: Decimal
    is_zakat_due: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Shariah Screening ────────────────────────────────────────────────────────

class ShariahScreenRequest(BaseModel):
    company_id: Optional[UUID4] = None
    company_name: Optional[str] = None
    ticker: Optional[str] = None
    haram_revenue_pct: Optional[Decimal] = None
    debt_ratio: Optional[Decimal] = None
    interest_income_pct: Optional[Decimal] = None
    mode: IslamicMode = IslamicMode.individual

    class Config:
        use_enum_values = True


class ShariahScreenResponse(BaseModel):
    id: UUID4
    company_name: str
    score: Decimal
    status: str  # compliant | questionable | noncompliant | pending
    violations: Optional[Dict[str, Any]] = None
    standard_applied: str
    analysis_date: date
    recommendation: str
    haram_revenue_pct: Optional[Decimal] = None
    debt_ratio: Optional[Decimal] = None
    interest_income_pct: Optional[Decimal] = None

    class Config:
        from_attributes = True


class CompanyListItem(BaseModel):
    id: UUID4
    name_ru: str
    name_en: Optional[str] = None
    ticker: Optional[str] = None
    market_type: str
    sector: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# ─── Glossary ─────────────────────────────────────────────────────────────────

class GlossaryTermResponse(BaseModel):
    id: UUID4
    slug: str
    term_ru: str
    term_ar: Optional[str] = None
    transliteration: Optional[str] = None
    definition_ru: str
    category: str
    standard_ref: Optional[str] = None
    standard_org: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Islamic Reference Registry ───────────────────────────────────────────────

class ReferenceRegistryItem(BaseModel):
    id: UUID4
    registry_type: str
    code: str
    name_ru: str
    name_en: Optional[str] = None
    description_ru: Optional[str] = None
    topic: Optional[str] = None
    document_ref: Optional[str] = None

    class Config:
        from_attributes = True
