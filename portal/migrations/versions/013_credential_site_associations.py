"""Add credential-site associations

Revision ID: 013_credential_sites
Revises: 012_inline_console_proxy
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013_credential_sites'
down_revision = '012_inline_console_proxy'
branch_labels = None
depends_on = None


def upgrade():
    # Create association table for credential-site relationships
    op.create_table(
        'credential_site_associations',
        sa.Column('credential_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['credential_id'], ['user_credentials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('credential_id', 'site_id')
    )
    op.create_index('ix_credential_site_credential_id', 'credential_site_associations', ['credential_id'])
    op.create_index('ix_credential_site_site_id', 'credential_site_associations', ['site_id'])


def downgrade():
    op.drop_index('ix_credential_site_site_id', table_name='credential_site_associations')
    op.drop_index('ix_credential_site_credential_id', table_name='credential_site_associations')
    op.drop_table('credential_site_associations')

