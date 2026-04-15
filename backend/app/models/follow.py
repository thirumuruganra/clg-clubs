from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # phase-2 index: feed queries filter follows by user_id
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False, index=True)  # phase-2 index: follower-count queries filter by club_id

    # Prevent duplicate follows
    __table_args__ = (
        UniqueConstraint("user_id", "club_id", name="uq_user_club_follow"),
    )

    # Relationships
    user = relationship("User", backref="follows")
    club = relationship("Club", backref="followers")
