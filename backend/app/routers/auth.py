from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.audit import log_security_event
from app.core.security import (
    oauth,
    create_access_token,
    get_current_user,
    get_optional_user,
    build_google_scope,
)
from app.services.payloads import auth_me_payload
from app.seed_clubs import CLUBS as SEEDED_CLUBS
from app.utils.common import safe_json_list
from app.utils.academic_year import (
    get_effective_academic_year as _get_effective_academic_year,
    PASSOUT_YEAR_MAX_AHEAD,
)
from typing import Any, cast
import re
import json
import os
import logging
from urllib.parse import urlparse

router = APIRouter()
logger = logging.getLogger(__name__)

# Regex for student emails
STUDENT_EMAIL_REGEX = re.compile(r'.*[0-9]{4,}@ssn\.edu\.in$')

REGISTER_NUMBER_PATTERN = re.compile(r"^3122\d{9}$")
PASSOUT_YEAR_PATTERN = re.compile(r"^\d{4}$")


_NON_PRODUCTION_APP_ENVS = {"development", "dev", "local", "test", "testing"}


def _is_production_environment() -> bool:
    # Fail closed: see the matching helper in app/main.py for rationale.
    return os.getenv("APP_ENV", "production").strip().lower() not in _NON_PRODUCTION_APP_ENVS


def _parse_allowed_testing_emails() -> set[str]:
    raw_allowlist = os.getenv("DEV_TESTING_CLUB_EMAIL_ALLOWLIST", "").strip()
    if not raw_allowlist:
        return set()
    return {email.strip().lower() for email in raw_allowlist.split(",") if email.strip()}


def _is_dev_allowlisted_email(email: str) -> bool:
    if _is_production_environment():
        return False
    return email.strip().lower() in _parse_allowed_testing_emails()


# Known official club-admin mailboxes (single source of truth, shared with the
# seed script) plus any operator-configured additions. Any @ssn.edu.in address
# NOT on this list gets STUDENT by default rather than being auto-elevated to
# CLUB_ADMIN just because its local-part happens to contain no digits.
_SEEDED_CLUB_ADMIN_EMAILS = {club["email"].strip().lower() for club in SEEDED_CLUBS}


def _parse_extra_club_admin_emails() -> set[str]:
    raw_allowlist = os.getenv("CLUB_ADMIN_EMAIL_ALLOWLIST", "").strip()
    if not raw_allowlist:
        return set()
    return {email.strip().lower() for email in raw_allowlist.split(",") if email.strip()}


def _is_allowlisted_club_admin_email(email: str) -> bool:
    normalized = email.strip().lower()
    return normalized in _SEEDED_CLUB_ADMIN_EMAILS or normalized in _parse_extra_club_admin_emails()


def _resolve_new_user_role(email: str) -> str:
    """Resolve the role for a brand-new account. Only called at account creation
    time — existing users keep whatever role they already have in the database,
    so this never silently promotes or demotes an established account."""
    if STUDENT_EMAIL_REGEX.match(email):
        return "STUDENT"
    if _is_allowlisted_club_admin_email(email) or _is_dev_allowlisted_email(email):
        return "CLUB_ADMIN"
    return "STUDENT"


def _is_valid_register_number(value: str | None) -> bool:
    normalized = str(value or "").strip()
    return bool(REGISTER_NUMBER_PATTERN.fullmatch(normalized))


def _is_valid_passout_year(value: str | None) -> bool:
    normalized = str(value or "").strip()
    if not PASSOUT_YEAR_PATTERN.fullmatch(normalized):
        return False

    academic_year = _get_effective_academic_year()
    min_passout_year = academic_year
    max_passout_year = academic_year + PASSOUT_YEAR_MAX_AHEAD
    year_value = int(normalized)
    return min_passout_year <= year_value <= max_passout_year


def _parse_origin(origin: str) -> str | None:
    parsed = urlparse(origin)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def _parse_origin_list(var_name: str, default_values: list[str]) -> set[str]:
    raw_value = os.getenv(var_name, "").strip()
    values = [value.strip() for value in raw_value.split(",") if value.strip()] if raw_value else default_values

    parsed_values = set()
    for value in values:
        parsed_value = _parse_origin(value)
        if parsed_value:
            parsed_values.add(parsed_value)
    return parsed_values


