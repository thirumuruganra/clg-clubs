from app.models.user import User
from app.models.club import Club
from app.database import SessionLocal

db = SessionLocal()
print(f"Number of clubs: {db.query(Club).count()}")
