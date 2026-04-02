"""
CalculatorHistory DB Model — CALC-HIST-001
Stores calculator results for history & export.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from app.db.session import Base


class CalculatorHistory(Base):
    __tablename__ = "calculator_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    calc_type = Column(String(50), nullable=False, index=True)
    inputs = Column(JSON, nullable=False)
    results = Column(JSON, nullable=False)
    currency = Column(String(3), default="USD")
    # CALC-23: Replace deprecated datetime.utcnow with timezone-aware alternative
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
