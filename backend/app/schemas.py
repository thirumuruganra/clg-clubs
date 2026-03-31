from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ===== USER SCHEMAS =====

class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    role: Optional[str] = "STUDENT"
    picture: Optional[str] = None
    batch: Optional[str] = None
    department: Optional[str] = None
    joined_clubs: Optional[List[str]] = []

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    batch: Optional[str] = None
    department: Optional[str] = None
    joined_clubs: Optional[List[str]] = None


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
    id: int
    admin_id: int
    follower_count: Optional[int] = 0
    is_following: Optional[bool] = False

    class Config:
        from_attributes = True


# ===== EVENT SCHEMAS =====

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    tag: Optional[str] = None              # "TECH" or "NON_TECH"
    image_url: Optional[str] = None

class EventCreate(EventBase):
    club_id: int

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    tag: Optional[str] = None
    image_url: Optional[str] = None

class EventResponse(EventBase):
    id: int
    club_id: int
    club_name: Optional[str] = None
    rsvp_count: Optional[int] = 0
    is_rsvped: Optional[bool] = False

    class Config:
        from_attributes = True


# ===== RSVP SCHEMAS =====

class RSVPCreate(BaseModel):
    event_id: int

class RSVPResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== FOLLOW SCHEMAS =====

class FollowCreate(BaseModel):
    club_id: int

class FollowResponse(BaseModel):
    id: int
    user_id: int
    club_id: int

    class Config:
        from_attributes = True
