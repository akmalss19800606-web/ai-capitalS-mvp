from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from enum import Enum


class IslamicMode(str, Enum):
    individual = "individual"
    professional = "professional"


# --- IslamicProduct ---

class IslamicProductListItem(BaseModel):
    id: UUID4
    slug: str
    name_ru: str
    name_ar: Optional[str] = None
    transliteration: Optional[str] = None
    product_type: str
    category: str
    allowed_for: str
    aaoifi_standard_code: Optional[str] = None

    class Config:
        from_attributes = True


class IslamicProductDetail(IslamicProductListItem):
    description_ru: str
    principle_ru: Optional[str] = None
    prohibited_elements: Optional[List[str]] = None
    use_cases_ru: Optional[List[str]] = None
    risks_ru: Optional[List[str]] = None
    typical_tenure: Optional[str] = None
    ifsb_standard_code: Optional[str] = None


class ProductRecommendationRequest(BaseModel):
    goal: str       # purchase, investment, trade, leasing, social
    tenure: str     # short, medium, long
    risk_appetite: str  # low, medium, high
    mode: IslamicMode = IslamicMode.individual


class ProductRecommendationResponse(BaseModel):
    recommended: IslamicProductListItem
    alternatives: List[IslamicProductListItem]
    rationale_ru: str


# --- IncomePurification ---

class PurificationCalculateRequest(BaseModel):
    mode: IslamicMode = IslamicMode.individual
    source_type: str
    source_description: Optional[str] = None
    gross_income_uzs: Decimal
    # ISL-07: Add range validation for purification percentage
    non_compliant_pct: Decimal = Field(..., ge=0, le=100)
    screening_result_id: Optional[UUID4] = None
    notes: Optional[str] = None


class PurificationCalculateResponse(BaseModel):
    id: Optional[UUID4] = None
    calculation_date: date
    gross_income_uzs: Decimal
    non_compliant_pct: Decimal
    purification_amount_uzs: Decimal
    purification_amount_usd: Decimal
    exchange_rate_uzs: Decimal
    explanation_ru: str

    class Config:
        from_attributes = True


class PurificationHistoryItem(BaseModel):
    id: UUID4
    calculation_date: date
    source_type: str
    gross_income_uzs: Decimal
    non_compliant_pct: Decimal
    purification_amount_uzs: Decimal
    purification_amount_usd: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# --- CompanyImport ---

class CompanyImportResponse(BaseModel):
    batch_id: UUID4
    total_rows: int
    success_rows: int
    error_rows: int
    errors: Optional[List[dict]] = None
