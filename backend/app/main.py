import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.database import engine, Base, SessionLocal
from app.routers import auth, users, events, clubs, rsvp, follow
from app.core.storage import is_supabase_storage_configured
from app.core.rate_limit import InMemoryRateLimitMiddleware, RateLimitRule
from app.services.event_posters import cleanup_expired_event_posters
import os
from pathlib import Path
from dotenv import load_dotenv

# Import all models so Base.metadata.create_all picks them up
from app.models.user import User
from app.models.club import Club
from app.models.event import Event
from app.models.event_worker import EventWorker
from app.models.rsvp import RSVP
from app.models.follow import Follow
from app.models.club_member import ClubMember

load_dotenv()

# Create all tables in the database
Base.metadata.create_all(bind=engine)


def ensure_event_keywords_column() -> None:
    """Add the keywords column for older databases that were created before this field existed."""
    try:
        inspector = inspect(engine)
        if "events" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("events")}
        if "keywords" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE events ADD COLUMN keywords VARCHAR(500)"))
        print("ℹ️  Added missing 'keywords' column to events table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'keywords' column: {exc}")


def ensure_user_interests_column() -> None:
    """Add the interests column for older databases that were created before this field existed."""
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("users")}
        if "interests" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN interests TEXT"))
        print("ℹ️  Added missing 'interests' column to users table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'interests' column: {exc}")

def ensure_user_register_number_column() -> None:
    """Add the register_number column for older databases that were created before this field existed."""
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("users")}
        if "register_number" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN register_number VARCHAR(50)"))
        print("ℹ️  Added missing 'register_number' column to users table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'register_number' column: {exc}")

def ensure_user_degree_column() -> None:
    """Add the degree column for older databases that were created before this field existed."""
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("users")}
        if "degree" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN degree VARCHAR(50)"))
        print("ℹ️  Added missing 'degree' column to users table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'degree' column: {exc}")

def ensure_user_google_scopes_column() -> None:
    """Add the google_scopes column for older databases that were created before this field existed."""
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("users")}
        if "google_scopes" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN google_scopes TEXT DEFAULT '[]'"))
        print("ℹ️  Added missing 'google_scopes' column to users table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'google_scopes' column: {exc}")

def ensure_rsvp_attended_column() -> None:
    """Add the attended column for older databases that were created before this field existed."""
    try:
        inspector = inspect(engine)
        if "rsvps" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("rsvps")}
        if "attended" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE rsvps ADD COLUMN attended BOOLEAN DEFAULT 0"))
        print("ℹ️  Added missing 'attended' column to rsvps table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'attended' column: {exc}")


def ensure_rsvp_attended_marked_at_column() -> None:
    """Add the attended_marked_at column for older databases."""
    try:
        inspector = inspect(engine)
        if "rsvps" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("rsvps")}
        if "attended_marked_at" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE rsvps ADD COLUMN attended_marked_at TIMESTAMP"))
        print("ℹ️  Added missing 'attended_marked_at' column to rsvps table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'attended_marked_at' column: {exc}")


def ensure_event_attendance_qr_code_column() -> None:
    """Add the attendance_qr_code column for older databases."""
    try:
        inspector = inspect(engine)
        if "events" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("events")}
        if "attendance_qr_code" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE events ADD COLUMN attendance_qr_code VARCHAR(64)"))
        print("ℹ️  Added missing 'attendance_qr_code' column to events table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'attendance_qr_code' column: {exc}")


def ensure_event_attendance_qr_open_column() -> None:
    """Add the attendance_qr_open column for older databases."""
    try:
        inspector = inspect(engine)
        if "events" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("events")}
        if "attendance_qr_open" in existing_columns:
            return

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE events ADD COLUMN attendance_qr_open BOOLEAN DEFAULT FALSE"))
        print("ℹ️  Added missing 'attendance_qr_open' column to events table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add 'attendance_qr_open' column: {exc}")


