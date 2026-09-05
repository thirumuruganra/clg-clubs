from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.database import engine, Base, get_db
from app.routers import auth, users, events, clubs, rsvp, follow, internal
from app.core.rate_limit import InMemoryRateLimitMiddleware, RateLimitRule
from app.utils.common import parse_csv_env, is_production_environment, require_env
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


app = FastAPI(
    title="WAVC API",
    description="What's Active in Various Clubs — Campus event management platform",
    version="1.0.0",
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach baseline security headers to every response."""

    _CSP = (
        "default-src 'self'; "
        "script-src 'self'; "
        "script-src-attr 'unsafe-inline'; "
        "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
        "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'"
    )

    def __init__(self, app, *, https_only: bool) -> None:
        super().__init__(app)
        self._https_only = https_only

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
        response.headers.setdefault("Content-Security-Policy", self._CSP)
        if self._https_only:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
            )
        return response


class ImmutableStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers.setdefault("Cache-Control", "public, max-age=31536000, immutable")
        return response


default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
cors_allow_origins = parse_csv_env("CORS_ALLOW_ORIGINS", default_cors_origins)
cors_allow_methods = parse_csv_env(
    "CORS_ALLOW_METHODS",
    ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
cors_allow_headers = parse_csv_env(
    "CORS_ALLOW_HEADERS",
    ["Authorization", "Content-Type", "Accept", "X-CSRF-Token"],
)
app_is_production = is_production_environment()
session_same_site = os.getenv("SESSION_SAMESITE", "lax").strip().lower()
if session_same_site not in {"lax", "strict", "none"}:
    session_same_site = "lax"
if session_same_site == "none" and not app_is_production:
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
        # Club/event mutation + file-upload endpoints were previously unlimited,
        # allowing an authenticated account to hammer Supabase Storage or spam
        # event/club creation with no throttle.
        RateLimitRule(path_prefix="/api/events/", limit=40, window_seconds=60, methods=frozenset({"POST", "PUT", "DELETE"})),
        RateLimitRule(path_prefix="/api/clubs/", limit=30, window_seconds=60, methods=frozenset({"POST", "PUT"})),
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
    secret_key=require_env("SECRET_KEY"),
    session_cookie=os.getenv("SESSION_COOKIE_NAME", "wavc_oauth_session"),
    same_site=session_same_site,
    https_only=app_is_production,
)

# Outermost middleware so headers land on every response, including
# rate-limit 429s, CORS preflights, and error responses.
app.add_middleware(SecurityHeadersMiddleware, https_only=app_is_production)

# Register all routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(clubs.router, prefix="/api/clubs", tags=["clubs"])
app.include_router(rsvp.router, prefix="/api/rsvp", tags=["rsvp"])
app.include_router(follow.router, prefix="/api/follow", tags=["follow"])
app.include_router(internal.router, prefix="/api/internal", tags=["internal"])


@app.get("/e/{code}", include_in_schema=False)
def short_link_redirect(code: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.short_code == code).first()
    event_id = event.id if event else code
    return RedirectResponse(url=f"/event?id={event_id}", status_code=302)


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
