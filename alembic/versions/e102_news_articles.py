"""E1-02: add news_articles table

Revision ID: e102_news_001
Revises:
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'e102_news_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('news_articles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('source_url', sa.String(1000), nullable=True),
        sa.Column('image_url', sa.String(1000), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('language', sa.String(10), server_default='ru'),
        sa.Column('fetched_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
    )
    op.create_index('ix_news_published_at', 'news_articles', ['published_at'])
    op.create_index('ix_news_source', 'news_articles', ['source'])
    op.create_index('ix_news_category', 'news_articles', ['category'])
    op.create_index('ix_news_source_url', 'news_articles', ['source_url'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_news_source_url', 'news_articles')
    op.drop_index('ix_news_category', 'news_articles')
    op.drop_index('ix_news_source', 'news_articles')
    op.drop_index('ix_news_published_at', 'news_articles')
    op.drop_table('news_articles')
