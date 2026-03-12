"""
MarketAnalysisReport + CalculatorHistory DB Models — MARKET-002
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class MarketAnalysisReportDB(Base):
    __tablename__ = "market_analysis_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Block 1: OKED
    oked_section = Column(String(2), nullable=False)
    oked_division = Column(String(2), nullable=False)
    oked_class = Column(String(10), nullable=True)
    activity_description = Column(String(500), nullable=True)

    # Block 2: Investment
    investment_amount = Column(Numeric(18, 2), nullable=False)
    investment_currency = Column(String(3), nullable=False, default="USD")
    investment_horizon_years = Column(Integer, nullable=False, default=5)
    investment_type = Column(String(20), nullable=False, default="greenfield")
    project_stage = Column(String(20), nullable=False, default="idea")
    funding_sources = Column(JSON, default=["own"])

    # Block 3: Financial
    debt_ratio_pct = Column(Float, default=30.0)
    expected_loan_rate_pct = Column(Float, default=22.8)
    expected_revenue_year1 = Column(Numeric(18, 2), nullable=True)
    expected_margin_pct = Column(Float, default=15.0)

    # Block 4: Regional
    region = Column(String(100), nullable=False)
    city_district = Column(String(100), nullable=True)
    sez_code = Column(String(50), nullable=True)
    industrial_zone = Column(String(100), nullable=True)

    # Block 5: Market
    target_markets = Column(JSON, default=["domestic"])
    expected_market_share_pct = Column(Float, default=5.0)
    competitors_range = Column(String(10), default="4-10")

    # Block 6: Legal
    legal_form = Column(String(20), default="ooo")
    tax_regime = Column(String(20), default="general")
    planned_employees = Column(Integer, default=10)

    # Block 7: Risk
    risk_profile = Column(Integer, default=5)
    import_dependency_pct = Column(Float, default=30.0)

    # AI Output
    executive_summary = Column(Text, nullable=True)
    recommendation = Column(String(10), nullable=True)
    confidence_score = Column(Float, nullable=True)
    sections_json = Column(JSON, nullable=True)

    # Context
    macro_context_json = Column(JSON, nullable=True)
    regional_data_json = Column(JSON, nullable=True)
    sez_benefits_json = Column(JSON, nullable=True)

    # Meta
    status = Column(String(20), default="generating")
    generation_time_sec = Column(Float, nullable=True)
    ai_model_used = Column(String(50), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CalculatorHistoryDB(Base):
    __tablename__ = "calculator_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    calc_type = Column(String(30), nullable=False)
    request_json = Column(JSON, nullable=False)
    result_json = Column(JSON, nullable=False)
    currency = Column(String(3), default="USD")
    npv = Column(Float, nullable=True)
    irr = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