FRONTEND_DEFAULT_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
default_allowed_origins = [
    FRONTEND_DEFAULT_ORIGIN,
    "http://127.0.0.1:5173",
]
FRONTEND_ALLOWED_REDIRECT_ORIGINS = _parse_origin_list("FRONTEND_ALLOWED_ORIGINS", default_allowed_origins)

parsed_default_origin = _parse_origin(FRONTEND_DEFAULT_ORIGIN)
if parsed_default_origin:
    FRONTEND_ALLOWED_REDIRECT_ORIGINS.add(parsed_default_origin)


def _resolve_configured_local_host() -> str | None:
    parsed_origin = urlparse(FRONTEND_DEFAULT_ORIGIN)
    configured_host = (parsed_origin.hostname or "").strip().lower()
    if configured_host in {"localhost", "127.0.0.1"}:
        return configured_host
    return None


CONFIGURED_LOCAL_HOST = _resolve_configured_local_host()


def _resolve_oauth_redirect_uri(request: Request) -> str:
    explicit_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if explicit_redirect_uri:
        return explicit_redirect_uri

    request_url = request.url
    request_host = (request_url.hostname or "").strip().lower()
    request_port = request_url.port
    request_scheme = request_url.scheme

    if request_host in {"localhost", "127.0.0.1"} and request_port == 5173:
        callback_host = CONFIGURED_LOCAL_HOST or request_host
        return f"{request_scheme}://{callback_host}:8000/api/auth/callback"

    return str(request.url_for('auth_callback'))


def _resolve_safe_frontend_redirect(raw_redirect: str | None) -> str | None:
    if not raw_redirect:
        return None

    redirect_value = str(raw_redirect).strip()
    if not redirect_value:
        return None

    if redirect_value.startswith('/'):
        return f"{FRONTEND_DEFAULT_ORIGIN}{redirect_value}"

    parsed_redirect = urlparse(redirect_value)
    parsed_redirect_origin = _parse_origin(redirect_value)
    if (
        parsed_redirect_origin
        and parsed_redirect_origin in FRONTEND_ALLOWED_REDIRECT_ORIGINS
        and parsed_redirect.scheme in {"http", "https"}
    ):
        return redirect_value

    return None


async def _start_google_oauth_redirect(request: Request, include_calendar_scope: bool, post_auth_redirect: str | None = None):
    redirect_uri = _resolve_oauth_redirect_uri(request)
    scope = build_google_scope(include_calendar=include_calendar_scope)
    safe_redirect = _resolve_safe_frontend_redirect(post_auth_redirect)

    if safe_redirect:
        request.session["post_auth_redirect"] = safe_redirect
    else:
        request.session.pop("post_auth_redirect", None)

    return await oauth.google.authorize_redirect(
        request,
        redirect_uri,
        scope=scope,
        access_type='offline',
        include_granted_scopes='true',
    )


@router.get('/login')
async def login(request: Request):
    """Initiates the Google OAuth2 flow."""
    next_redirect = request.query_params.get("next")
    include_calendar_scope = request.query_params.get("include_calendar", "false").lower() == "true"
    return await _start_google_oauth_redirect(
        request,
        include_calendar_scope=include_calendar_scope,
        post_auth_redirect=next_redirect,
    )


@router.get('/login/calendar')
async def login_with_calendar_scope(request: Request):
    """Request Google Calendar scope incrementally after initial sign-in."""
    next_redirect = request.query_params.get("next") or "/club/dashboard"
    return await _start_google_oauth_redirect(
        request,
        include_calendar_scope=True,
        post_auth_redirect=next_redirect,
    )


