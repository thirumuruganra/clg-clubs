import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect as sa_inspect, text
from starlette.middleware.sessions import SessionMiddleware
from app.database import engine, Base, async_session_factory
from app.routers import auth, users, events, clubs, rsvp, follow
from app.core.storage import is_supabase_storage_configured
from app.services.event_posters import cleanup_expired_event_posters
import os
from pathlib import Path
from dotenv import load_dotenv

# Import all models so Base.metadata.create_all picks them up
from app.models.user import User
from app.models.club import Club
from app.models.event import Event
from app.models.rsvp import RSVP
from app.models.follow import Follow

load_dotenv()


# ---------------------------------------------------------------------------
# Async startup helpers — schema inspection & column back-fills
# ---------------------------------------------------------------------------

async def _async_create_tables() -> None:
    """Create all ORM tables if they don't exist yet."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _ensure_column(table: str, column: str, col_type: str) -> None:
    """Add *column* to *table* if it is missing (idempotent)."""
    def _check_and_add(sync_conn):
        inspector = sa_inspect(sync_conn)
        if table not in inspector.get_table_names():
            return
        existing = {col["name"] for col in inspector.get_columns(table)}
        if column in existing:
            return
        sync_conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
        print(f"ℹ️  Added missing '{column}' column to {table} table")

    try:
        async with engine.begin() as conn:
            await conn.run_sync(_check_and_add)
    except Exception as exc:
        print(f"⚠️  Could not auto-add '{column}' to {table}: {exc}")


async def _ensure_event_poster_columns() -> None:
    """Add all poster metadata columns in one pass."""
    poster_cols = [
        ("poster_storage_path", "VARCHAR(700)"),
        ("poster_mime_type", "VARCHAR(100)"),
        ("poster_size_bytes", "INTEGER"),
        ("poster_uploaded_at", "TIMESTAMP"),
        ("poster_deleted_at", "TIMESTAMP"),
    ]

    def _check_and_add(sync_conn):
        inspector = sa_inspect(sync_conn)
        if "events" not in inspector.get_table_names():
            return
        existing = {col["name"] for col in inspector.get_columns("events")}
        added = []
        for col_name, col_type in poster_cols:
            if col_name not in existing:
                sync_conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
                added.append(col_name)
        if added:
            print(f"ℹ️  Added missing poster metadata columns to events table: {', '.join(added)}")

    try:
        async with engine.begin() as conn:
            await conn.run_sync(_check_and_add)
    except Exception as exc:
        print(f"⚠️  Could not auto-add poster metadata columns: {exc}")


async def _normalize_legacy_cse_entries() -> None:
    """Normalize older user entries: CSE -> Computer Science and Engineering, degree -> B.E."""
    def _run(sync_conn):
        inspector = sa_inspect(sync_conn)
        if "users" not in inspector.get_table_names():
            return
        existing = {col["name"] for col in inspector.get_columns("users")}
        if "department" not in existing or "degree" not in existing:
            return
        result = sync_conn.execute(
            text(
                """
                UPDATE users
                SET department = 'Computer Science and Engineering',
                    degree = 'B.E.'
                WHERE lower(trim(coalesce(department, ''))) = 'cse'
                """
            )
        )
        if result.rowcount and result.rowcount > 0:
            print(f"ℹ️  Normalized {result.rowcount} legacy CSE user entries")

    try:
        async with engine.begin() as conn:
            await conn.run_sync(_run)
    except Exception as exc:
        print(f"⚠️  Could not normalize legacy CSE entries: {exc}")


async def _run_all_startup_migrations() -> None:
    await _async_create_tables()
    await _ensure_column("events",  "keywords",              "VARCHAR(500)")
    await _ensure_column("users",   "interests",             "TEXT")
    await _ensure_column("users",   "register_number",       "VARCHAR(50)")
    await _ensure_column("users",   "degree",                "VARCHAR(50)")
    await _ensure_column("users",   "google_scopes",         "TEXT DEFAULT '[]'")
    await _ensure_column("rsvps",   "attended",              "BOOLEAN DEFAULT 0")
    await _ensure_column("rsvps",   "attended_marked_at",    "TIMESTAMP")
    await _ensure_column("events",  "attendance_qr_code",    "VARCHAR(64)")
    await _ensure_column("events",  "attendance_qr_open",    "BOOLEAN DEFAULT FALSE")
    await _ensure_event_poster_columns()
    await _normalize_legacy_cse_entries()
    print("✅  Connected to PostgreSQL (asyncpg) and startup migrations complete")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="WAVC API",
    description="What's Active in Various Clubs — Campus event management platform",
    version="1.0.0",
)


POSTER_CLEANUP_INTERVAL_MINUTES = max(1, int(os.getenv("POSTER_CLEANUP_INTERVAL_MINUTES", "15")))
_poster_cleanup_task: asyncio.Task | None = None


async def _run_event_poster_cleanup_cycle() -> None:
    async with async_session_factory() as db:
        try:
            summary = await cleanup_expired_event_posters(db)
            if summary["checked"] > 0:
                print(
                    "ℹ️  Event poster cleanup cycle: "
                    f"checked={summary['checked']} deleted={summary['deleted']} failed={summary['failed']}"
                )
        finally:
            await db.close()


async def _event_poster_cleanup_loop() -> None:
    while True:
        try:
            await _run_event_poster_cleanup_cycle()
        except Exception as exc:
            print(f"⚠️  Event poster cleanup cycle failed: {exc}")

        await asyncio.sleep(POSTER_CLEANUP_INTERVAL_MINUTES * 60)


def _parse_origins_env(var_name: str, default_origins: list[str]) -> list[str]:
    raw_value = os.getenv(var_name, "").strip()
    if not raw_value:
        return default_origins
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
cors_allow_origins = _parse_origins_env("CORS_ALLOW_ORIGINS", default_cors_origins)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session Middleware for OAuth state
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "wavc-secret-key"),
    session_cookie=os.getenv("SESSION_COOKIE_NAME", "wavc_oauth_session"),
    same_site="lax",
    https_only=False,
)

# Register all routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(clubs.router, prefix="/api/clubs", tags=["clubs"])
app.include_router(rsvp.router, prefix="/api/rsvp", tags=["rsvp"])
app.include_router(follow.router, prefix="/api/follow", tags=["follow"])


@app.on_event("startup")
async def on_startup() -> None:
    global _poster_cleanup_task

    await _run_all_startup_migrations()

    if not is_supabase_storage_configured():
        print(
            "ℹ️  Event poster cleanup scheduler is disabled because Supabase Storage "
            "environment variables are not fully configured."
        )
        return

    if _poster_cleanup_task is None or _poster_cleanup_task.done():
        _poster_cleanup_task = asyncio.create_task(_event_poster_cleanup_loop())
        print(
            "ℹ️  Event poster cleanup scheduler started "
            f"(interval={POSTER_CLEANUP_INTERVAL_MINUTES} minutes)"
        )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _poster_cleanup_task

    if _poster_cleanup_task is None:
        return

    _poster_cleanup_task.cancel()
    try:
        await _poster_cleanup_task
    except asyncio.CancelledError:
        pass

    _poster_cleanup_task = None
    await engine.dispose()


frontend_dist_dir = Path(__file__).resolve().parent / "static"
frontend_index_file = frontend_dist_dir / "index.html"
frontend_assets_dir = frontend_dist_dir / "assets"

if frontend_assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_assets_dir)), name="frontend-assets")


@app.get("/")
def read_root():
    if frontend_index_file.exists():
        return FileResponse(frontend_index_file)
    return {"message": "Welcome to the WAVC API"}


@app.get("/{full_path:path}", include_in_schema=False)
def frontend_spa_fallback(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not Found")

    if frontend_index_file.exists():
        requested_path = frontend_dist_dir / full_path
        if full_path and requested_path.is_file():
            return FileResponse(requested_path)
        return FileResponse(frontend_index_file)

    raise HTTPException(status_code=404, detail="Not Found")