def ensure_event_poster_columns() -> None:
    """Add poster metadata columns for Supabase Storage lifecycle if missing."""
    try:
        inspector = inspect(engine)
        if "events" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("events")}
        statements = []

        if "poster_storage_path" not in existing_columns:
            statements.append("ALTER TABLE events ADD COLUMN poster_storage_path VARCHAR(700)")
        if "poster_mime_type" not in existing_columns:
            statements.append("ALTER TABLE events ADD COLUMN poster_mime_type VARCHAR(100)")
        if "poster_size_bytes" not in existing_columns:
            statements.append("ALTER TABLE events ADD COLUMN poster_size_bytes INTEGER")
        if "poster_uploaded_at" not in existing_columns:
            statements.append("ALTER TABLE events ADD COLUMN poster_uploaded_at TIMESTAMP")
        if "poster_deleted_at" not in existing_columns:
            statements.append("ALTER TABLE events ADD COLUMN poster_deleted_at TIMESTAMP")

        if not statements:
            return

        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))

        print("ℹ️  Added missing poster metadata columns to events table")
    except Exception as exc:
        print(f"⚠️  Could not auto-add poster metadata columns: {exc}")


def normalize_legacy_cse_entries() -> None:
    """Normalize older user entries: CSE -> Computer Science and Engineering, degree -> B.E."""
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {col["name"] for col in inspector.get_columns("users")}
        if "department" not in existing_columns or "degree" not in existing_columns:
            return

        with engine.begin() as conn:
            updated = conn.execute(
                text(
                    """
                    UPDATE users
                    SET department = 'Computer Science and Engineering',
                        degree = 'B.E.'
                    WHERE lower(trim(coalesce(department, ''))) = 'cse'
                    """
                )
            )
        if updated.rowcount and updated.rowcount > 0:
            print(f"ℹ️  Normalized {updated.rowcount} legacy CSE user entries")
    except Exception as exc:
        print(f"⚠️  Could not normalize legacy CSE entries: {exc}")


ensure_event_keywords_column()
ensure_user_interests_column()
ensure_user_register_number_column()
ensure_user_degree_column()
ensure_user_google_scopes_column()
ensure_rsvp_attended_column()
ensure_rsvp_attended_marked_at_column()
ensure_event_attendance_qr_code_column()
ensure_event_attendance_qr_open_column()
ensure_event_poster_columns()
normalize_legacy_cse_entries()

app = FastAPI(
    title="WAVC API",
    description="What's Active in Various Clubs — Campus event management platform",
    version="1.0.0",
)


class ImmutableStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers.setdefault("Cache-Control", "public, max-age=31536000, immutable")
        return response


POSTER_CLEANUP_INTERVAL_MINUTES = max(1, int(os.getenv("POSTER_CLEANUP_INTERVAL_MINUTES", "15")))
_poster_cleanup_task: asyncio.Task | None = None


def _run_event_poster_cleanup_cycle() -> None:
    db = SessionLocal()
    try:
        summary = cleanup_expired_event_posters(db)
        if summary["checked"] > 0:
            print(
                "ℹ️  Event poster cleanup cycle: "
                f"checked={summary['checked']} deleted={summary['deleted']} failed={summary['failed']}"
            )
    finally:
        db.close()


async def _event_poster_cleanup_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(_run_event_poster_cleanup_cycle)
        except Exception as exc:
            print(f"⚠️  Event poster cleanup cycle failed: {exc}")

        await asyncio.sleep(POSTER_CLEANUP_INTERVAL_MINUTES * 60)


def _parse_origins_env(var_name: str, default_origins: list[str]) -> list[str]:
    raw_value = os.getenv(var_name, "").strip()
    if not raw_value:
        return default_origins
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def _parse_csv_env(var_name: str, default_values: list[str]) -> list[str]:
    raw_value = os.getenv(var_name, "").strip()
    if not raw_value:
        return default_values
    return [value.strip() for value in raw_value.split(",") if value.strip()]


def _is_production_environment() -> bool:
    return os.getenv("APP_ENV", "development").strip().lower() in {"prod", "production"}


