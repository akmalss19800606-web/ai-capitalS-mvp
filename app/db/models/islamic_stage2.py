import uuid
from sqlalchemy import Column, String, Numeric, Boolean, Date, Text, Integer, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import DateTime
from app.db.session import Base


class IslamicProductCatalog(Base):
    __tablename__ = "islamic_product_catalog"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False)
    name_ru = Column(String(200), nullable=False)
    name_ar = Column(String(200))
    transliteration = Column(String(200))
    product_type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    description_ru = Column(Text, nullable=False)
    principle_ru = Column(Text)
    allowed_for = Column(String(20), nullable=False, default="both")
    prohibited_elements = Column(ARRAY(Text))
    aaoifi_standard_code = Column(String(50))
    ifsb_standard_code = Column(String(50))
    use_cases_ru = Column(ARRAY(Text))
    risks_ru = Column(ARRAY(Text))
    typical_tenure = Column(String(100))
    is_published = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default="now()")


class IncomePurificationCase(Base):
    __tablename__ = "income_purification_case"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String(20), nullable=False, default="individual")
    calculation_date = Column(Date, nullable=False)
    source_type = Column(String(50), nullable=False)
    source_description = Column(Text)
    gross_income_uzs = Column(Numeric(20, 2), nullable=False)
    non_compliant_pct = Column(Numeric(5, 2), nullable=False, default=0)
    purification_amount_uzs = Column(Numeric(20, 2))
    exchange_rate_uzs = Column(Numeric(20, 6), nullable=False)
    purification_amount_usd = Column(Numeric(20, 2), nullable=False)
    screening_result_id = Column(UUID(as_uuid=True), ForeignKey("shariah_screening_result.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default="now()")


class CompanyImportBatch(Base):
    __tablename__ = "company_import_batch"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    imported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    import_date = Column(DateTime(timezone=True), server_default="now()")
    source = Column(String(50), nullable=False)
    file_name = Column(String(300))
    total_rows = Column(Integer, default=0)
    success_rows = Column(Integer, default=0)
    error_rows = Column(Integer, default=0)
    status = Column(String(20), nullable=False, default="pending")
    errors_json = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default="now()")
