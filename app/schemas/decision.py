from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DecisionCreate(BaseModel):
    asset_name: str
    asset_symbol: str
    decision_type: str          # BUY, SELL, HOLD
    amount: float
    price: float
    portfolio_id: int
    notes: Optional[str] = None
    priority: Optional[str] = "medium"
    category: Optional[str] = "other"
    geography: Optional[str] = None
    target_return: Optional[float] = None
    investment_horizon: Optional[str] = None
    risk_level: Optional[str] = None
    rationale: Optional[str] = None
    tags: Optional[List[str]] = None


class DecisionUpdate(BaseModel):
    asset_name: Optional[str] = None
    asset_symbol: Optional[str] = None
    decision_type: Optional[str] = None
    amount: Optional[float] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    geography: Optional[str] = None
    target_return: Optional[float] = None
    investment_horizon: Optional[str] = None
    risk_level: Optional[str] = None
    rationale: Optional[str] = None
    tags: Optional[List[str]] = None


class DecisionStatusUpdate(BaseModel):
    # Allowed values: draft, review, approved, in_progress, completed, rejected
    status: str


class DecisionRead(BaseModel):
    id: int
    asset_name: str
    asset_symbol: str
    decision_type: str
    amount: float
    price: float
    total_value: Optional[float] = None
    ai_recommendation: Optional[str] = None
    notes: Optional[str] = None
    status: str
    priority: Optional[str] = None
    category: Optional[str] = None
    geography: Optional[str] = None
    target_return: Optional[float] = None
    investment_horizon: Optional[str] = None
    risk_level: Optional[str] = None
    rationale: Optional[str] = None
    tags: Optional[List[str]] = None
    portfolio_id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DecisionListResponse(BaseModel):
    items: List[DecisionRead]
    total: int
    page: int
    per_page: int
    pages: int
