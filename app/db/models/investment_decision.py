from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class DecisionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"

class InvestmentDecision(Base):
    __tablename__ = "investment_decisions"

    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String, nullable=False)
    asset_symbol = Column(String, nullable=False)
    decision_type = Column(Enum(DecisionType), nullable=False)
    amount = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    ai_recommendation = Column(String, nullable=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    portfolio = relationship("Portfolio", back_populates="decisions")
