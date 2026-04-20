from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.rsvp import RSVP
from app.models.event import Event
from app.models.club import Club
from app.models.user import User
from app.core.security import get_current_user
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

router = APIRouter()
IST_TZ = ZoneInfo("Asia/Kolkata")


def _current_ist_datetime() -> datetime:
    """Return current time in IST as a naive datetime for DB storage."""
    return datetime.now(timezone.utc).astimezone(IST_TZ).replace(tzinfo=None)


def _verify_admin_owns_event(event_id: int, db: Session, current_user: User) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update RSVP data for your own club events")


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
                "attended_marked_at": r.attended_marked_at.isoformat() if r.attended_marked_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user": {
                    "id": r.user.id,
                    "name": r.user.name,
                    "email": r.user.email,
                    "department": r.user.department,
                    "degree": r.user.degree,
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


class AttendanceCheckinRequest(BaseModel):
    qr_code: str

@router.patch("/rsvps/{rsvp_id}")
def update_rsvp_attendance(rsvp_id: int, update_data: RSVPAttendUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update RSVP attendance status. Typically requires Club Admin."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    rsvp = db.query(RSVP).filter(RSVP.id == rsvp_id).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    _verify_admin_owns_event(rsvp.event_id, db, current_user)
    
    if update_data.attended is not None:
        rsvp.attended = update_data.attended
        if update_data.attended:
            rsvp.attended_marked_at = _current_ist_datetime()
        else:
            rsvp.attended_marked_at = None
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

    _verify_admin_owns_event(event_id, db, current_user)
    
    db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.id.in_(update_data.rsvp_ids)
    ).update({"is_paid": update_data.is_paid}, synchronize_session=False)
    
    db.commit()
    return {"status": "success", "updated_count": len(update_data.rsvp_ids)}


@router.post("/events/{event_id}/attendance/checkin")
def checkin_attendance_via_qr(
    event_id: int,
    payload: AttendanceCheckinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark attendance by scanning an event QR. Auto-registers if RSVP doesn't exist."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.attendance_qr_code or payload.qr_code != event.attendance_qr_code:
        raise HTTPException(status_code=400, detail="Invalid attendance QR")

    if not event.attendance_qr_open:
        raise HTTPException(status_code=403, detail="Attendance QR is closed for this event")

    existing_rsvp = db.query(RSVP).filter(
        RSVP.user_id == current_user.id,
        RSVP.event_id == event_id,
    ).first()

    if existing_rsvp:
        if existing_rsvp.attended:
            if existing_rsvp.attended_marked_at is None:
                existing_rsvp.attended_marked_at = _current_ist_datetime()
                db.commit()
            return {
                "status": "success",
                "event_id": event_id,
                "rsvp_id": existing_rsvp.id,
                "action": "already_attended",
                "message": "Attendance already marked",
            }

        existing_rsvp.attended = True
        existing_rsvp.attended_marked_at = _current_ist_datetime()
        db.commit()
        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": existing_rsvp.id,
            "action": "marked_attended",
            "message": "Attendance marked successfully",
        }

    new_rsvp = RSVP(
        user_id=current_user.id,
        event_id=event_id,
        attended=True,
        attended_marked_at=_current_ist_datetime(),
    )
    db.add(new_rsvp)
    try:
        db.commit()
        db.refresh(new_rsvp)
        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": new_rsvp.id,
            "action": "registered_and_marked_attended",
            "message": "Registered and attendance marked successfully",
        }
    except IntegrityError:
        # Handle race condition where RSVP was created concurrently.
        db.rollback()
        concurrent_rsvp = db.query(RSVP).filter(
            RSVP.user_id == current_user.id,
            RSVP.event_id == event_id,
        ).first()
        if not concurrent_rsvp:
            raise HTTPException(status_code=409, detail="Could not complete check-in")

        if not concurrent_rsvp.attended:
            concurrent_rsvp.attended = True
            concurrent_rsvp.attended_marked_at = _current_ist_datetime()
            db.commit()
        elif concurrent_rsvp.attended_marked_at is None:
            concurrent_rsvp.attended_marked_at = _current_ist_datetime()
            db.commit()

        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": concurrent_rsvp.id,
            "action": "registered_and_marked_attended",
            "message": "Registered and attendance marked successfully",
        }
