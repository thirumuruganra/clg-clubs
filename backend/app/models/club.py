from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    category = Column(String(50), nullable=False)       # "TECH" or "NON_TECH"
    instagram_handle = Column(String(100), nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # phase-2 index: ownership checks filter by admin_id

    # Relationships
    admin = relationship("User", backref="clubs")
    events = relationship("Event", back_populates="club")
