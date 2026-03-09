from pydantic import BaseModel
from typing import Optional, List

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

class User(UserBase):
    id: int
    is_active: bool = True

    class Config:
        class_attributes = True  # or orm_mode = True for pydantic v1

class UserUpdate(BaseModel):
    batch: Optional[str] = None
    department: Optional[str] = None
    joined_clubs: Optional[List[str]] = None