@router.get('/callback', name='auth_callback')
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    """
    Handles the callback from Google OAuth2.
    Sets a JWT cookie and redirects to frontend.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        logger.exception("OAuth callback failed while exchanging authorization code")
        log_security_event("auth.oauth.exchange_failed", client_ip=request.client.host if request.client else "unknown")
        raise HTTPException(status_code=400, detail="Authentication failed")

    user_info = token.get('userinfo')
    if not user_info:
        user_info = await oauth.google.userinfo(token=token)

    if not user_info:
        log_security_event("auth.oauth.userinfo_missing", client_ip=request.client.host if request.client else "unknown")
        raise HTTPException(status_code=400, detail="Could not retrieve user info")

    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Google account must provide an email address.")
    email = email.strip().lower()

    # Block non-SSN accounts unless they are explicitly listed test club emails.
    if not email.endswith("@ssn.edu.in") and not _is_dev_allowlisted_email(email):
        log_security_event("auth.oauth.email_rejected", email=email)
        request.session.pop("post_auth_redirect", None)
        return RedirectResponse(
            url=f"{FRONTEND_DEFAULT_ORIGIN}/login?error=ssn_email_required",
            status_code=302,
        )

    name = user_info.get('name')
    picture = user_info.get('picture')
    raw_scopes = token.get('scope', '')
    granted_scopes = sorted({scope for scope in str(raw_scopes).split() if scope})
    google_scopes_json = json.dumps(granted_scopes)

    # Upsert user. Role is only decided at account-creation time below —
    # re-deriving it from the email pattern on every login would let an
    # existing account's role flip (including auto-promoting to CLUB_ADMIN)
    # if the university ever reissues/repurposes an address, and would
    # silently demote a legitimate admin whose address isn't recognized.
    db_user = db.query(User).filter(User.email == email).first()
    user = cast(Any, db_user)
    if user is None:
        role = _resolve_new_user_role(email)
        user = User(
            email=email,
            name=name,
            role=role,
            google_token=None,
            google_scopes=google_scopes_json,
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.google_token = None
        user.google_scopes = google_scopes_json
        user.name = name
        user.picture = picture
        db.commit()

    log_security_event("auth.oauth.login_success", user_id=user.id, email=user.email, role=user.role)

    # Create JWT token
    jwt_token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "token_version": user.token_version or 0,
    })

    # Determine redirect URL
    # Club admins should go to the club dashboard flow regardless of student profile completeness fields.
    redirect_url = request.session.pop("post_auth_redirect", None)
    if not redirect_url:
        user_role = str(getattr(user, "role", "") or "")
        if user_role == "CLUB_ADMIN":
            redirect_url = f"{FRONTEND_DEFAULT_ORIGIN}/club/dashboard"
        else:
            user_interests = safe_json_list(user.interests)
            user_batch = cast(str | None, getattr(user, "batch", None))
            user_department = cast(str | None, getattr(user, "department", None))
            user_degree = cast(str | None, getattr(user, "degree", None))
            user_register_number = cast(str | None, getattr(user, "register_number", None))
            user_section = cast(str | None, getattr(user, "section", None))
            redirect_url = f"{FRONTEND_DEFAULT_ORIGIN}/student/dashboard"
            if (
                user_batch in (None, "")
                or user_department in (None, "")
                or user_degree in (None, "")
                or user_register_number in (None, "")
                or user_section in (None, "")
                or not _is_valid_passout_year(user_batch)
                or not _is_valid_register_number(user_register_number)
                or len(user_interests) < 3
            ):
                redirect_url = f"{FRONTEND_DEFAULT_ORIGIN}/student/profile"

    # Set JWT as cookie and redirect
    response = RedirectResponse(url=redirect_url, status_code=302)
    is_production = _is_production_environment()
    cookie_same_site = os.getenv("ACCESS_TOKEN_SAMESITE", "lax").strip().lower()
    if cookie_same_site not in {"lax", "strict", "none"}:
        cookie_same_site = "lax"
    if cookie_same_site == "none" and not is_production:
        cookie_same_site = "lax"

    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=is_production,
        samesite=cookie_same_site,
        max_age=7 * 24 * 3600,  # 7 days
        path="/",
    )
    return response


@router.get('/me')
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the currently authenticated user's info."""
    return auth_me_payload(current_user, db)


@router.get('/logout')
async def logout(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Revoke the current token server-side and clear the JWT cookie."""
    if current_user is not None:
        current_user.token_version = (current_user.token_version or 0) + 1
        db.commit()
        log_security_event("auth.logout", user_id=current_user.id)

    response = RedirectResponse(url=f"{FRONTEND_DEFAULT_ORIGIN}/", status_code=302)
    response.delete_cookie("access_token", path="/")
    return response
