"""Add certificates table for admin-provided certificates

Revision ID: 015_add_certificates
Revises: 014_simplify_sso
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '015_add_certificates'
down_revision = '014_simplify_sso'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'certificates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('certificate_data', sa.Text(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True, onupdate=sa.text('now()'))
    )


def downgrade():
    op.drop_table('certificates')

