"""
PoSCRule model — Principles of Shariah Compliance rules reference table.
"""
from sqlalchemy import Column, Integer, String, Text, JSON, Float, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class PoSCRule(Base):
    __tablename__ = "posc_rules"

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
