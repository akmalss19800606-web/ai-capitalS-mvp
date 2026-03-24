"""add islamic finance stage3: PoSC, SSB, Auditors, P2P

Revision ID: isl_stage3_001
Revises: isl_stage2_001
Create Date: 2026-03-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

revision = 'isl_stage3_001'
down_revision = 'isl_stage2_001'
branch_labels = None
depends_on = None


def upgrade():
    # PoSC Rule
    op.create_table('posc_rule',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('rule_code', sa.String(50), unique=True, nullable=False),
        sa.Column('rule_name_ru', sa.String(300), nullable=False),
        sa.Column('category', sa.String(30), nullable=False),
        sa.Column('severity', sa.String(10), nullable=False),
        sa.Column('standard_ref', sa.String(100)),
        sa.Column('standard_org', sa.String(20)),
        sa.Column('check_type', sa.String(20), nullable=False),
        sa.Column('threshold_value', sa.Numeric(10, 4)),
        sa.Column('description_ru', sa.Text),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.CheckConstraint("category IN ('riba','gharar','maysir','haram_sector','contract_structure','asset_type','ownership')"),
        sa.CheckConstraint("severity IN ('critical','major','minor')"),
        sa.CheckConstraint("check_type IN ('boolean','threshold','presence')"),
    )

    # PoSC Case
    op.create_table('posc_case',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column('object_type', sa.String(30), nullable=False),
        sa.Column('object_ref_id', UUID(as_uuid=True)),
        sa.Column('object_name', sa.String(300)),
        sa.Column('input_data', sa.dialects.postgresql.JSONB, nullable=False),
        sa.Column('score', sa.Numeric(3, 1)),
        sa.Column('risk_level', sa.String(20)),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('hash_ref', sa.String(64)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("object_type IN ('transaction','company','product','p2p_project','contract')"),
        sa.CheckConstraint("score >= 0 AND score <= 5"),
        sa.CheckConstraint("risk_level IN ('green','yellow','red')"),
        sa.CheckConstraint("status IN ('pending','auto_approved','auto_rejected','sent_to_ssb','ssb_approved','ssb_rejected')"),
    )

    # PoSC Finding
    op.create_table('posc_finding',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('posc_case_id', UUID(as_uuid=True), sa.ForeignKey('posc_case.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_id', UUID(as_uuid=True), sa.ForeignKey('posc_rule.id'), nullable=False),
        sa.Column('result', sa.String(20), nullable=False),
        sa.Column('actual_value', sa.Numeric(20, 6)),
        sa.Column('threshold_value', sa.Numeric(20, 6)),
        sa.Column('note_ru', sa.Text),
        sa.CheckConstraint("result IN ('pass','fail','warning')"),
    )

    # SSB Review Queue
    op.create_table('ssb_review_queue',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('posc_case_id', UUID(as_uuid=True), sa.ForeignKey('posc_case.id'), nullable=False),
        sa.Column('requested_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column('assigned_to', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('decision_note', sa.Text),
        sa.Column('decided_at', sa.DateTime(timezone=True)),
        sa.Column('standard_refs', sa.Text),
        sa.CheckConstraint("status IN ('pending','in_review','approved','rejected','requires_modification')"),
    )

    # Islamic Auditor Registry
    op.create_table('islamic_auditor_registry',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('full_name', sa.String(300), nullable=False),
        sa.Column('organization', sa.String(300)),
        sa.Column('qualification', sa.String(50), nullable=False),
        sa.Column('issuing_body', sa.String(100)),
        sa.Column('experience_years', sa.Integer),
        sa.Column('specialization', sa.Text),
        sa.Column('contact_email', sa.String(200)),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('verified_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("qualification IN ('CSAA','CISA','IFQB','other')"),
    )

    # P2P Islamic Project
    op.create_table('p2p_islamic_project',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title_ru', sa.String(300), nullable=False),
        sa.Column('description_ru', sa.Text),
        sa.Column('structure_type', sa.String(50), nullable=False),
        sa.Column('sector', sa.String(100)),
        sa.Column('requested_amount_uzs', sa.Numeric(20, 2), nullable=False),
        sa.Column('tenor_months', sa.Integer),
        sa.Column('expected_return_text', sa.String(200)),
        sa.Column('posc_case_id', UUID(as_uuid=True), sa.ForeignKey('posc_case.id')),
        sa.Column('posc_score', sa.Numeric(3, 1)),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('is_esg', sa.Boolean, server_default='false'),
        sa.Column('legal_disclaimer', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('draft','screening','pending_review','published','rejected','closed')"),
    )


def downgrade():
    op.drop_table('p2p_islamic_project')
    op.drop_table('islamic_auditor_registry')
    op.drop_table('ssb_review_queue')
    op.drop_table('posc_finding')
    op.drop_table('posc_case')
    op.drop_table('posc_rule')
