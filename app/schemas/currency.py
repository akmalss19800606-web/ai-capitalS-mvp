"""
Pydantic-схемы для курсов валют.
Этап 0, Сессия 0.2.
"""
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class CurrencyRateResponse(BaseModel):
    code: str
    ccy_name_ru: Optional[str] = None
    nominal: int = 1
    rate: float
    diff: float = 0.0
    rate_date: date

    class Config:
        from_attributes = True


class CurrencyRatesListResponse(BaseModel):
    rates: list[CurrencyRateResponse]
    base_currency: str = "UZS"
    fetched_at: Optional[datetime] = None
    source: str = "cbu.uz"


class CurrencyConvertRequest(BaseModel):
    amount: float
    from_currency: str = "USD"
    to_currency: str = "UZS"


class CurrencyConvertResponse(BaseModel):
    amount: float
    from_currency: str
    to_currency: str
    rate: float
    result: float
    rate_date: date
