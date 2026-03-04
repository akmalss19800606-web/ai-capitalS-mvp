from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class DecisionType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"

class DecisionBase(BaseModel):
    asset_name: str
    asset_symbol: str
    decision_type: DecisionType
    amount: float
    price: float
    ai_recommendation: Optional[str] = None

class DecisionCreate(DecisionBase):
    portfolio_id: int

class DecisionRead(DecisionBase):
    id: int
    portfolio_id: int
    created_at: datetime

    class Config:
        from_attributes = True
