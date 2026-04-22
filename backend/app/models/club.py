import uuid

from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    category = Column(String(50), nullable=False)       # "TECH" or "NON_TECH"
    instagram_handle = Column(String(100), nullable=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Relationships
    admin = relationship("User", backref="clubs")
    events = relationship("Event", back_populates="club")
