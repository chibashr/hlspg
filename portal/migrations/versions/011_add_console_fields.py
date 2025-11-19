"""Add console fields to sites

Revision ID: 011_console_fields
Revises: 010_site_access_methods
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '011_console_fields'
down_revision = '010_site_access_methods'
branch_labels = None
depends_on = None


def upgrade():
    # Add console fields to sites
    op.add_column('sites', sa.Column('console_enabled', sa.Boolean(), nullable=True, server_default=text('false')))
    op.add_column('sites', sa.Column('console_type', sa.String(length=50), nullable=True))
    op.add_column('sites', sa.Column('console_url', sa.String(length=1024), nullable=True))


def downgrade():
    op.drop_column('sites', 'console_url')
    op.drop_column('sites', 'console_type')
    op.drop_column('sites', 'console_enabled')

