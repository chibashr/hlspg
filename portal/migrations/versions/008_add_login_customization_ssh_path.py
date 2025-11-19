"""Add login customization fields and SSH path to sites

Revision ID: 008_login_custom_ssh
Revises: 007_add_ldap_user_group_dn
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008_login_custom_ssh'
down_revision = '007_add_ldap_user_group_dn'
branch_labels = None
depends_on = None


def upgrade():
    # Add login customization fields to webapp_config
    op.add_column('webapp_config', sa.Column('login_title', sa.String(length=255), nullable=True))
    op.add_column('webapp_config', sa.Column('login_subtitle', sa.String(length=512), nullable=True))
    op.add_column('webapp_config', sa.Column('login_description', sa.Text(), nullable=True))
    
    # Add ssh_path field to sites
    op.add_column('sites', sa.Column('ssh_path', sa.String(length=1024), nullable=True))


def downgrade():
    op.drop_column('sites', 'ssh_path')
    op.drop_column('webapp_config', 'login_description')
    op.drop_column('webapp_config', 'login_subtitle')
    op.drop_column('webapp_config', 'login_title')

