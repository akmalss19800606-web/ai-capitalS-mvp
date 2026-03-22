"""Add Islamic Finance Stage 1 tables

Revision ID: add_islamic_stage1
Revises: islamic_finance_001
Create Date: 2026-03-23

Создаёт 6 новых таблиц Этапа 1 раздела «Исламские финансы»:
  - islamic_profile
  - zakat_calculation_v2
  - islamic_glossary_term
  - shariah_screening_company
  - shariah_screening_result
  - islamic_reference_registry

ВАЖНО: down_revision = 'islamic_finance_001'
Эта миграция идёт ПОСЛЕ islamic_finance_001.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = 'add_islamic_stage1'
down_revision = 'islamic_finance_001'
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── 1. islamic_profile ──────────────────────────────────────────
    op.create_table(
        'islamic_profile',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mode', sa.String(20), nullable=False, server_default='individual'),
        sa.Column('default_currency', sa.String(3), nullable=False, server_default='UZS'),
        sa.Column('language', sa.String(5), nullable=False, server_default='ru'),
        sa.Column('jurisdiction', sa.String(5), nullable=False, server_default='UZ'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', name='uq_islamic_profile_user_id'),
        sa.CheckConstraint("mode IN ('individual', 'professional')", name='ck_islamic_profile_mode'),
        sa.CheckConstraint("default_currency IN ('UZS', 'USD', 'EUR')", name='ck_islamic_profile_currency'),
    )

    # ── 2. zakat_calculation_v2 ─────────────────────────────────────
    op.create_table(
        'zakat_calculation_v2',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mode', sa.String(20), nullable=False, server_default='individual'),
        sa.Column('calculation_date', sa.Date(), nullable=False),
        sa.Column('zakat_type', sa.String(30), nullable=False),
        sa.Column('assets_total_uzs', sa.Numeric(20, 2), nullable=False),
        sa.Column('liabilities_uzs', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('net_assets_uzs', sa.Numeric(20, 2), nullable=False),
        sa.Column('nisab_uzs', sa.Numeric(20, 2), nullable=False),
        sa.Column('gold_price_uzs', sa.Numeric(20, 2), nullable=False),
        sa.Column('exchange_rate_uzs', sa.Numeric(20, 6), nullable=False),
        sa.Column('is_zakat_due', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('zakat_due_uzs', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('zakat_due_usd', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('assets_breakdown', JSONB(), nullable=True),
        sa.Column('explanation_ru', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("mode IN ('individual', 'professional')", name='ck_zakat_v2_mode'),
        sa.CheckConstraint(
            "zakat_type IN ('wealth', 'trade', 'investment', 'savings')",
            name='ck_zakat_v2_type'
        ),
    )

    # ── 3. islamic_glossary_term ────────────────────────────────────
    op.create_table(
        'islamic_glossary_term',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('term_ru', sa.String(200), nullable=False),
        sa.Column('term_ar', sa.String(200), nullable=True),
        sa.Column('transliteration', sa.String(200), nullable=True),
        sa.Column('definition_ru', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('standard_ref', sa.String(100), nullable=True),
        sa.Column('standard_org', sa.String(20), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "category IN ('contract', 'prohibition', 'instrument', 'regulatory', 'concept')",
            name='ck_glossary_term_category'
        ),
    )
    op.create_index('ix_islamic_glossary_term_slug', 'islamic_glossary_term', ['slug'])
    op.create_index('ix_islamic_glossary_term_ru', 'islamic_glossary_term', ['term_ru'])

    # ── 4. shariah_screening_company ───────────────────────────────
    op.create_table(
        'shariah_screening_company',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name_ru', sa.String(300), nullable=False),
        sa.Column('name_en', sa.String(300), nullable=True),
        sa.Column('ticker', sa.String(20), nullable=True),
        sa.Column('isin', sa.String(12), nullable=True, unique=True),
        sa.Column('registration_no', sa.String(50), nullable=True),
        sa.Column('market_type', sa.String(20), nullable=False, server_default='uzse'),
        sa.Column('sector', sa.String(100), nullable=True),
        sa.Column('sub_sector', sa.String(100), nullable=True),
        sa.Column('country', sa.String(5), nullable=False, server_default='UZ'),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "market_type IN ('uzse', 'cktsb', 'private', 'other')",
            name='ck_screening_company_market_type'
        ),
    )
    op.create_index('ix_screening_company_name_ru', 'shariah_screening_company', ['name_ru'])
    op.create_index('ix_screening_company_ticker', 'shariah_screening_company', ['ticker'])

    # ── 5. shariah_screening_result ────────────────────────────────
    op.create_table(
        'shariah_screening_result',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column(
            'company_id', UUID(as_uuid=True),
            sa.ForeignKey('shariah_screening_company.id', ondelete='SET NULL'),
            nullable=True
        ),
        sa.Column('company_name_manual', sa.String(300), nullable=True),
        sa.Column('requested_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('analysis_date', sa.Date(), nullable=False),
        sa.Column('score', sa.Numeric(3, 1), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('mode', sa.String(20), nullable=False, server_default='individual'),
        sa.Column('standard_applied', sa.String(50), nullable=False, server_default='AAOIFI SS No. 62'),
        sa.Column('haram_revenue_pct', sa.Numeric(5, 2), nullable=True),
        sa.Column('debt_ratio', sa.Numeric(5, 2), nullable=True),
        sa.Column('interest_income_pct', sa.Numeric(5, 2), nullable=True),
        sa.Column('violations', JSONB(), nullable=True),
        sa.Column('recommendation_ru', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('score >= 0 AND score <= 5', name='ck_screening_result_score'),
        sa.CheckConstraint(
            "status IN ('compliant', 'questionable', 'non_compliant', 'pending')",
            name='ck_screening_result_status'
        ),
        sa.CheckConstraint(
            "mode IN ('individual', 'professional')",
            name='ck_screening_result_mode'
        ),
    )
    op.create_index('ix_screening_result_company_id', 'shariah_screening_result', ['company_id'])

    # ── 6. islamic_reference_registry ──────────────────────────────
    op.create_table(
        'islamic_reference_registry',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('registry_type', sa.String(30), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name_ru', sa.String(300), nullable=False),
        sa.Column('name_en', sa.String(300), nullable=True),
        sa.Column('description_ru', sa.Text(), nullable=True),
        sa.Column('topic', sa.String(100), nullable=True),
        sa.Column('document_ref', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('registry_type', 'code', name='uq_ref_registry_type_code'),
        sa.CheckConstraint(
            "registry_type IN ('aaoifi_standard', 'ifsb_standard', 'local_regulation', 'exchange', 'index')",
            name='ck_ref_registry_type'
        ),
    )


def downgrade() -> None:
    op.drop_table('islamic_reference_registry')
    op.drop_index('ix_screening_result_company_id', table_name='shariah_screening_result')
    op.drop_table('shariah_screening_result')
    op.drop_index('ix_screening_company_ticker', table_name='shariah_screening_company')
    op.drop_index('ix_screening_company_name_ru', table_name='shariah_screening_company')
    op.drop_table('shariah_screening_company')
    op.drop_index('ix_islamic_glossary_term_ru', table_name='islamic_glossary_term')
    op.drop_index('ix_islamic_glossary_term_slug', table_name='islamic_glossary_term')
    op.drop_table('islamic_glossary_term')
    op.drop_table('zakat_calculation_v2')
    op.drop_table('islamic_profile')
