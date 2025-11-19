"""Add CORS and proxy host validation toggles

Revision ID: 009_cors_proxy_toggles
Revises: 008_login_custom_ssh
Create Date: 2025-11-19 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '009_cors_proxy_toggles'
down_revision = '008_login_custom_ssh'
branch_labels = None
depends_on = None


def upgrade():
    # Add CORS and proxy host validation toggles to webapp_config
    # Both default to False (off by default)
    op.add_column('webapp_config', sa.Column('cors_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('webapp_config', sa.Column('proxy_host_validation_enabled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('webapp_config', 'proxy_host_validation_enabled')
    op.drop_column('webapp_config', 'cors_enabled')

