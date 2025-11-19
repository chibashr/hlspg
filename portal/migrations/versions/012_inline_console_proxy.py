"""Add inline console/proxy fields and user credentials

Revision ID: 012_inline_console_proxy
Revises: 011_console_fields
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '012_inline_console_proxy'
down_revision = '011_console_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Inline console/proxy fields
    op.add_column('sites', sa.Column('inline_web_url', sa.String(length=1024), nullable=True))
    op.add_column('sites', sa.Column('inline_ssh_url', sa.String(length=1024), nullable=True))
    op.add_column('sites', sa.Column('inline_vnc_url', sa.String(length=1024), nullable=True))
    op.add_column('sites', sa.Column('inline_proxy_mode', sa.String(length=50), nullable=False, server_default='none'))
    op.add_column('sites', sa.Column('inline_proxy_auth', sa.String(length=50), nullable=False, server_default='none'))
    op.add_column('sites', sa.Column('inline_proxy_instructions', sa.Text(), nullable=True))
    op.add_column('sites', sa.Column('requires_user_credential', sa.Boolean(), nullable=False, server_default=text('false')))
    op.add_column('sites', sa.Column('required_credential_type', sa.String(length=50), nullable=True))
    op.add_column('sites', sa.Column('inline_console_height', sa.Integer(), nullable=True, server_default='480'))

    # User credentials table
    op.create_table(
        'user_credentials',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('credential_type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('data', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True)
    )
    op.create_index('ix_user_credentials_user_id', 'user_credentials', ['user_id'])


def downgrade():
    op.drop_index('ix_user_credentials_user_id', table_name='user_credentials')
    op.drop_table('user_credentials')

    op.drop_column('sites', 'inline_console_height')
    op.drop_column('sites', 'required_credential_type')
    op.drop_column('sites', 'requires_user_credential')
    op.drop_column('sites', 'inline_proxy_instructions')
    op.drop_column('sites', 'inline_proxy_auth')
    op.drop_column('sites', 'inline_proxy_mode')
    op.drop_column('sites', 'inline_vnc_url')
    op.drop_column('sites', 'inline_ssh_url')
    op.drop_column('sites', 'inline_web_url')

