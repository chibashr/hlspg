"""Add webapp and SSO configuration tables

Revision ID: 004_add_webapp_sso_config
Revises: 003_add_ldap_config
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_webapp_sso_config'
down_revision = '003_add_ldap_config'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'webapp_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('app_title', sa.String(length=255), nullable=True, server_default='HLSPG Portal'),
        sa.Column('page_title', sa.String(length=255), nullable=True, server_default='Home Lab Single Pane of Glass'),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('primary_color', sa.String(length=7), nullable=True, server_default='#1976d2'),
        sa.Column('secondary_color', sa.String(length=7), nullable=True, server_default='#dc004e'),
        sa.Column('logo_url', sa.String(length=1024), nullable=True),
        sa.Column('favicon_url', sa.String(length=1024), nullable=True),
        sa.Column('footer_text', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('id = 1', name='single_webapp_config')
    )
    
    op.create_table(
        'sso_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=True, server_default='keycloak'),
        sa.Column('enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('sso_url', sa.String(length=1024), nullable=True),
        sa.Column('realm', sa.String(length=255), nullable=True),
        sa.Column('client_id', sa.String(length=255), nullable=True),
        sa.Column('client_secret', sa.Text(), nullable=True),
        sa.Column('redirect_uri', sa.String(length=1024), nullable=True),
        sa.Column('scopes', sa.String(length=255), nullable=True, server_default='openid profile email'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('id = 1', name='single_sso_config')
    )


def downgrade():
    op.drop_table('sso_config')
    op.drop_table('webapp_config')

