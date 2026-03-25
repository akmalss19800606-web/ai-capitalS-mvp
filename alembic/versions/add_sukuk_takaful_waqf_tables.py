"""add sukuk_issuances, takaful_plans, waqf_projects tables

Revision ID: isl_stage4_001
Revises: isl_stage3_001
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = 'isl_stage4_001'
down_revision = 'isl_stage3_001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # sukuk_issuances
    op.create_table(
        'sukuk_issuances',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('name_ar', sa.String(200)),
        sa.Column('sukuk_type', sa.String(20), nullable=False),
        sa.Column('issuer', sa.String(200), nullable=False),
        sa.Column('nominal_value', sa.Numeric(20, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='UZS'),
        sa.Column('expected_return_pct', sa.Numeric(5, 2)),
        sa.Column('maturity_date', sa.Date),
        sa.Column('rating', sa.String(10)),
        sa.Column('shariah_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # takaful_plans
    op.create_table(
        'takaful_plans',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('takaful_type', sa.String(20), nullable=False),
        sa.Column('provider', sa.String(200), nullable=False),
        sa.Column('coverage_amount', sa.Numeric(20, 2), nullable=False),
        sa.Column('monthly_contribution', sa.Numeric(20, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='UZS'),
        sa.Column('description', sa.Text),
        sa.Column('shariah_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # waqf_projects
    op.create_table(
        'waqf_projects',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('waqf_type', sa.String(20), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('target_amount', sa.Numeric(20, 2), nullable=False),
        sa.Column('raised_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='UZS'),
        sa.Column('beneficiaries', sa.String(500)),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

def downgrade() -> None:
    op.drop_table('waqf_projects')
    op.drop_table('takaful_plans')
    op.drop_table('sukuk_issuances')
