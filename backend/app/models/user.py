from sqlalchemy import Column, Integer, String
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String) # "STUDENT" or "CLUB_ADMIN"
    google_token = Column(String) # Encrypted Access Token for Calendar API
    picture = Column(String)
    batch = Column(String, nullable=True) # e.g. "2024"
    department = Column(String, nullable=True) # e.g. "CSE"
    joined_clubs = Column(String, default="[]") # JSON string of club names
