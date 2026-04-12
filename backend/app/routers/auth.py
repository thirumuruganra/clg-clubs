from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import (
    oauth,
    create_access_token,
    get_current_user,
    GOOGLE_CALENDAR_SCOPE,
    build_google_scope,
)
import re
import json
import os
from urllib.parse import urlparse

router = APIRouter()


def _safe_json_list(raw_value):
    if not raw_value:
        return []
    try:
        data = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []

# Allowed club admin emails (in production, move to DB table)
ALLOWED_CLUB_EMAILS = {
    # Test account
    "thirumuruganra@gmail.com",
    "vishmuralee1006@gmail.com",
    "tanisha.sriram2006@gmail.com",
    # Club accounts
    "codingclub@ssn.edu.in",
    "lakshya@ssn.edu.in",
    "ieeecs-ssn@ssn.edu.in",
    "ssnieeewie@ssn.edu.in",
    "ssnmusiclub@ssn.edu.in",
    "acm-w@ssn.edu.in",
    "ssnelc@ssn.edu.in",
    "ssnacm@ssn.edu.in",
    "buildclub@ssn.edu.in",
    "sportium@ssn.edu.in",
    "saeclub@ssn.edu.in",
    "ssnieeevts@ssn.edu.in",
    "sgc@ssn.edu.in",
    "qfactorial@ssn.edu.in",
    "filmclub@ssn.edu.in",
    "ieeepels@ssn.edu.in",
    "ieeepes@ssn.edu.in",
    "gfgcampusbody@ssn.edu.in",
    "ieeespssb@ssn.edu.in",
    "saaraltamilmandram@ssn.edu.in",
}

# Regex for student emails
STUDENT_EMAIL_REGEX = re.compile(r'.*[0-9]{4,}@ssn\.edu\.in$')

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
    redirect_uri = request.url_for('auth_callback')
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
    except Exception as e:
        raise HTTPException(status_code=400, detail="OAuth Error: " + str(e))

    user_info = token.get('userinfo')
    if not user_info:
        user_info = await oauth.google.userinfo(token=token)

    if not user_info:
        raise HTTPException(status_code=400, detail="Could not retrieve user info")

    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Google account must provide an email address.")
        
    name = user_info.get('name')
    picture = user_info.get('picture')
    google_token = token.get('access_token')
    raw_scopes = token.get('scope', '')
    granted_scopes = sorted({scope for scope in str(raw_scopes).split() if scope})
    google_scopes_json = json.dumps(granted_scopes)

    # Determine Role via regex
    role = "STUDENT"
    if STUDENT_EMAIL_REGEX.match(email):
        role = "STUDENT"
    elif email in ALLOWED_CLUB_EMAILS:
        role = "CLUB_ADMIN"

    # Upsert user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=name,
            role=role,
            google_token=google_token,
            google_scopes=google_scopes_json,
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.google_token = google_token
        user.google_scopes = google_scopes_json
        user.name = name
        user.picture = picture
        user.role = role
        db.commit()

    # Create JWT token
    jwt_token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    # Determine redirect URL
    # Club admins should go to the club dashboard flow regardless of student profile completeness fields.
    redirect_url = request.session.pop("post_auth_redirect", None)
    if not redirect_url:
        if user.role == "CLUB_ADMIN":
            redirect_url = f"{FRONTEND_DEFAULT_ORIGIN}/club/dashboard"
        else:
            user_interests = _safe_json_list(user.interests)
            redirect_url = f"{FRONTEND_DEFAULT_ORIGIN}/student/dashboard"
            if not user.batch or not user.department or not user.degree or not user.register_number or len(user_interests) < 3:
                redirect_url = f"{FRONTEND_DEFAULT_ORIGIN}/student/profile"

    # Set JWT as cookie and redirect
    response = RedirectResponse(url=redirect_url, status_code=302)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=False,       # Frontend needs to read it for API calls
        samesite="lax",
        max_age=7 * 24 * 3600,  # 7 days
        path="/",
    )
    return response


@router.get('/me')
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's info."""
    joined_clubs_list = _safe_json_list(current_user.joined_clubs)
    interests_list = _safe_json_list(current_user.interests)
    granted_scopes_list = _safe_json_list(current_user.google_scopes)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "role": current_user.role,
        "batch": current_user.batch,
        "department": current_user.department,
        "degree": current_user.degree,
        "register_number": current_user.register_number,
        "joined_clubs": joined_clubs_list,
        "interests": interests_list,
        "google_scopes": granted_scopes_list,
        "has_google_calendar_access": GOOGLE_CALENDAR_SCOPE in granted_scopes_list,
    }


@router.get('/logout')
async def logout(request: Request):
    """Clear the JWT cookie and redirect to landing."""
    response = RedirectResponse(url=f"{FRONTEND_DEFAULT_ORIGIN}/", status_code=302)
    response.delete_cookie("access_token", path="/")
    return response
