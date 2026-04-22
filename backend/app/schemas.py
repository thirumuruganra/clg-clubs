from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


# ===== USER SCHEMAS =====

class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    role: Optional[str] = "STUDENT"
    picture: Optional[str] = None
    batch: Optional[str] = None
    department: Optional[str] = None
    degree: Optional[str] = None
    register_number: Optional[str] = None
    joined_clubs: Optional[List[str]] = []
    interests: Optional[List[str]] = []

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: UUID

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    batch: Optional[str] = None
    department: Optional[str] = None
    degree: Optional[str] = None
    register_number: Optional[str] = None
    joined_clubs: Optional[List[str]] = None
    interests: Optional[List[str]] = None


# ===== CLUB SCHEMAS =====

class ClubBase(BaseModel):
    name: str
    category: str                          # "TECH" or "NON_TECH"
    logo_url: Optional[str] = None
    instagram_handle: Optional[str] = None

class ClubCreate(ClubBase):
    pass

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[str] = None
    instagram_handle: Optional[str] = None

class ClubResponse(ClubBase):
    id: UUID
    admin_id: UUID
    icon_url: Optional[str] = None
    admin_picture: Optional[str] = None
    follower_count: Optional[int] = 0
    is_following: Optional[bool] = False

    class Config:
        from_attributes = True


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

class EventResponse(EventBase):
    id: UUID
    club_id: UUID
    club_name: Optional[str] = None
    rsvp_count: Optional[int] = 0
    is_rsvped: Optional[bool] = False

    class Config:
        from_attributes = True


# ===== RSVP SCHEMAS =====

class RSVPCreate(BaseModel):
    event_id: UUID

class RSVPUpdate(BaseModel):
    attended: Optional[bool] = None
    is_paid: Optional[bool] = None

class RSVPResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    attended: Optional[bool] = False
    attended_marked_at: Optional[datetime] = None
    is_paid: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class EventRSVPUserResponse(BaseModel):
    id: UUID
    name: Optional[str] = None
    email: str
    department: Optional[str] = None
    degree: Optional[str] = None
    batch: Optional[str] = None
    register_number: Optional[str] = None

class EventRSVPResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    attended: Optional[bool] = False
    attended_marked_at: Optional[datetime] = None
    is_paid: Optional[bool] = False
    created_at: datetime
    user: EventRSVPUserResponse

    class Config:
        from_attributes = True


# ===== FOLLOW SCHEMAS =====

class FollowCreate(BaseModel):
    club_id: UUID

class FollowResponse(BaseModel):
    id: UUID
    user_id: UUID
    club_id: UUID

    class Config:
        from_attributes = True


# ===== CLUB MEMBER SCHEMAS =====

class ClubMemberCreate(BaseModel):
    user_id: UUID


class ClubMemberResponse(BaseModel):
    id: UUID
    club_id: UUID
    user_id: UUID
    created_at: Optional[datetime] = None
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None
    department: Optional[str] = None
    degree: Optional[str] = None
    batch: Optional[str] = None
    register_number: Optional[str] = None


class ClubMembersListResponse(BaseModel):
    club_id: UUID
    member_count: int
    members: List[ClubMemberResponse]


# ===== STUDENT DIRECTORY SCHEMAS =====

class StudentDirectoryStudentResponse(BaseModel):
    id: UUID
    name: Optional[str] = None
    email: str
    picture: Optional[str] = None
    department: Optional[str] = None
    degree: Optional[str] = None
    batch: Optional[str] = None
    register_number: Optional[str] = None
    year: Optional[str] = None


class StudentDirectoryListResponse(BaseModel):
    total: int
    students: List[StudentDirectoryStudentResponse]


# ===== EVENT WORKFORCE SCHEMAS =====

class EventWorkforceCreate(BaseModel):
    user_id: UUID
    role: Literal["CLUB_MEMBER", "VOLUNTEER"]


class EventWorkforceMemberResponse(BaseModel):
    id: UUID
    event_id: UUID
    user_id: UUID
    role: Literal["CLUB_MEMBER", "VOLUNTEER"]
    created_at: Optional[datetime] = None
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None
    department: Optional[str] = None
    degree: Optional[str] = None
    batch: Optional[str] = None
    register_number: Optional[str] = None


class EventWorkforceListResponse(BaseModel):
    event_id: UUID
    club_id: UUID
    member_count: int
    volunteer_count: int
    workers: List[EventWorkforceMemberResponse]
