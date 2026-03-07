from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class DecisionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"

class DecisionStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class InvestmentDecision(Base):
    __tablename__ = "investment_decisions"

    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String, nullable=False)
    asset_symbol = Column(String, nullable=False)
    decision_type = Column(Enum(DecisionType), nullable=False)
    amount = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    ai_recommendation = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Enum(DecisionStatus), nullable=False, default=DecisionStatus.DRAFT)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    portfolio = relationship("Portfolio", back_populates="decisions")
    creator = relationship("User", back_populates="decisions")
