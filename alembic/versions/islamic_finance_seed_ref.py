"""add islamic seed ref tables: islamic_products, posc_rules_seed, product_recommendation_rules

Revision ID: isl_seed_ref_001
Revises: isl_stage3_001
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = 'isl_seed_ref_001'
down_revision = 'isl_stage3_001'
branch_labels = None
depends_on = None


def upgrade():
    # Islamic Products (seed reference)
    op.create_table('islamic_products',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('product_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_ar', sa.String(255), server_default=''),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('shariah_basis', sa.Text()),
        sa.Column('risk_level', sa.String(20), server_default='medium'),
        sa.Column('data_json', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime()),
    )

    # PoSC Rules Seed (reference)
    op.create_table('posc_rules_seed',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('rule_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('rule_name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('severity', sa.String(20), server_default='high'),
        sa.Column('applicable_products', sa.JSON()),
        sa.Column('references', sa.JSON()),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Product Recommendation Rules
    op.create_table('product_recommendation_rules',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('rule_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('investor_profile', sa.String(100), nullable=False),
        sa.Column('risk_tolerance', sa.String(50), nullable=False),
        sa.Column('recommended_products', sa.JSON(), nullable=False),
        sa.Column('allocation_pct', sa.JSON()),
        sa.Column('notes', sa.Text(), server_default=''),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('product_recommendation_rules')
    op.drop_table('posc_rules_seed')
    op.drop_table('islamic_products')
