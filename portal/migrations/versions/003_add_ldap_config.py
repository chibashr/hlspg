"""Add LDAP configuration table

Revision ID: 003
Revises: 002
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_ldap_config'
down_revision = '002_add_password_hash'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ldap_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ldap_url', sa.String(length=1024), nullable=True),
        sa.Column('ldap_use_tls', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('ldap_bind_dn', sa.String(length=1024), nullable=True),
        sa.Column('ldap_bind_password', sa.Text(), nullable=True),
        sa.Column('ldap_base_dn', sa.String(length=1024), nullable=True),
        sa.Column('ldap_user_filter', sa.String(length=1024), nullable=True),
        sa.Column('ldap_group_attribute', sa.String(length=255), nullable=True, server_default='memberOf'),
        sa.Column('ldap_ca_cert_path', sa.String(length=1024), nullable=True),
        sa.Column('ldap_search_timeout', sa.Integer(), nullable=True, server_default='5'),
        sa.Column('enabled', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('id = 1', name='single_ldap_config')
    )


def downgrade():
    op.drop_table('ldap_config')

