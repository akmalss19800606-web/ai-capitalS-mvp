"""E5-03 QuickAsk history table

Revision ID: e503_quick_ask
Revises: None
Create Date: 2026-04-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "e503_quick_ask"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quick_ask_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False, server_default="groq"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_quick_ask_records_user_id", "quick_ask_records", ["user_id"])
    op.create_index("ix_quick_ask_records_created_at", "quick_ask_records", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_quick_ask_records_created_at", table_name="quick_ask_records")
    op.drop_index("ix_quick_ask_records_user_id", table_name="quick_ask_records")
    op.drop_table("quick_ask_records")
