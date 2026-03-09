from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class CompanyProfile(Base):
    __tablename__ = "company_profiles"
    id = Column(Integer, primary_key=True, index=True)
    inn = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    director = Column(String)
    address = Column(String)
    oked = Column(String)
    charter_fund = Column(Float)
    status = Column(String)
    phone = Column(String)
    email = Column(String)
    source = Column(String)
    raw_data = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
