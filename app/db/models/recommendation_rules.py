"""
ProductRecommendationRule model — rules for recommending Islamic products.
"""
from sqlalchemy import Column, Integer, String, Text, JSON, Float, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class ProductRecommendationRule(Base):
    __tablename__ = "product_recommendation_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, nullable=False, index=True)
    investor_profile = Column(String(100), nullable=False)
    risk_tolerance = Column(String(50), nullable=False)
    recommended_products = Column(JSON, nullable=False)
    allocation_pct = Column(JSON)
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
