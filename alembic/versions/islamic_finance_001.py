"""Islamic Finance: 9 tables

Revision ID: islamic_finance_001
Revises:
Create Date: 2026-03-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'islamic_finance_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'islamic_screenings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('ticker', sa.String(20)),
        sa.Column('standard', sa.String(20), nullable=False),
        sa.Column('total_assets', sa.Numeric(20, 2)),
        sa.Column('total_debt', sa.Numeric(20, 2)),
        sa.Column('total_revenue', sa.Numeric(20, 2)),
        sa.Column('haram_revenue', sa.Numeric(20, 2)),
        sa.Column('market_cap', sa.Numeric(20, 2)),
        sa.Column('interest_bearing_securities', sa.Numeric(20, 2)),
        sa.Column('cash_and_interest', sa.Numeric(20, 2)),
        sa.Column('receivables', sa.Numeric(20, 2)),
        sa.Column('result_json', sa.JSON()),
        sa.Column('overall_score', sa.Float()),
        sa.Column('is_compliant', sa.Boolean()),
        sa.Column('screened_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'zakat_calculations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('mode', sa.String(20), nullable=False, server_default='individual'),
        sa.Column('madhab', sa.String(20), server_default='hanafi'),
        sa.Column('assets_json', sa.JSON(), nullable=False),
        sa.Column('liabilities_json', sa.JSON()),
        sa.Column('nisab_type', sa.String(10), server_default='gold'),
        sa.Column('nisab_value', sa.Numeric(20, 2)),
        sa.Column('zakatable_amount', sa.Numeric(20, 2)),
        sa.Column('zakat_amount', sa.Numeric(20, 2)),
        sa.Column('currency', sa.String(5), server_default='UZS'),
        sa.Column('hawl_start', sa.DateTime()),
        sa.Column('hawl_end', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'purification_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('portfolio_id', sa.Integer(), sa.ForeignKey('portfolios.id'), nullable=True),
        sa.Column('position_name', sa.String(255)),
        sa.Column('haram_pct', sa.Float(), server_default='0'),
        sa.Column('dividend_amount', sa.Numeric(20, 2), server_default='0'),
        sa.Column('purification_amount', sa.Numeric(20, 2), server_default='0'),
        sa.Column('method', sa.String(50), server_default='dividend_cleansing'),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'islamic_contracts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('product_type', sa.String(30), nullable=False),
        sa.Column('title', sa.String(255)),
        sa.Column('params_json', sa.JSON()),
        sa.Column('result_json', sa.JSON()),
        sa.Column('schedule_json', sa.JSON()),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'posc_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('target_name', sa.String(255), nullable=False),
        sa.Column('target_type', sa.String(50)),
        sa.Column('document_hash', sa.String(128)),
        sa.Column('score', sa.Float()),
        sa.Column('category_scores_json', sa.JSON()),
        sa.Column('findings_json', sa.JSON()),
        sa.Column('hash_chain', sa.String(128)),
        sa.Column('previous_hash', sa.String(128)),
        sa.Column('qr_code_url', sa.String(500)),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'ssb_fatwas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('product_type', sa.String(50)),
        sa.Column('decision', sa.String(20)),
        sa.Column('reasoning', sa.Text()),
        sa.Column('aaoifi_refs', sa.JSON()),
        sa.Column('votes_json', sa.JSON()),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('issued_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'ssb_members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('qualifications', sa.Text()),
        sa.Column('certificates', sa.JSON()),
        sa.Column('appointed_at', sa.DateTime()),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'islamic_glossary',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('term_arabic', sa.String(255), nullable=False),
        sa.Column('transliteration', sa.String(255)),
        sa.Column('term_ru', sa.String(255)),
        sa.Column('term_uz', sa.String(255)),
        sa.Column('definition', sa.Text()),
        sa.Column('aaoifi_ref', sa.String(100)),
        sa.Column('daleel', sa.Text()),
    )

    op.create_table(
        'haram_industries_db',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('oked_code', sa.String(20)),
        sa.Column('name_ru', sa.String(255), nullable=False),
        sa.Column('name_uz', sa.String(255)),
        sa.Column('category', sa.String(100)),
        sa.Column('reason', sa.Text()),
    )

    op.create_table(
        'islamic_p2p_projects',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('target_amount', sa.Numeric(20, 2), nullable=False),
        sa.Column('collected_amount', sa.Numeric(20, 2), server_default='0'),
        sa.Column('product_type', sa.String(30)),
        sa.Column('profit_sharing_ratio', sa.String(20)),
        sa.Column('duration_months', sa.Integer()),
        sa.Column('risk_level', sa.String(10), server_default='medium'),
        sa.Column('status', sa.String(20), server_default='active'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('islamic_p2p_projects')
    op.drop_table('haram_industries_db')
    op.drop_table('islamic_glossary')
    op.drop_table('ssb_members')
    op.drop_table('ssb_fatwas')
    op.drop_table('posc_reports')
    op.drop_table('islamic_contracts')
    op.drop_table('purification_records')
    op.drop_table('zakat_calculations')
    op.drop_table('islamic_screenings')
