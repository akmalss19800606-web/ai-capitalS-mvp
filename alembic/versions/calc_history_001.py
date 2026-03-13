"""add calculator_history table

Revision ID: calc_history_001
Revises:
Create Date: 2026-03-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'calc_history_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'calculator_history',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('calc_type', sa.String(50), nullable=False, index=True),
        sa.Column('inputs', sa.JSON(), nullable=False),
        sa.Column('results', sa.JSON(), nullable=False),
        sa.Column('currency', sa.String(3), server_default='USD'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('calculator_history')
