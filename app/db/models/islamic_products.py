"""
IslamicProduct model — reference table for Islamic financial products.
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Float
from sqlalchemy.sql import func
from app.db.session import Base


class IslamicProduct(Base):
    __tablename__ = "islamic_products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    name_ar = Column(String(255), default="")
    category = Column(String(100), nullable=False)
    description = Column(Text)
    shariah_basis = Column(Text)
    risk_level = Column(String(20), default="medium")
    data_json = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
