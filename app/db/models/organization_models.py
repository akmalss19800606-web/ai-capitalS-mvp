"""
DB Models for TZ#2: Organizations, Chart of Accounts (NSBU), Balance Entries
Solo / Branch / Holding architecture
"""
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, Enum, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.session import Base


class OrgMode(str, enum.Enum):
    SOLO = "solo"
    BRANCH = "branch"
    HOLDING = "holding"


class OwnershipForm(str, enum.Enum):
    OOO = "ООО"
    AO = "АО"
    IP = "ИП"
    GUP = "ГУП"
    SP = "СП"
    CHP = "ЧП"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    name = Column(String(500), nullable=False)
    inn = Column(String(9), nullable=True, index=True)
    ownership_form = Column(String(50), nullable=True)
    oked = Column(String(20), nullable=True)
    registration_date = Column(Date, nullable=True)
    director = Column(String(300), nullable=True)
    charter_capital = Column(Numeric(18, 2), nullable=True)
    charter_currency = Column(String(3), default="UZS")
    mode = Column(String(20), default="solo", nullable=False)

    accounting_currency = Column(String(3), default="UZS")
    ownership_share = Column(Numeric(5, 2), default=100.00)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    children = relationship("Organization", backref="parent", remote_side=[id], lazy="selectin")
    balance_entries = relationship("BalanceEntry", back_populates="organization", lazy="dynamic")
    import_sessions = relationship("ImportSession", back_populates="organization", lazy="dynamic")


class AccountCategory(str, enum.Enum):
    LONG_TERM_ASSETS = "long_term_assets"
    CURRENT_ASSETS = "current_assets"
    LIABILITIES = "liabilities"
    EQUITY = "equity"
    INCOME = "income"
    EXPENSES = "expenses"


class ChartOfAccounts(Base):
    __tablename__ = "chart_of_accounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), nullable=False, unique=True, index=True)
    name_ru = Column(String(500), nullable=False)
    name_uz = Column(String(500), nullable=True)
    parent_code = Column(String(10), nullable=True, index=True)
        category = Column(String(50), nullable=False)
    level = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)

    balance_entries = relationship("BalanceEntry", back_populates="account", lazy="dynamic")


class BalanceEntry(Base):
    __tablename__ = "balance_entries"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False)

    period_date = Column(Date, nullable=False, index=True)
    debit = Column(Numeric(18, 2), default=0)
    credit = Column(Numeric(18, 2), default=0)
    balance = Column(Numeric(18, 2), default=0)
    currency = Column(String(3), default="UZS")

    description = Column(Text, nullable=True)
    source = Column(String(50), default="manual")
    import_session_id = Column(Integer, ForeignKey("import_sessions.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", back_populates="balance_entries")
    account = relationship("ChartOfAccounts", back_populates="balance_entries")


class ImportSession(Base):
    __tablename__ = "import_sessions"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    source_type = Column(String(50), nullable=False)
    filename = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")
    records_total = Column(Integer, default=0)
    records_imported = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_log = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="import_sessions")
