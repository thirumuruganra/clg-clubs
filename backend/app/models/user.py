import uuid

from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255))
    role = Column(String(50))            # "STUDENT" or "CLUB_ADMIN"
    google_token = Column(Text)          # Access token can be long, use Text
    google_scopes = Column(Text, default="[]")  # JSON list of scopes granted by Google OAuth
    picture = Column(String(500))        # Profile picture URL
    batch = Column(String(10), nullable=True)       # e.g. "2024"
    department = Column(String(100), nullable=True)  # e.g. "CSE"
    degree = Column(String(50), nullable=True)      # e.g. "B.E."
    register_number = Column(String(50), nullable=True) # e.g. "3122XXXXXXXX"
    joined_clubs = Column(Text, default="[]")        # JSON string of club names
    interests = Column(Text, default="[]")           # JSON string of selected interests
