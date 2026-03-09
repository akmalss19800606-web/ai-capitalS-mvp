import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class DecisionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class DecisionStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"  # NEW in Phase 1


class DecisionPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DecisionCategory(str, enum.Enum):
    EQUITY = "equity"
    DEBT = "debt"
    REAL_ESTATE = "real_estate"
    INFRASTRUCTURE = "infrastructure"
    VENTURE = "venture"
    OTHER = "other"


class InvestmentDecision(Base):
    __tablename__ = "investment_decisions"

    id = Column(Integer, primary_key=True, index=True)

    # Core fields (existing)
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

    # NEW Phase 1 fields
    priority = Column(Enum(DecisionPriority), nullable=True, default=DecisionPriority.MEDIUM)
    category = Column(Enum(DecisionCategory), nullable=True, default=DecisionCategory.OTHER)
    geography = Column(String, nullable=True)          # e.g. "UZ", "KZ", "US"
    target_return = Column(Float, nullable=True)       # target return percentage
    investment_horizon = Column(String, nullable=True) # e.g. "12 months", "3 years"
    risk_level = Column(String, nullable=True)         # "low", "medium", "high"
    total_value = Column(Float, nullable=True)         # amount * price, calculated on create/update
    rationale = Column(Text, nullable=True)            # detailed investment rationale
    tags = Column(JSON, nullable=True)                 # flexible tags array

    # Relationships
    portfolio = relationship("Portfolio", back_populates="decisions")
    creator = relationship("User", back_populates="decisions")
