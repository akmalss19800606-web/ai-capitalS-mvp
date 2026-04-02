"""
Pydantic schemas for Islamic Finance module.
Screening, Zakat, Purification, Products, PoSC, SSB, Glossary, HaramIndustry, P2P.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# === Screening ===
class ScreeningRequest(BaseModel):
    company_name: str = Field(..., description="Company name")
    ticker: Optional[str] = None
    standard: Literal["AAOIFI", "FTSE", "DJIM", "SP", "MSCI", "ALL"] = "ALL"
    total_assets: Decimal = Field(ge=0)
    total_debt: Decimal = Field(ge=0, default=0)
    total_revenue: Decimal = Field(ge=0, default=0)
    haram_revenue: Decimal = Field(ge=0, default=0)
    market_cap: Optional[Decimal] = Field(ge=0, default=None)
    interest_bearing_securities: Decimal = Field(ge=0, default=0)
    cash_and_interest: Decimal = Field(ge=0, default=0)
    receivables: Decimal = Field(ge=0, default=0)

class RatioDetail(BaseModel):
    ratio_name: str
    value: float
    threshold: float
    passed: bool

class StandardResult(BaseModel):
    standard: str
    ratios: List[RatioDetail]
    is_compliant: bool
    score: float  # 0-100

class ScreeningResponse(BaseModel):
    id: Optional[int] = None
    company_name: str
    ticker: Optional[str] = None
    standards: List[StandardResult]
    overall_score: float
    is_compliant: bool
    screened_at: Optional[datetime] = None


# === Zakat ===
class ZakatRequest(BaseModel):
    mode: Literal["individual", "corporate"] = "individual"
    madhab: Literal["hanafi", "shafii", "maliki", "hanbali"] = "hanafi"
    assets: dict = Field(..., description="Assets JSON: {cash, gold, silver, stocks, ...}")
    liabilities: Optional[dict] = None
    nisab_type: Literal["gold", "silver"] = "gold"
    currency: str = "UZS"
    hawl_start: Optional[datetime] = None
    hawl_end: Optional[datetime] = None

class ZakatResponse(BaseModel):
    id: Optional[int] = None
    mode: str
    madhab: str
    nisab_type: str
    nisab_value: Decimal
    zakatable_amount: Decimal
    zakat_amount: Decimal
    currency: str
    hawl_start: Optional[datetime] = None
    hawl_end: Optional[datetime] = None
    created_at: Optional[datetime] = None


# === Purification ===
class PurificationRequest(BaseModel):
    portfolio_id: Optional[int] = None
    position_name: str
    haram_pct: float = Field(ge=0, le=100, default=0)
    dividend_amount: Decimal = Field(ge=0, default=0)
    method: Literal["dividend_cleansing", "income_cleansing", "capital_gains"] = "dividend_cleansing"
    notes: Optional[str] = None

class PurificationResponse(BaseModel):
    id: Optional[int] = None
    portfolio_id: Optional[int] = None
    position_name: str
    haram_pct: float
    dividend_amount: Decimal
    purification_amount: Decimal
    method: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


# === Products (Contracts) ===
class ProductRequest(BaseModel):
    product_type: Literal[
        "murabaha", "mudaraba", "musharaka", "ijarah",
        "salam", "istisna", "sukuk", "takaful"
    ]
    title: Optional[str] = None
    params: dict = Field(..., description="Contract-specific parameters")

class ProductResponse(BaseModel):
    id: Optional[int] = None
    product_type: str
    title: Optional[str]
    result: dict
    schedule: Optional[list] = None
    status: str = "draft"


# === PoSC ===
class PoSCRequest(BaseModel):
    target_name: str
    target_type: Literal["product", "portfolio", "company"] = "product"
    document_hash: Optional[str] = None

class PoSCResponse(BaseModel):
    id: Optional[int] = None
    target_name: str
    score: float  # 0-5
    category_scores: dict
    findings: list
    hash_chain: Optional[str] = None
    qr_code_url: Optional[str] = None
    status: str


# === SSB ===
class SSBFatwaRequest(BaseModel):
    subject: str
    product_type: Optional[str] = None
    decision: Literal["approved", "rejected", "conditional"]
    reasoning: Optional[str] = None
    aaoifi_refs: Optional[List[str]] = None

class SSBFatwaResponse(BaseModel):
    id: int
    subject: str
    product_type: Optional[str]
    decision: str
    reasoning: Optional[str] = None  # ISL-20: Add reasoning field to response schema
    aaoifi_refs: Optional[list]
    status: str
    issued_at: Optional[datetime]

class SSBMemberResponse(BaseModel):
    id: int
    full_name: str
    qualifications: Optional[str]
    is_active: bool


# === Glossary ===
class GlossaryResponse(BaseModel):
    id: int
    term_arabic: str
    transliteration: Optional[str]
    term_ru: Optional[str]
    term_uz: Optional[str]
    definition: Optional[str]
    aaoifi_ref: Optional[str]
    daleel: Optional[str] = None


# === Haram Industries ===
class HaramIndustryResponse(BaseModel):
    id: int
    oked_code: Optional[str]
    name_ru: str
    name_uz: Optional[str]
    category: Optional[str]
    reason: Optional[str]


# === P2P ===
class P2PProjectRequest(BaseModel):
    title: str
    description: Optional[str] = None
    target_amount: Decimal = Field(gt=0)
    product_type: Literal["mudaraba", "musharaka"] = "mudaraba"
    profit_sharing_ratio: str = Field(default="60:40", description="e.g. 60:40")
    duration_months: Optional[int] = None
    risk_level: Literal["low", "medium", "high"] = "medium"

class P2PProjectResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    target_amount: Decimal
    collected_amount: Decimal
    product_type: str
    profit_sharing_ratio: Optional[str]
    duration_months: Optional[int]
    risk_level: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
