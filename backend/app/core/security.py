from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
import os
from typing import Iterable

GOOGLE_BASE_SCOPES = "openid email profile"
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"


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
SECRET_KEY = os.getenv("SECRET_KEY", "wavc-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
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
        return None


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    """FastAPI dependency: extract user from JWT cookie."""
    from app.models.user import User

    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
