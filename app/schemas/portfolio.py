from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PortfolioBase(BaseModel):
    name: str
    description: Optional[str] = None
    total_value: Optional[float] = 0.0

class PortfolioCreate(PortfolioBase):
    pass

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    total_value: Optional[float] = None

class PortfolioRead(PortfolioBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True
