from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.rsvp import RSVP
from app.models.event import Event

router = APIRouter()


@router.post("/events/{event_id}/rsvp")
def rsvp_to_event(event_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """RSVP to an event (register / 'I will be there')."""
    # Verify event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if user already RSVPed
    existing = db.query(RSVP).filter(
        RSVP.user_id == user_id, RSVP.event_id == event_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already RSVPed to this event")

    rsvp = RSVP(user_id=user_id, event_id=event_id)
    db.add(rsvp)
    db.commit()
    db.refresh(rsvp)

    return {
        "status": "success",
        "message": "Successfully registered for event",
        "rsvp_id": rsvp.id,
    }


@router.delete("/events/{event_id}/rsvp")
def cancel_rsvp(event_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """Cancel an RSVP."""
    rsvp = db.query(RSVP).filter(
        RSVP.user_id == user_id, RSVP.event_id == event_id
    ).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    db.delete(rsvp)
    db.commit()

    return {"status": "success", "message": "RSVP cancelled"}


@router.get("/events/{event_id}/rsvps")
def get_event_rsvps(event_id: int, db: Session = Depends(get_db)):
    """Get all RSVPs for an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rsvps = db.query(RSVP).filter(RSVP.event_id == event_id).all()

    return {
        "event_id": event_id,
        "total": len(rsvps),
        "rsvps": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rsvps
        ],
    }
