from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from app.db.session import Base

class CPIRecord(Base):
    __tablename__ = "cpi_records"
    id = Column(Integer, primary_key=True, index=True)
    region = Column(String)
    category = Column(String)
    value = Column(Float, nullable=False)
    period_date = Column(Date, nullable=False)
    source = Column(String, default="stat.uz")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
