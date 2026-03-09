from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from app.db.session import Base

class StockQuote(Base):
    __tablename__ = "stock_quotes"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    emitter_name = Column(String)
    open_price = Column(Float)
    close_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    volume = Column(Integer)
    trade_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StockEmitter(Base):
    __tablename__ = "stock_emitters"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    sector = Column(String)
    inn = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
