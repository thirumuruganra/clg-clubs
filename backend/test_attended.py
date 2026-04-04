from app.database import SessionLocal
from app.models.rsvp import RSVP

db = SessionLocal()
print("Count with == True:", db.query(RSVP).filter(RSVP.attended == True).count())
print("Count with .is_(True):", db.query(RSVP).filter(RSVP.attended.is_(True)).count())
print("Count with plain attended:", db.query(RSVP).filter(RSVP.attended).count())
# also print the total and actual values
rsvps = db.query(RSVP).all()
print("All RSVPs:", [(r.id, r.attended) for r in rsvps])
