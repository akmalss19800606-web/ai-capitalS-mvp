import uuid
from sqlalchemy import Column, String, Numeric, Boolean, Date, Text, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base


class IslamicProfile(Base):
    __tablename__ = "islamic_profile"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    mode = Column(String(20), nullable=False, default="individual")
    default_currency = Column(String(3), nullable=False, default="UZS")
    language = Column(String(5), nullable=False, default="ru")
    jurisdiction = Column(String(5), nullable=False, default="UZ")
    created_at = Column(DateTime(timezone=True), server_default="now()")
    updated_at = Column(DateTime(timezone=True), server_default="now()", onupdate="now()")

    __table_args__ = (
        CheckConstraint("mode IN ('individual', 'professional')", name="ck_islamic_profile_mode"),
    )


class ZakatCalculationV2(Base):
    __tablename__ = "zakat_calculation_v2"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String(20), nullable=False, default="individual")
    calculation_date = Column(Date, nullable=False)
    zakat_type = Column(String(30), nullable=False)
    assets_total_uzs = Column(Numeric(20, 2), nullable=False)
    liabilities_uzs = Column(Numeric(20, 2), nullable=False, default=0)
    nisab_uzs = Column(Numeric(20, 2), nullable=False)
    gold_price_uzs = Column(Numeric(20, 2), nullable=False)
    exchange_rate_uzs = Column(Numeric(20, 6), nullable=False)
    zakat_due_uzs = Column(Numeric(20, 2), nullable=False)
    zakat_due_usd = Column(Numeric(20, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default="now()")


class IslamicGlossaryTerm(Base):
    __tablename__ = "islamic_glossary_term"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False)
    term_ru = Column(String(200), nullable=False)
    term_ar = Column(String(200))
    transliteration = Column(String(200))
    definition_ru = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    standard_ref = Column(String(100))
    standard_org = Column(String(20))
    is_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default="now()")

    __table_args__ = (
        CheckConstraint(
            "category IN ('contract','prohibition','instrument','regulatory','concept')",
            name="ck_glossary_category"
        ),
    )


class ShariahScreeningCompany(Base):
    __tablename__ = "shariah_screening_company"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_ru = Column(String(300), nullable=False)
    name_en = Column(String(300))
    ticker = Column(String(20))
    isin = Column(String(12))
    registration_no = Column(String(50))
    market_type = Column(String(20), nullable=False)
    sector = Column(String(100))
    subsector = Column(String(100))
    country = Column(String(5), nullable=False, default="UZ")
    source_url = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    last_updated = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default="now()")

    results = relationship("ShariahScreeningResult", back_populates="company")

    __table_args__ = (
        CheckConstraint(
            "market_type IN ('uzse','cktsb','private','other')",
            name="ck_company_market_type"
        ),
    )


class ShariahScreeningResult(Base):
    __tablename__ = "shariah_screening_result"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("shariah_screening_company.id"))
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    analysis_date = Column(Date, nullable=False)
    score = Column(Numeric(3, 1), nullable=False)
    status = Column(String(20), nullable=False)
    haram_revenue_pct = Column(Numeric(5, 2))
    debt_ratio = Column(Numeric(5, 2))
    interest_income_pct = Column(Numeric(5, 2))
    violations = Column(JSONB)
    standard_applied = Column(String(50), default="AAOIFI SS No. 62")
    notes = Column(Text)
    mode = Column(String(20), nullable=False, default="individual")
    created_at = Column(DateTime(timezone=True), server_default="now()")

    company = relationship("ShariahScreeningCompany", back_populates="results")

    __table_args__ = (
        CheckConstraint(
            "status IN ('compliant','questionable','noncompliant','pending')",
            name="ck_screening_status"
        ),
        CheckConstraint("score BETWEEN 0 AND 5", name="ck_screening_score"),
    )


class IslamicReferenceRegistry(Base):
    __tablename__ = "islamic_reference_registry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registry_type = Column(String(30), nullable=False)
    code = Column(String(50), nullable=False)
    name_ru = Column(String(300), nullable=False)
    name_en = Column(String(300))
    description_ru = Column(Text)
    topic = Column(String(100))
    document_ref = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("registry_type", "code", name="uq_registry_type_code"),
        CheckConstraint(
            "registry_type IN ('aaoifi_standard','ifsb_standard','local_regulation','exchange','index')",
            name="ck_registry_type"
        ),
    )
