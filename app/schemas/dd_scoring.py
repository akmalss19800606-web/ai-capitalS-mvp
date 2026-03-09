"""
Pydantic-схемы: Due Diligence Scoring.
Фаза 2, Сессия 3.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ═══════════════════════════════════════════════════════════════
# REQUEST
# ═══════════════════════════════════════════════════════════════

class DDScoringRequest(BaseModel):
    decision_id: Optional[int] = None
    company_name: str = Field(min_length=1, max_length=200)
    industry: Optional[str] = None
    geography: str = Field(default="Узбекистан", max_length=100)
    # Опциональные финансовые показатели для точного скоринга
    revenue_mln: Optional[float] = None
    profit_margin_pct: Optional[float] = None
    debt_to_equity: Optional[float] = None
    years_in_business: Optional[int] = None
    employee_count: Optional[int] = None


class ChecklistUpdateRequest(BaseModel):
    item_id: str
    status: str = Field(description="pending | passed | failed | na")
    note: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# RESPONSE NESTED
# ═══════════════════════════════════════════════════════════════

class CategoryDetail(BaseModel):
    category: str
    subcategory: str
    score: float
    weight: float
    findings: str
    recommendation: str


class ChecklistItem(BaseModel):
    id: str
    category: str
    item: str
    status: str  # pending | passed | failed | na
    priority: str  # critical | high | medium | low
    note: Optional[str] = None


class BenchmarkItem(BaseModel):
    benchmark_name: str
    benchmark_score: float
    delta: float
    percentile: float


class RedFlag(BaseModel):
    flag: str
    severity: str  # critical | high | medium
    description: str


# ═══════════════════════════════════════════════════════════════
# RESPONSE
# ═══════════════════════════════════════════════════════════════

class DDScoringResponse(BaseModel):
    id: int
    decision_id: Optional[int] = None
    company_name: str
    industry: Optional[str] = None
    geography: Optional[str] = None

    total_score: float
    risk_level: str

    financial_score: float
    legal_score: float
    operational_score: float
    market_score: float
    management_score: float
    esg_score: float

    category_details: Optional[List[CategoryDetail]] = None
    checklist: Optional[List[ChecklistItem]] = None
    checklist_completion_pct: Optional[float] = None
    benchmarks: Optional[List[BenchmarkItem]] = None
    red_flags: Optional[List[RedFlag]] = None
    recommendation: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True
