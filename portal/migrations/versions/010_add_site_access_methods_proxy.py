"""Add access methods, proxy URL, and sign-on method to sites

Revision ID: 010_site_access_methods
Revises: 009_cors_proxy_toggles
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_site_access_methods'
down_revision = '009_cors_proxy_toggles'
branch_labels = None
depends_on = None


def upgrade():
    # Add access_methods (JSON array), proxy_url, and sign_on_method to sites
    op.add_column('sites', sa.Column('access_methods', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('sites', sa.Column('proxy_url', sa.String(length=1024), nullable=True))
    op.add_column('sites', sa.Column('sign_on_method', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('sites', 'sign_on_method')
    op.drop_column('sites', 'proxy_url')
    op.drop_column('sites', 'access_methods')

