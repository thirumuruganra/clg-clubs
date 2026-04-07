from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.rsvp import RSVP
from app.models.event import Event
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()


@router.post("/events/{event_id}/rsvp")
def rsvp_to_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """RSVP to an event (register / 'I will be there'). Requires authentication."""
    # Verify event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if user already RSVPed
    existing = db.query(RSVP).filter(
        RSVP.user_id == current_user.id, RSVP.event_id == event_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already RSVPed to this event")

    rsvp = RSVP(user_id=current_user.id, event_id=event_id)
    db.add(rsvp)
    db.commit()
    db.refresh(rsvp)

    return {
        "status": "success",
        "message": "Successfully registered for event",
        "rsvp_id": rsvp.id,
    }


@router.delete("/events/{event_id}/rsvp")
def cancel_rsvp(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Cancel an RSVP. Requires authentication."""
    rsvp = db.query(RSVP).filter(
        RSVP.user_id == current_user.id, RSVP.event_id == event_id
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
                "attended": r.attended, "is_paid": r.is_paid,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user": {
                    "id": r.user.id,
                    "name": r.user.name,
                    "email": r.user.email,
                    "department": r.user.department,
                    "batch": r.user.batch,
                    "register_number": r.user.register_number
                } if r.user else None
            }
            for r in rsvps
        ],
    }

@router.get("/rsvps/me/activity")
def get_user_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all attended events for the current user."""
    from app.models.club import Club
    rsvps = (
        db.query(RSVP)
        .join(Event, RSVP.event_id == Event.id)
        .join(Club, Event.club_id == Club.id)
        .filter(RSVP.user_id == current_user.id, RSVP.attended == True)
        .all()
    )

    activities = []
    for r in rsvps:
        activities.append({
            "event_name": r.event.title,
            "club_name": r.event.club.name if r.event.club else "Unknown Club",
            "start_time": r.event.start_time.isoformat() if r.event.start_time else None,
            "end_time": r.event.end_time.isoformat() if r.event.end_time else None,
        })
    return activities

from pydantic import BaseModel

from typing import Optional
class RSVPAttendUpdate(BaseModel):
    attended: Optional[bool] = None
    is_paid: Optional[bool] = None

@router.patch("/rsvps/{rsvp_id}")
def update_rsvp_attendance(rsvp_id: int, update_data: RSVPAttendUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update RSVP attendance status. Typically requires Club Admin."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    rsvp = db.query(RSVP).filter(RSVP.id == rsvp_id).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    # Optionally verify that current user admin matches the event's club admin
    
    if update_data.attended is not None:
        rsvp.attended = update_data.attended
    if update_data.is_paid is not None:
        rsvp.is_paid = update_data.is_paid
    db.commit()
    
    return {"status": "success"}

from typing import List

class BulkRSVPUpdate(BaseModel):
    rsvp_ids: List[int]
    is_paid: bool

@router.post("/events/{event_id}/bulk-payment")
def bulk_update_payments(event_id: int, update_data: BulkRSVPUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.id.in_(update_data.rsvp_ids)
    ).update({"is_paid": update_data.is_paid}, synchronize_session=False)
    
    db.commit()
    return {"status": "success", "updated_count": len(update_data.rsvp_ids)}
