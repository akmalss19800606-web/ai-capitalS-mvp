"""
DB Models for IFRS adjustments and financial statements.
E0-05: ifrs_adjustments (НСБУ→МСФО корректировки), financial_statements (отчёты)
"""
import uuid
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.session import Base


class IFRSAdjustment(Base):
    __tablename__ = "ifrs_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    adjustment_type = Column(String(50))   # "ifrs16_lease", "ias16_revaluation", "ias36_impairment", "oci"
    account_code = Column(String(20))      # НСБУ счёт (напр. "0700")
    nsbu_amount = Column(Numeric(20, 2))
    ifrs_amount = Column(Numeric(20, 2))
    difference = Column(Numeric(20, 2))    # = ifrs_amount - nsbu_amount
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FinancialStatement(Base):
    __tablename__ = "financial_statements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    statement_type = Column(String(20))    # "P&L", "CF", "Balance", "Equity"
    standard = Column(String(10))          # "nsbu" | "ifrs"
    period_from = Column(Date)
    period_to = Column(Date)
    data = Column(JSONB)                   # структура строк отчёта
    created_at = Column(DateTime(timezone=True), server_default=func.now())
