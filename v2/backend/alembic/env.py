from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import URL, create_engine

from alembic import context

from app.core.config import settings
from app.core.database import Base

import app.models  # noqa


# Alembic Config object
config = context.config


# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# SQLAlchemy metadata for autogenerate
target_metadata = Base.metadata




def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    This configures Alembic with a database URL but does not establish
    an actual database connection.
    """
    context.configure(
        url=settings.DATABASE_SYNC_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in online mode.

    Uses SQLAlchemy URL.create() so PostgreSQL passwords containing
    special characters are handled safely.
    """
    connectable = create_engine(
        settings.DATABASE_SYNC_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()