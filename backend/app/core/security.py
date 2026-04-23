from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
import os
import logging
from typing import Iterable
from uuid import UUID

GOOGLE_BASE_SCOPES = "openid email profile"
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"
AUTH_ERROR_DETAIL = "Authentication required"

logger = logging.getLogger(__name__)


def build_google_scope(include_calendar: bool = False, extra_scopes: Iterable[str] | None = None) -> str:
    """Build a deterministic Google OAuth scope string."""
    scopes = GOOGLE_BASE_SCOPES.split()
    if include_calendar:
        scopes.append(GOOGLE_CALENDAR_SCOPE)
    if extra_scopes:
        scopes.extend([scope for scope in extra_scopes if scope])

    ordered_unique_scopes = list(dict.fromkeys(scopes))
    return " ".join(ordered_unique_scopes)

# OAuth setup
config = Config('.env')

oauth = OAuth(config)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': build_google_scope(include_calendar=False),
    }
)

# JWT Configuration
def _require_env_value(var_name: str) -> str:
    value = os.getenv(var_name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {var_name}")
    return value


SECRET_KEY = _require_env_value("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    user_id = to_encode.get("user_id")
    if isinstance(user_id, UUID):
        to_encode["user_id"] = str(user_id)
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        logger.info("JWT decode failed")
        return None


def _resolve_user_from_token(token: str | None, db: Session):
    from app.models.user import User

    if not token:
        return None

    payload = verify_token(token)
    if not payload:
        return None

    user_id_raw = payload.get("user_id")
    if not user_id_raw:
        return None

    try:
        user_id = UUID(str(user_id_raw))
    except ValueError:
        return None

    return db.query(User).filter(User.id == user_id).first()


def get_current_user(request: Request, db: Session = Depends(get_db)):
    """FastAPI dependency: extract user from JWT cookie."""
    token = request.cookies.get("access_token")
    user = _resolve_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail=AUTH_ERROR_DETAIL)

    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)):
    """Return authenticated user when present; otherwise return None."""
    token = request.cookies.get("access_token")
    user = _resolve_user_from_token(token, db)
    if user is None:
        return None

    return user
