from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env explicitly so uvicorn reload subprocesses resolve env consistently.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _build_postgres_url() -> str:
    """Build PostgreSQL URL from env vars when DATABASE_URL is not provided."""
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        # Some providers use postgres:// while SQLAlchemy expects postgresql://.
        if database_url.startswith("postgres://"):
            return database_url.replace("postgres://", "postgresql://", 1)
        return database_url

    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "wavc_app")

    if password:
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"
    return f"postgresql+psycopg2://{user}@{host}:{port}/{database}"

# Database connection
# PostgreSQL URL format: postgresql+psycopg2://user:password@host:port/database
DATABASE_URL = _build_postgres_url()

if not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError(
        "DATABASE_URL must point to PostgreSQL (use postgresql:// or postgresql+psycopg2://)."
    )

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    # Quick test to verify connection
    with engine.connect() as conn:
        pass
    print("Connected to PostgreSQL database")
except Exception as e:
    raise RuntimeError(
        "Could not connect to PostgreSQL database. "
        "Set valid credentials using DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_HOST/POSTGRES_PORT/POSTGRES_DB in backend/.env. "
        f"Original error: {e}"
    ) from e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