def _require_env(var_name: str) -> str:
    value = os.getenv(var_name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {var_name}")
    return value


default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
cors_allow_origins = _parse_origins_env("CORS_ALLOW_ORIGINS", default_cors_origins)
cors_allow_methods = _parse_csv_env(
    "CORS_ALLOW_METHODS",
    ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
cors_allow_headers = _parse_csv_env(
    "CORS_ALLOW_HEADERS",
    ["Authorization", "Content-Type", "Accept", "X-CSRF-Token"],
)
is_production_environment = _is_production_environment()
session_same_site = os.getenv("SESSION_SAMESITE", "lax").strip().lower()
if session_same_site not in {"lax", "strict", "none"}:
    session_same_site = "lax"
if session_same_site == "none" and not is_production_environment:
    session_same_site = "lax"

app.add_middleware(
    InMemoryRateLimitMiddleware,
    rules=[
        RateLimitRule(path_prefix="/api/auth/callback", limit=20, window_seconds=60, methods=frozenset({"GET"})),
        RateLimitRule(path_prefix="/api/users/", limit=120, window_seconds=60, methods=frozenset({"GET", "PUT", "PATCH"})),
        RateLimitRule(path_prefix="/api/follow/users/", limit=80, window_seconds=60, methods=frozenset({"GET"})),
        RateLimitRule(path_prefix="/api/rsvp/events/", limit=100, window_seconds=60, methods=frozenset({"GET", "DELETE"})),
        RateLimitRule(path_prefix="/api/rsvp/events/", limit=60, window_seconds=60, methods=frozenset({"POST"})),
        RateLimitRule(path_prefix="/api/rsvp/rsvps/", limit=30, window_seconds=60, methods=frozenset({"PATCH"})),
    ],
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=True,
    allow_methods=cors_allow_methods,
    allow_headers=cors_allow_headers,
)

app.add_middleware(GZipMiddleware, minimum_size=1024)

# Session Middleware for OAuth state
app.add_middleware(
    SessionMiddleware,
    secret_key=_require_env("SECRET_KEY"),
    session_cookie=os.getenv("SESSION_COOKIE_NAME", "wavc_oauth_session"),
    same_site=session_same_site,
    https_only=is_production_environment,
)

# Register all routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(clubs.router, prefix="/api/clubs", tags=["clubs"])
app.include_router(rsvp.router, prefix="/api/rsvp", tags=["rsvp"])
app.include_router(follow.router, prefix="/api/follow", tags=["follow"])


@app.on_event("startup")
async def start_event_poster_cleanup_scheduler() -> None:
    global _poster_cleanup_task

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
async def stop_event_poster_cleanup_scheduler() -> None:
    global _poster_cleanup_task

    if _poster_cleanup_task is None:
        return

    _poster_cleanup_task.cancel()
    try:
        await _poster_cleanup_task
    except asyncio.CancelledError:
        pass

    _poster_cleanup_task = None


frontend_dist_dir = Path(__file__).resolve().parent / "static"
frontend_index_file = frontend_dist_dir / "index.html"
frontend_assets_dir = frontend_dist_dir / "assets"


def frontend_html_response(path: Path) -> FileResponse:
    return FileResponse(path, headers={"Cache-Control": "no-cache"})

if frontend_assets_dir.exists():
    app.mount("/assets", ImmutableStaticFiles(directory=str(frontend_assets_dir)), name="frontend-assets")


@app.get("/")
def read_root():
    if frontend_index_file.exists():
        return frontend_html_response(frontend_index_file)
    return {"message": "Welcome to the WAVC API"}


@app.get("/{full_path:path}", include_in_schema=False)
def frontend_spa_fallback(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not Found")

    if frontend_index_file.exists():
        requested_path = frontend_dist_dir / full_path
        if full_path and requested_path.is_file():
            return FileResponse(requested_path)
        return frontend_html_response(frontend_index_file)

    raise HTTPException(status_code=404, detail="Not Found")
