"""E0-05: add ifrs_adjustments and financial_statements tables

Revision ID: e005_ifrs_001
Revises:
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = 'e005_ifrs_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('ifrs_adjustments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('portfolio_id', sa.Integer(), sa.ForeignKey('portfolios.id'), nullable=False),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('period_from', sa.Date(), nullable=False),
        sa.Column('period_to', sa.Date(), nullable=False),
        sa.Column('adjustment_type', sa.String(50), nullable=True),
        sa.Column('account_code', sa.String(20), nullable=True),
        sa.Column('nsbu_amount', sa.Numeric(20, 2), nullable=True),
        sa.Column('ifrs_amount', sa.Numeric(20, 2), nullable=True),
        sa.Column('difference', sa.Numeric(20, 2), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_ifrs_adj_portfolio', 'ifrs_adjustments', ['portfolio_id'])
    op.create_index('ix_ifrs_adj_organization', 'ifrs_adjustments', ['organization_id'])

    op.create_table('financial_statements',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('portfolio_id', sa.Integer(), sa.ForeignKey('portfolios.id'), nullable=False),
        sa.Column('statement_type', sa.String(20), nullable=True),
        sa.Column('standard', sa.String(10), nullable=True),
        sa.Column('period_from', sa.Date(), nullable=True),
        sa.Column('period_to', sa.Date(), nullable=True),
        sa.Column('data', JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_fin_stmt_portfolio', 'financial_statements', ['portfolio_id'])


def downgrade() -> None:
    op.drop_index('ix_fin_stmt_portfolio', 'financial_statements')
    op.drop_table('financial_statements')
    op.drop_index('ix_ifrs_adj_organization', 'ifrs_adjustments')
    op.drop_index('ix_ifrs_adj_portfolio', 'ifrs_adjustments')
    op.drop_table('ifrs_adjustments')
