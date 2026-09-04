from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID
from urllib.parse import urlparse
import re

try:
    from pydantic import field_validator
except ImportError:  # pragma: no cover
    from pydantic import validator as field_validator


INSTAGRAM_HANDLE_PATTERN = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def _validate_http_url(value: Optional[str], field_name: str) -> Optional[str]:
    if value is None:
        return None

    normalized = str(value).strip()
    if not normalized:
        return None

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field_name} must be a valid http/https URL")

    return normalized


def _validate_instagram_handle(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized = str(value).strip()
    if not normalized:
        return None

    if normalized.startswith("@"):
        normalized = normalized[1:]

    if not INSTAGRAM_HANDLE_PATTERN.fullmatch(normalized):
        raise ValueError("instagram_handle must contain only letters, numbers, dots, or underscores")

    return normalized.lower()


# ===== USER SCHEMAS =====

class UserUpdate(BaseModel):
    batch: Optional[str] = None
    department: Optional[str] = None
    degree: Optional[str] = None
    register_number: Optional[str] = None
    section: Optional[str] = None
    interests: Optional[List[str]] = None


# ===== CLUB SCHEMAS =====

class ClubBase(BaseModel):
    name: str
    category: str                          # "TECH" or "NON_TECH"
    logo_url: Optional[str] = None
    instagram_handle: Optional[str] = None

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: Optional[str]) -> Optional[str]:
        return _validate_http_url(value, "logo_url")

    @field_validator("instagram_handle")
    @classmethod
    def validate_instagram_handle(cls, value: Optional[str]) -> Optional[str]:
        return _validate_instagram_handle(value)

class ClubCreate(ClubBase):
    pass

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[str] = None
    instagram_handle: Optional[str] = None

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: Optional[str]) -> Optional[str]:
        return _validate_http_url(value, "logo_url")

    @field_validator("instagram_handle")
    @classmethod
    def validate_instagram_handle(cls, value: Optional[str]) -> Optional[str]:
        return _validate_instagram_handle(value)

# ===== EVENT SCHEMAS =====

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None          # Short description (max 100 words)
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    tag: Optional[str] = None              # "TECH" or "NON_TECH"
    image_url: Optional[str] = None
    keywords: Optional[str] = None
    payment_link: Optional[str] = None
    is_paid: Optional[bool] = False
    registration_fees: Optional[str] = None
    collect_feedback: Optional[bool] = False

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, value: Optional[str]) -> Optional[str]:
        return _validate_http_url(value, "image_url")

    @field_validator("payment_link")
    @classmethod
    def validate_payment_link(cls, value: Optional[str]) -> Optional[str]:
        return _validate_http_url(value, "payment_link")

class EventCreate(EventBase):
    club_id: UUID

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    tag: Optional[str] = None
    image_url: Optional[str] = None
    keywords: Optional[str] = None
    payment_link: Optional[str] = None
    is_paid: Optional[bool] = None
    registration_fees: Optional[str] = None
    collect_feedback: Optional[bool] = None

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, value: Optional[str]) -> Optional[str]:
        return _validate_http_url(value, "image_url")

    @field_validator("payment_link")
    @classmethod
    def validate_payment_link(cls, value: Optional[str]) -> Optional[str]:
        return _validate_http_url(value, "payment_link")


# ===== RSVP SCHEMAS =====

class RSVPUpdate(BaseModel):
    attended: Optional[bool] = None
    is_paid: Optional[bool] = None


class EventFeedbackEntryResponse(BaseModel):
    rsvp_id: UUID
    user_id: UUID
    name: Optional[str] = None
    email: str
    degree: Optional[str] = None
    batch: Optional[str] = None
    register_number: Optional[str] = None
    feedback_text: str
    attended_marked_at: Optional[datetime] = None


class EventFeedbackListResponse(BaseModel):
    event_id: UUID
    feedback_count: int
    responses: List[EventFeedbackEntryResponse]


# ===== CLUB MEMBER SCHEMAS =====

class ClubMemberCreate(BaseModel):
    user_id: UUID


class ClubMemberAdminAccessUpdate(BaseModel):
    is_delegated_admin: bool


# ===== EVENT WORKFORCE SCHEMAS =====

class EventWorkforceCreate(BaseModel):
    user_id: UUID
    role: Literal["CLUB_MEMBER", "VOLUNTEER"]
