from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env explicitly so uvicorn reload subprocesses resolve env consistently.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _build_postgres_url() -> str:
    """Build PostgreSQL asyncpg URL from env vars when DATABASE_URL is not provided."""
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        # Normalise legacy scheme variants to postgresql+asyncpg://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        if database_url.startswith("postgresql+psycopg2://"):
            database_url = database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        elif database_url.startswith("postgresql://") and "+asyncpg" not in database_url:
            database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return database_url

    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "wavc_app")

    if password:
        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}"
    return f"postgresql+asyncpg://{user}@{host}:{port}/{database}"


# Async database URL (postgresql+asyncpg://...)
DATABASE_URL = _build_postgres_url()

if not DATABASE_URL.startswith("postgresql+asyncpg"):
    raise RuntimeError(
        "DATABASE_URL must point to PostgreSQL via asyncpg "
        "(e.g. postgresql+asyncpg://user:pass@host:port/db)."
    )

# Async engine — used for all runtime queries.
engine = create_async_engine(
    DATABASE_URL,
    # Connection pool tuning
    pool_size=10,        # Number of persistent connections in the pool
    max_overflow=20,     # Extra connections allowed when pool is saturated
    pool_pre_ping=True,  # Validate connection before checkout (drops stale/dead conns)
    pool_recycle=1800,   # Recycle connections every 30 min to avoid idle timeout drops
    pool_timeout=30,     # Raise an error if no connection available within 30 s
    echo=False,
)

# Async session factory
async_session_factory = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()


async def get_db():
    """FastAPI dependency that yields an AsyncSession per request."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
