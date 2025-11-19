"""Simplify SSO config to basic URL

Revision ID: 014_simplify_sso
Revises: 013_credential_sites
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014_simplify_sso'
down_revision = '013_credential_sites'
branch_labels = None
depends_on = None


def upgrade():
    # Add account_settings_url column if it doesn't exist
    # Check if column exists by trying to add it (will fail if exists, but we'll handle that)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('sso_config')]
    
    if 'account_settings_url' not in columns:
        op.add_column('sso_config', sa.Column('account_settings_url', sa.String(length=1024), nullable=True))
    
    # Migrate existing data: try to preserve issuer_url or sso_url as account_settings_url
    op.execute("""
        UPDATE sso_config 
        SET account_settings_url = COALESCE(issuer_url, sso_url)
        WHERE account_settings_url IS NULL 
        AND (issuer_url IS NOT NULL OR sso_url IS NOT NULL)
    """)
    
    # Drop all OIDC-related columns (only if they exist)
    columns_to_drop = [
        'provider', 'enabled', 'issuer_url', 'authorization_endpoint',
        'token_endpoint', 'userinfo_endpoint', 'client_id', 'client_secret',
        'redirect_uri', 'scopes', 'sso_url', 'realm'
    ]
    
    for col in columns_to_drop:
        if col in columns:
            op.drop_column('sso_config', col)


def downgrade():
    # Add back all OIDC-related columns
    op.add_column('sso_config', sa.Column('provider', sa.String(length=50), nullable=True, server_default='oidc'))
    op.add_column('sso_config', sa.Column('enabled', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('sso_config', sa.Column('issuer_url', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('authorization_endpoint', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('token_endpoint', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('userinfo_endpoint', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('client_id', sa.String(length=255), nullable=True))
    op.add_column('sso_config', sa.Column('client_secret', sa.Text(), nullable=True))
    op.add_column('sso_config', sa.Column('redirect_uri', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('scopes', sa.String(length=255), nullable=True, server_default='openid profile email'))
    op.add_column('sso_config', sa.Column('sso_url', sa.String(length=1024), nullable=True))
    op.add_column('sso_config', sa.Column('realm', sa.String(length=255), nullable=True))
    
    # Migrate account_settings_url back to issuer_url
    op.execute("""
        UPDATE sso_config 
        SET issuer_url = account_settings_url
        WHERE issuer_url IS NULL 
        AND account_settings_url IS NOT NULL
    """)
    
    # Drop account_settings_url column
    op.drop_column('sso_config', 'account_settings_url')

