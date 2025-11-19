"""Add LDAP User DN and Group DN

Revision ID: 007_add_ldap_user_group_dn
Revises: 006_add_ldap_group_filter
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007_add_ldap_user_group_dn'
down_revision = '006_add_ldap_group_filter'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ldap_config', sa.Column('ldap_user_dn', sa.String(length=1024), nullable=True))
    op.add_column('ldap_config', sa.Column('ldap_group_dn', sa.String(length=1024), nullable=True))


def downgrade():
    op.drop_column('ldap_config', 'ldap_group_dn')
    op.drop_column('ldap_config', 'ldap_user_dn')

