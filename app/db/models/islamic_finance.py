"""
Исламские финансы — SQLAlchemy модели.
9 таблиц: скрининг, закят, очистка, контракты, PoSC, SSB, глоссарий, харам-индустрии, P2P.
"""
import uuid
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON, Text, Boolean, Numeric, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class IslamicScreening(Base):
    __tablename__ = "islamic_screenings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    ticker = Column(String(20))
    standard = Column(String(20), nullable=False)  # AAOIFI/FTSE/DJIM/SP/MSCI/ALL
    total_assets = Column(Numeric(20, 2))
    total_debt = Column(Numeric(20, 2))
    total_revenue = Column(Numeric(20, 2))
    haram_revenue = Column(Numeric(20, 2))
    market_cap = Column(Numeric(20, 2))
    interest_bearing_securities = Column(Numeric(20, 2))
    cash_and_interest = Column(Numeric(20, 2))
    receivables = Column(Numeric(20, 2))
    result_json = Column(JSON)  # [{standard, ratio, value, threshold, pass}]
    overall_score = Column(Float)
    is_compliant = Column(Boolean)
    screened_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ZakatCalculation(Base):
    __tablename__ = "zakat_calculations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mode = Column(String(20), nullable=False, default="individual")  # individual/corporate
    madhab = Column(String(20), default="hanafi")
    assets_json = Column(JSON, nullable=False)
    liabilities_json = Column(JSON)
    nisab_type = Column(String(10), default="gold")  # gold/silver
    nisab_value = Column(Numeric(20, 2))
    zakatable_amount = Column(Numeric(20, 2))
    zakat_amount = Column(Numeric(20, 2))
    currency = Column(String(5), default="UZS")
    hawl_start = Column(DateTime)
    hawl_end = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())


class PurificationRecord(Base):
    __tablename__ = "purification_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True)
    position_name = Column(String(255))
    haram_pct = Column(Float, default=0)
    dividend_amount = Column(Numeric(20, 2), default=0)
    purification_amount = Column(Numeric(20, 2), default=0)
    method = Column(String(50), default="dividend_cleansing")
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class IslamicContract(Base):
    __tablename__ = "islamic_contracts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_type = Column(String(30), nullable=False)  # murabaha/mudaraba/musharaka/ijarah/salam/istisna/sukuk/takaful
    title = Column(String(255))
    params_json = Column(JSON)  # contract-specific parameters
    result_json = Column(JSON)  # calculated results
    schedule_json = Column(JSON)  # payment schedule
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class PoSCReport(Base):
    __tablename__ = "posc_reports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_name = Column(String(255), nullable=False)
    target_type = Column(String(50))  # product/portfolio/company
    document_hash = Column(String(128))
    score = Column(Float)  # 0-5
    category_scores_json = Column(JSON)
    findings_json = Column(JSON)
    hash_chain = Column(String(128))
    previous_hash = Column(String(128))
    qr_code_url = Column(String(500))
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, server_default=func.now())


class SSBFatwa(Base):
    __tablename__ = "ssb_fatwas"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=True)
    subject = Column(String(500), nullable=False)
    product_type = Column(String(50))
    decision = Column(String(20))  # approved/rejected/conditional
    reasoning = Column(Text)
    aaoifi_refs = Column(JSON)  # ["FAS 28", "SS 17"]
    votes_json = Column(JSON)  # [{member_id, vote, comment}]
    status = Column(String(20), default="draft")
    issued_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class SSBMember(Base):
    __tablename__ = "ssb_members"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=True)
    full_name = Column(String(255), nullable=False)
    qualifications = Column(Text)
    certificates = Column(JSON)  # [{name, issuer, year}]
    appointed_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class IslamicGlossary(Base):
    __tablename__ = "islamic_glossary"
    id = Column(Integer, primary_key=True, index=True)
    term_arabic = Column(String(255), nullable=False)
    transliteration = Column(String(255))
    term_ru = Column(String(255))
    term_uz = Column(String(255))
    definition = Column(Text)
    aaoifi_ref = Column(String(100))
    daleel = Column(Text)  # source/evidence


class HaramIndustryDB(Base):
    __tablename__ = "haram_industries_db"
    id = Column(Integer, primary_key=True, index=True)
    oked_code = Column(String(20))
    name_ru = Column(String(255), nullable=False)
    name_uz = Column(String(255))
    category = Column(String(100))  # alcohol/gambling/tobacco/pork/weapons/conventional_finance
    reason = Column(Text)


class IslamicP2PProject(Base):
    __tablename__ = "islamic_p2p_projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    target_amount = Column(Numeric(20, 2), nullable=False)
    collected_amount = Column(Numeric(20, 2), default=0)
    product_type = Column(String(30))  # mudaraba/musharaka
    profit_sharing_ratio = Column(String(20))  # e.g. "60:40"
    duration_months = Column(Integer)
    risk_level = Column(String(10), default="medium")  # low/medium/high
    status = Column(String(20), default="active")  # active/funded/completed
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
