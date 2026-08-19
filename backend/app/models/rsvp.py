import uuid

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RSVP(Base):
    __tablename__ = "rsvps"

    ATTENDANCE_ROLE_PARTICIPANT = "PARTICIPANT"
    ATTENDANCE_ROLE_CLUB_MEMBER = "CLUB_MEMBER"
    ATTENDANCE_ROLE_VOLUNTEER = "VOLUNTEER"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    attended = Column(Boolean, default=False)
    attended_marked_at = Column(DateTime, nullable=True)
    attendance_role = Column(String(20), nullable=True)
    is_paid = Column(Boolean, default=False)
    feedback_text = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Prevent duplicate RSVPs
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_user_event_rsvp"),
    )

    # Relationships
    user = relationship("User", backref="rsvps")
    event = relationship("Event", back_populates="rsvps")
