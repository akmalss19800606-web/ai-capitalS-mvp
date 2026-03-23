"""add islamic finance stage2: products, purification, company import

Revision ID: isl_stage2_001
Revises: add_islamic_stage1
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid

revision = 'isl_stage2_001'
down_revision = ('3f877a23b6f2', 'add_islamic_stage1', 'calc_history_001', 'tz2_org_001')
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('islamic_product_catalog',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('name_ru', sa.String(200), nullable=False),
        sa.Column('name_ar', sa.String(200)),
        sa.Column('transliteration', sa.String(200)),
        sa.Column('product_type', sa.String(50), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('description_ru', sa.Text, nullable=False),
        sa.Column('principle_ru', sa.Text),
        sa.Column('allowed_for', sa.String(20), nullable=False, server_default='both'),
        sa.Column('prohibited_elements', ARRAY(sa.Text)),
        sa.Column('aaoifi_standard_code', sa.String(50)),
        sa.Column('ifsb_standard_code', sa.String(50)),
        sa.Column('use_cases_ru', ARRAY(sa.Text)),
        sa.Column('risks_ru', ARRAY(sa.Text)),
        sa.Column('typical_tenure', sa.String(100)),
        sa.Column('is_published', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint("category IN ('debt','equity','lease','service','social')", name='ck_product_category'),
        sa.CheckConstraint("allowed_for IN ('individual','professional','both')", name='ck_product_allowed_for'),
    )

    op.create_table('income_purification_case',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mode', sa.String(20), nullable=False, server_default='individual'),
        sa.Column('calculation_date', sa.Date, nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_description', sa.Text),
        sa.Column('gross_income_uzs', sa.Numeric(20, 2), nullable=False),
        sa.Column('non_compliant_pct', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('purification_amount_uzs', sa.Numeric(20, 2)),
        sa.Column('exchange_rate_uzs', sa.Numeric(20, 6), nullable=False),
        sa.Column('purification_amount_usd', sa.Numeric(20, 2), nullable=False),
        sa.Column('screening_result_id', UUID(as_uuid=True), sa.ForeignKey('shariah_screening_result.id')),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table('company_import_batch',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('imported_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('import_date', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('source', sa.String(50), nullable=False),
        sa.Column('file_name', sa.String(300)),
        sa.Column('total_rows', sa.Integer, server_default='0'),
        sa.Column('success_rows', sa.Integer, server_default='0'),
        sa.Column('error_rows', sa.Integer, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('errors_json', JSONB),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint("source IN ('uzse','cktsb','manual','csv')", name='ck_import_source'),
        sa.CheckConstraint("status IN ('pending','processing','done','failed')", name='ck_import_status'),
    )


def downgrade():
    op.drop_table('company_import_batch')
    op.drop_table('income_purification_case')
    op.drop_table('islamic_product_catalog')
