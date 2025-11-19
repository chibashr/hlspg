"""Alembic environment configuration."""
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.db import db
from app.models import *  # noqa: F401, F403
from app.config import Config

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
# alembic.ini is in the parent directory (optional - migrations will work without it)
try:
    if config.config_file_name is not None:
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'alembic.ini')
        if os.path.exists(config_path):
            fileConfig(config_path)
except Exception:
    # Logging config is optional - continue without it
    pass

# Get database URL from Flask config
# Create app without bootstrap to avoid table dependency issues during migrations
app = create_app()
# Temporarily disable bootstrap during migration setup
with app.app_context():
    config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])

# add your model's MetaData object here
target_metadata = db.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

