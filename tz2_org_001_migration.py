"""TZ2: organizations, chart_of_accounts, balance_entries, import_sessions

Revision ID: tz2_org_001
Revises: 
Create Date: 2026-03-13
"""
from alembic import op
import sqlalchemy as sa

revision = 'tz2_org_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('organizations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('inn', sa.String(9), nullable=True, index=True),
        sa.Column('ownership_form', sa.String(50), nullable=True),
        sa.Column('oked', sa.String(20), nullable=True),
        sa.Column('registration_date', sa.Date(), nullable=True),
        sa.Column('director', sa.String(300), nullable=True),
        sa.Column('charter_capital', sa.Numeric(18, 2), nullable=True),
        sa.Column('charter_currency', sa.String(3), server_default='UZS'),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('mode', sa.Enum('solo', 'branch', 'holding', name='orgmode'), server_default='solo'),
        sa.Column('accounting_currency', sa.String(3), server_default='UZS'),
        sa.Column('ownership_share', sa.Numeric(5, 2), server_default='100.00'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table('chart_of_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(10), nullable=False, unique=True, index=True),
        sa.Column('name_ru', sa.String(500), nullable=False),
        sa.Column('name_uz', sa.String(500), nullable=True),
        sa.Column('parent_code', sa.String(10), nullable=True, index=True),
        sa.Column('category', sa.Enum('long_term_assets', 'current_assets', 'liabilities', 'equity', 'income', 'expenses', name='accountcategory'), nullable=False),
        sa.Column('level', sa.Integer(), server_default='1'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('description', sa.Text(), nullable=True),
    )

    op.create_table('import_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('filename', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('records_total', sa.Integer(), server_default='0'),
        sa.Column('records_imported', sa.Integer(), server_default='0'),
        sa.Column('records_failed', sa.Integer(), server_default='0'),
        sa.Column('error_log', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table('balance_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('account_id', sa.Integer(), sa.ForeignKey('chart_of_accounts.id'), nullable=False),
        sa.Column('period_date', sa.Date(), nullable=False, index=True),
        sa.Column('debit', sa.Numeric(18, 2), server_default='0'),
        sa.Column('credit', sa.Numeric(18, 2), server_default='0'),
        sa.Column('balance', sa.Numeric(18, 2), server_default='0'),
        sa.Column('currency', sa.String(3), server_default='UZS'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source', sa.String(50), server_default='manual'),
        sa.Column('import_session_id', sa.Integer(), sa.ForeignKey('import_sessions.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_balance_org_period', 'balance_entries', ['organization_id', 'period_date'])


def downgrade() -> None:
    op.drop_index('ix_balance_org_period', 'balance_entries')
    op.drop_table('balance_entries')
    op.drop_table('import_sessions')
    op.drop_table('chart_of_accounts')
    op.drop_table('organizations')
