"""Add LDAP group filter

Revision ID: 006_add_ldap_group_filter
Revises: 005_update_sso_config_oidc
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_add_ldap_group_filter'
down_revision = '005_update_sso_config_oidc'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ldap_config', sa.Column('ldap_group_filter', sa.String(length=1024), nullable=True))


def downgrade():
    op.drop_column('ldap_config', 'ldap_group_filter')

