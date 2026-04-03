"""Add accountant, address, oked_name, period_from, period_to to organizations

Revision ID: persist_org_1c
Revises: None (standalone)
"""
from alembic import op
import sqlalchemy as sa

revision = "persist_org_1c"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns("organizations")}

    if "accountant" not in existing:
        op.add_column("organizations", sa.Column("accountant", sa.String(300), nullable=True))
    if "address" not in existing:
        op.add_column("organizations", sa.Column("address", sa.String(500), nullable=True))
    if "oked_name" not in existing:
        op.add_column("organizations", sa.Column("oked_name", sa.String(500), nullable=True))
    if "period_from" not in existing:
        op.add_column("organizations", sa.Column("period_from", sa.Date(), nullable=True))
    if "period_to" not in existing:
        op.add_column("organizations", sa.Column("period_to", sa.Date(), nullable=True))


def downgrade():
    op.drop_column("organizations", "period_to")
    op.drop_column("organizations", "period_from")
    op.drop_column("organizations", "oked_name")
    op.drop_column("organizations", "address")
    op.drop_column("organizations", "accountant")
