"""
Pydantic schemas for Islamic Finance Ask (Q&A) feature.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class IslamicAskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000, description="User question about Islamic finance")
    language: str = Field(default="ru", description="Response language: ru | en | uz")
    context: Optional[str] = Field(default=None, description="Optional context for the question")

    class Config:
        json_schema_extra = {
            "example": {
                "question": "Что такое мурабаха и как она работает?",
                "language": "ru"
            }
        }


class SourceReference(BaseModel):
    title: str
    standard: Optional[str] = None
    url: Optional[str] = None


class IslamicAskResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceReference] = []
    disclaimer: str = "Данный ответ носит информационный характер и не является фетвой. Для получения шариатского заключения обратитесь к квалифицированному учёному."
    language: str = "ru"
    created_at: Optional[datetime] = None


class IslamicAskHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    language: str
    created_at: datetime
