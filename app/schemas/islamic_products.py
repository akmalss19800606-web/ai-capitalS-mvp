"""
Pydantic schemas for Islamic products, PoSC rules, and recommendation rules.
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# --- Islamic Product schemas ---
class IslamicProductBase(BaseModel):
    product_id: str
    name: str
    name_ar: Optional[str] = ""
    category: str
    description: Optional[str] = None
    shariah_basis: Optional[str] = None
    risk_level: Optional[str] = "medium"
    data_json: Optional[Any] = None


class IslamicProductCreate(IslamicProductBase):
    pass


class IslamicProductOut(IslamicProductBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- PoSC Rule schemas ---
class PoSCRuleBase(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    description: Optional[str] = None
    severity: Optional[str] = "high"
    applicable_products: Optional[List[str]] = None
    references: Optional[List[str]] = None
    threshold: Optional[float] = None


class PoSCRuleCreate(PoSCRuleBase):
    pass


class PoSCRuleOut(PoSCRuleBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Recommendation Rule schemas ---
class RecommendationRuleBase(BaseModel):
    rule_id: str
    investor_profile: str
    risk_tolerance: str
    recommended_products: List[str]
    allocation_pct: Optional[Any] = None
    notes: Optional[str] = ""


class RecommendationRuleCreate(RecommendationRuleBase):
    pass


class RecommendationRuleOut(RecommendationRuleBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
