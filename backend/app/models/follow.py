import uuid

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Follow(Base):
    __tablename__ = "follows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)

    # Prevent duplicate follows
    __table_args__ = (
        UniqueConstraint("user_id", "club_id", name="uq_user_club_follow"),
    )

    # Relationships
    user = relationship("User", backref="follows")
    club = relationship("Club", backref="followers")
