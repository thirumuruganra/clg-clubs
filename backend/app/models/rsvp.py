from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RSVP(Base):
    __tablename__ = "rsvps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)   # phase-2 index: RSVP check and activity queries filter by user_id
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True) # phase-2 index: RSVP count/list queries filter by event_id
    attended = Column(Boolean, default=False)
    attended_marked_at = Column(DateTime, nullable=True)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)               # phase-2 index: live-activity query filters by created_at time range

    # Prevent duplicate RSVPs
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_user_event_rsvp"),
    )

    # Relationships
    user = relationship("User", backref="rsvps")
    event = relationship("Event", back_populates="rsvps")
