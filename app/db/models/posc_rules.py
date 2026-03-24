"""
PoSCRuleSeed model — Principles of Shariah Compliance rules reference table.
Note: Different from PoSCRule in islamic_stage3.py (which is for scoring engine).
This model stores seed/reference rules loaded from JSON.
"""
from sqlalchemy import Column, Integer, String, Text, JSON, Float, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class PoSCRuleSeed(Base):
    __tablename__ = "posc_rules_seed"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, nullable=False, index=True)
    rule_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text)
    severity = Column(String(20), default="high")
    applicable_products = Column(JSON)
    references = Column(JSON)
    threshold = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
