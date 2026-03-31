from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255))
    role = Column(String(50))            # "STUDENT" or "CLUB_ADMIN"
    google_token = Column(Text)          # Access token can be long, use Text
    picture = Column(String(500))        # Profile picture URL
    batch = Column(String(10), nullable=True)       # e.g. "2024"
    department = Column(String(100), nullable=True)  # e.g. "CSE"
    joined_clubs = Column(Text, default="[]")        # JSON string of club names
