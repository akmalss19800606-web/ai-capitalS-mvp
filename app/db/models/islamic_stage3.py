"""
Islamic Finance Stage 3 - SQLAlchemy Models
PoSC (Proof of Sharia Compliance), SSB, Auditors, P2P Islamic Projects
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Text,
    ForeignKey, DateTime, Date, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class PoSCRule(Base):
    """Rule-based engine rules for PoSC scoring"""
    __tablename__ = "posc_rule"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_code = Column(String(50), unique=True, nullable=False)
    rule_name_ru = Column(String(300), nullable=False)
    category = Column(String(30), nullable=False)  # riba, gharar, maysir, haram_sector, contract_structure, asset_type, ownership
    severity = Column(String(10), nullable=False)  # critical, major, minor
    standard_ref = Column(String(100))
    standard_org = Column(String(20))
    check_type = Column(String(20), nullable=False)  # boolean, threshold, presence
    threshold_value = Column(Numeric(10, 4))
    description_ru = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        CheckConstraint("category IN ('riba','gharar','maysir','haram_sector','contract_structure','asset_type','ownership')"),
        CheckConstraint("severity IN ('critical','major','minor')"),
        CheckConstraint("check_type IN ('boolean','threshold','presence')"),
    )


class PoSCCase(Base):
    """PoSC analysis case"""
    __tablename__ = "posc_case"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    case_date = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    object_type = Column(String(30), nullable=False)  # transaction, company, product, p2p_project, contract
    object_ref_id = Column(UUID(as_uuid=True))
    object_name = Column(String(300))
    input_data = Column(JSONB, nullable=False)
    score = Column(Numeric(3, 1))
    risk_level = Column(String(20))  # green, yellow, red
    status = Column(String(20), nullable=False, default="pending")
    hash_ref = Column(String(64))
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    findings = relationship("PoSCFinding", back_populates="posc_case", cascade="all, delete-orphan")
    ssb_reviews = relationship("SSBReviewQueue", back_populates="posc_case")

    __table_args__ = (
        CheckConstraint("object_type IN ('transaction','company','product','p2p_project','contract')"),
        CheckConstraint("score >= 0 AND score <= 5"),
        CheckConstraint("risk_level IN ('green','yellow','red')"),
        CheckConstraint("status IN ('pending','auto_approved','auto_rejected','sent_to_ssb','ssb_approved','ssb_rejected')"),
    )


class PoSCFinding(Base):
    """Individual finding within a PoSC case"""
    __tablename__ = "posc_finding"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    posc_case_id = Column(UUID(as_uuid=True), ForeignKey("posc_case.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("posc_rule.id"), nullable=False)
    result = Column(String(20), nullable=False)  # pass, fail, warning
    actual_value = Column(Numeric(20, 6))
    threshold_value = Column(Numeric(20, 6))
    note_ru = Column(Text)

    posc_case = relationship("PoSCCase", back_populates="findings")
    rule = relationship("PoSCRule")

    __table_args__ = (
        CheckConstraint("result IN ('pass','fail','warning')"),
    )


class SSBReviewQueue(Base):
    """Sharia Supervisory Board review queue"""
    __tablename__ = "ssb_review_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    posc_case_id = Column(UUID(as_uuid=True), ForeignKey("posc_case.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), nullable=False, default="pending")
    decision_note = Column(Text)
    decided_at = Column(DateTime(timezone=True))
    standard_refs = Column(Text)

    posc_case = relationship("PoSCCase", back_populates="ssb_reviews")

    __table_args__ = (
        CheckConstraint("status IN ('pending','in_review','approved','rejected','requires_modification')"),
    )


class IslamicAuditorRegistry(Base):
    """Registry of Islamic finance auditors"""
    __tablename__ = "islamic_auditor_registry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(300), nullable=False)
    organization = Column(String(300))
    qualification = Column(String(50), nullable=False)  # CSAA, CISA, IFQB, other
    issuing_body = Column(String(100))
    experience_years = Column(Integer)
    specialization = Column(Text)
    contact_email = Column(String(200))
    is_active = Column(Boolean, nullable=False, default=True)
    verified_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("qualification IN ('CSAA','CISA','IFQB','other')"),
    )


class P2PIslamicProject(Base):
    """P2P Islamic financing projects"""
    __tablename__ = "p2p_islamic_project"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title_ru = Column(String(300), nullable=False)
    description_ru = Column(Text)
    structure_type = Column(String(50), nullable=False)  # mudaraba, musharaka, murabaha, ijara, salam, istisna
    sector = Column(String(100))
    requested_amount_uzs = Column(Numeric(20, 2), nullable=False)
    tenor_months = Column(Integer)
    expected_return_text = Column(String(200))
    posc_case_id = Column(UUID(as_uuid=True), ForeignKey("posc_case.id"))
    posc_score = Column(Numeric(3, 1))
    status = Column(String(20), nullable=False, default="draft")
    is_esg = Column(Boolean, default=False)
    legal_disclaimer = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    posc_case = relationship("PoSCCase")

    __table_args__ = (
        CheckConstraint("status IN ('draft','screening','pending_review','published','rejected','closed')"),
    )
