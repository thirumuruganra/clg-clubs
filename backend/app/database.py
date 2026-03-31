from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
# Supports MySQL: mysql+pymysql://user:password@host:port/database
# Falls back to SQLite if DATABASE_URL is not set or MySQL is unavailable
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    try:
        engine = create_engine(DATABASE_URL)
        # Quick test to verify connection
        with engine.connect() as conn:
            pass
        print(f"✅ Connected to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    except Exception as e:
        print(f"⚠️  Could not connect to {DATABASE_URL}: {e}")
        print("⚠️  Falling back to SQLite...")
        DATABASE_URL = "sqlite:///./wavc_app.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Default: SQLite for local development
    DATABASE_URL = "sqlite:///./wavc_app.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print("ℹ️  Using SQLite database (set DATABASE_URL env var for MySQL)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
