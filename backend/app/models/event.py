from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    tag = Column(String(50), nullable=True)             # "TECH" or "NON_TECH"
    image_url = Column(String(500), nullable=True)
    keywords = Column(String(500), nullable=True)
    payment_link = Column(String(500), nullable=True)

    # Relationships
    club = relationship("Club", back_populates="events")
    rsvps = relationship("RSVP", back_populates="event")
