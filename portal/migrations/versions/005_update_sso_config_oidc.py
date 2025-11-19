"""Update SSO config to OIDC-focused

Revision ID: 005_update_sso_config_oidc
Revises: 004_add_webapp_sso_config
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_update_sso_config_oidc'
down_revision = '004_add_webapp_sso_config'
branch_labels = None
depends_on = None


def upgrade():
    # Add new OIDC-specific columns
    op.add_column('sso_config', sa.Column('issuer_url', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('authorization_endpoint', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('token_endpoint', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('userinfo_endpoint', sa.String(length=1024), nullable=True))
    
    # Update default provider to 'oidc'
    op.execute("UPDATE sso_config SET provider = 'oidc' WHERE provider = 'keycloak' OR provider IS NULL")
    
    # Migrate sso_url to issuer_url for existing records
    op.execute("UPDATE sso_config SET issuer_url = sso_url WHERE issuer_url IS NULL AND sso_url IS NOT NULL")


def downgrade():
    # Migrate issuer_url back to sso_url
    op.execute("UPDATE sso_config SET sso_url = issuer_url WHERE sso_url IS NULL AND issuer_url IS NOT NULL")
    
    # Remove new columns
    op.drop_column('sso_config', 'userinfo_endpoint')
    op.drop_column('sso_config', 'token_endpoint')
    op.drop_column('sso_config', 'authorization_endpoint')
    op.drop_column('sso_config', 'issuer_url')

