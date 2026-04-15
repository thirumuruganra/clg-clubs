"""
Alembic migration environment — configured for asyncpg + SQLAlchemy async engine.

Key design choices:
- Uses asyncio run_sync so autogenerate can inspect the live schema.
- Imports all ORM models so Base.metadata is fully populated before comparison.
- Loads DATABASE_URL from backend/.env via app.database to stay DRY.
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ── Load our app config ──────────────────────────────────────────────────────
# Import database module first so env vars are loaded from .env
from app.database import DATABASE_URL, Base  # noqa: E402

# Import every model so Base.metadata is fully populated for autogenerate
from app.models.user import User       # noqa: F401
from app.models.club import Club       # noqa: F401
from app.models.event import Event     # noqa: F401
from app.models.rsvp import RSVP      # noqa: F401
from app.models.follow import Follow   # noqa: F401

# ── Alembic Config object ────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from our runtime DATABASE_URL (loaded from .env)
# This replaces the placeholder in alembic.ini with the real asyncpg URL.
config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = Base.metadata


# ── Offline migrations (no live DB connection) ───────────────────────────────
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generate SQL without connecting."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (connect to live DB via asyncpg) ───────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations via run_sync."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
