from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from app.db.session import Base

class MacroIndicator(Base):
    __tablename__ = "macro_indicators"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False)
    indicator_code = Column(String, nullable=False)
    indicator_name = Column(String)
    value = Column(Float)
    unit = Column(String)
    period_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


