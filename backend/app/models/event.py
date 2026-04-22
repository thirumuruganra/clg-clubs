import uuid

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    tag = Column(String(50), nullable=True)             # "TECH" or "NON_TECH"
    image_url = Column(String(500), nullable=True)
    poster_storage_path = Column(String(700), nullable=True)
    poster_mime_type = Column(String(100), nullable=True)
    poster_size_bytes = Column(Integer, nullable=True)
    poster_uploaded_at = Column(DateTime, nullable=True)
    poster_deleted_at = Column(DateTime, nullable=True)
    keywords = Column(String(500), nullable=True)
    payment_link = Column(String(500), nullable=True)
    is_paid = Column(Boolean, default=False)
    registration_fees = Column(String(100), nullable=True)
    attendance_qr_code = Column(String(64), nullable=True, index=True)
    attendance_qr_open = Column(Boolean, default=False)

    # Relationships
    club = relationship("Club", back_populates="events")
    rsvps = relationship("RSVP", back_populates="event")
