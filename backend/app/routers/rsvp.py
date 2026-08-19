from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.rsvp import RSVP
from app.models.event import Event
from app.models.event_worker import EventWorker
from app.models.club_member import ClubMember
from app.models.user import User
from app.core.audit import log_security_event
from app.core.security import get_current_user
from app.services.club_admin_access import require_club_admin_access
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from uuid import UUID

router = APIRouter()
IST_TZ = ZoneInfo("Asia/Kolkata")
WORKFORCE_ROLE_MEMBER = "CLUB_MEMBER"
WORKFORCE_ROLE_VOLUNTEER = "VOLUNTEER"
ATTENDANCE_ROLE_PRIORITY = {
    RSVP.ATTENDANCE_ROLE_CLUB_MEMBER: 0,
    RSVP.ATTENDANCE_ROLE_VOLUNTEER: 1,
    RSVP.ATTENDANCE_ROLE_PARTICIPANT: 2,
}


def _current_ist_datetime() -> datetime:
    """Return current time in IST as a naive datetime for DB storage."""
    return datetime.now(timezone.utc).astimezone(IST_TZ).replace(tzinfo=None)


def _verify_admin_owns_event(event_id: UUID, db: Session, current_user: User) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        require_club_admin_access(event.club_id, current_user, db)
    except HTTPException as exc:
        if exc.status_code == 403:
            log_security_event(
                "authz.rsvp.denied",
                actor_user_id=current_user.id,
                event_id=event_id,
            )
        raise


def _resolve_attendance_role(event: Event, user_id: UUID, db: Session) -> str:
    is_club_member = (
        db.query(ClubMember)
        .filter(ClubMember.club_id == event.club_id, ClubMember.user_id == user_id)
        .first()
        is not None
    )

    assignment = (
        db.query(EventWorker)
        .filter(EventWorker.event_id == event.id, EventWorker.user_id == user_id)
        .first()
    )

    if is_club_member and assignment and assignment.role == WORKFORCE_ROLE_VOLUNTEER:
        raise HTTPException(
            status_code=409,
            detail="Attendance conflict: student is both a club member and assigned volunteer. Fix the event assignment before marking attendance.",
        )

    if is_club_member:
        return RSVP.ATTENDANCE_ROLE_CLUB_MEMBER

    if assignment and assignment.role == WORKFORCE_ROLE_VOLUNTEER:
        return RSVP.ATTENDANCE_ROLE_VOLUNTEER

    return RSVP.ATTENDANCE_ROLE_PARTICIPANT


def _infer_attendance_role(event: Event, user_id: UUID, db: Session) -> str:
    is_club_member = (
        db.query(ClubMember)
        .filter(ClubMember.club_id == event.club_id, ClubMember.user_id == user_id)
        .first()
        is not None
    )

    assignment = (
        db.query(EventWorker)
        .filter(EventWorker.event_id == event.id, EventWorker.user_id == user_id)
        .first()
    )

    if is_club_member:
        return RSVP.ATTENDANCE_ROLE_CLUB_MEMBER
    if assignment and assignment.role == WORKFORCE_ROLE_VOLUNTEER:
        return RSVP.ATTENDANCE_ROLE_VOLUNTEER
    return RSVP.ATTENDANCE_ROLE_PARTICIPANT


def _ensure_member_assignment(event: Event, user_id: UUID, attendance_role: str, db: Session) -> None:
    if attendance_role != RSVP.ATTENDANCE_ROLE_CLUB_MEMBER:
        return

    existing_assignment = (
        db.query(EventWorker)
        .filter(EventWorker.event_id == event.id, EventWorker.user_id == user_id)
        .first()
    )
    if existing_assignment:
        return

    db.add(EventWorker(event_id=event.id, user_id=user_id, role=WORKFORCE_ROLE_MEMBER))


def _attendance_role_sort_key(role: str | None) -> int:
    return ATTENDANCE_ROLE_PRIORITY.get(role or RSVP.ATTENDANCE_ROLE_PARTICIPANT, 2)


def _serialize_rsvp(rsvp: RSVP, attendance_role: str | None = None) -> dict:
    user = rsvp.user
    resolved_role = attendance_role or rsvp.attendance_role or RSVP.ATTENDANCE_ROLE_PARTICIPANT
    return {
        "id": rsvp.id,
        "user_id": rsvp.user_id,
        "attendance_role": resolved_role,
        "attended": rsvp.attended,
        "is_paid": rsvp.is_paid,
        "attended_marked_at": rsvp.attended_marked_at.isoformat() if rsvp.attended_marked_at else None,
        "created_at": rsvp.created_at.isoformat() if rsvp.created_at else None,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "department": user.department,
            "degree": user.degree,
            "batch": user.batch,
            "register_number": user.register_number,
        } if user else None,
    }


def _attendance_year_rank(user: dict | None) -> int:
    if not user:
        return -1

    batch = str(user.get("batch") or "").strip()
    degree = str(user.get("degree") or "").strip().lower()
    register_number = str(user.get("register_number") or "").strip()

    if register_number.lower() == "alumni":
        return 0

    year_value = ""
    if batch.isdigit():
        current_date = datetime.now()
        academic_year = current_date.year + 1 if current_date.month >= 5 else current_date.year
        passout_year = int(batch)
        duration = 4 if degree.startswith("b.") else 2 if degree.startswith("m.") else 4
        diff = passout_year - academic_year
        if diff < 0:
            year_value = "Alumni"
        else:
            year_number = duration - diff
            year_value = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V"}.get(year_number, "-")

    return {"V": 5, "IV": 4, "III": 3, "II": 2, "I": 1, "Alumni": 0, "-": -1}.get(year_value or "-", -1)


def _sorted_rsvp_rows(rsvps: list[RSVP], db: Session) -> list[dict]:
    rows = []
    for rsvp in rsvps:
        attendance_role = (
            _infer_attendance_role(rsvp.event, rsvp.user_id, db)
            if rsvp.event is not None
            else rsvp.attendance_role
        )
        rows.append(_serialize_rsvp(rsvp, attendance_role))

    def sort_key(row: dict) -> tuple[int, str, int, str]:
        user = row.get("user") or {}
        department = str(user.get("department") or "").strip().lower()
        name = str(user.get("name") or "").strip().lower()
        return (
            _attendance_role_sort_key(row.get("attendance_role")),
            department,
            -_attendance_year_rank(user),
            name,
        )

    return sorted(rows, key=sort_key)


@router.post("/events/{event_id}/rsvp")
def rsvp_to_event(event_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
def cancel_rsvp(event_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
def get_event_rsvps(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all RSVPs for an event (owning club admin only)."""
    _verify_admin_owns_event(event_id, db, current_user)

    rsvps = db.query(RSVP).filter(RSVP.event_id == event_id).all()

    payload = {
        "event_id": event_id,
        "total": len(rsvps),
        "rsvps": _sorted_rsvp_rows(rsvps, db),
    }

    log_security_event("authz.rsvp.read", actor_user_id=current_user.id, event_id=event_id, count=len(rsvps))
    return payload

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

from pydantic import BaseModel, Field

from typing import Optional
class RSVPAttendUpdate(BaseModel):
    attended: Optional[bool] = None
    is_paid: Optional[bool] = None


class AttendanceCheckinRequest(BaseModel):
    qr_code: str
    feedback: Optional[str] = Field(None, max_length=100)

@router.patch("/rsvps/{rsvp_id}")
def update_rsvp_attendance(rsvp_id: UUID, update_data: RSVPAttendUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update RSVP attendance status. Requires club admin access (head or delegated admin)."""
    rsvp = db.query(RSVP).filter(RSVP.id == rsvp_id).first()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    _verify_admin_owns_event(rsvp.event_id, db, current_user)

    if update_data.attended is not None:
        rsvp.attended = update_data.attended
        if update_data.attended:
            attendance_role = _resolve_attendance_role(rsvp.event, rsvp.user_id, db)
            _ensure_member_assignment(rsvp.event, rsvp.user_id, attendance_role, db)
            rsvp.attendance_role = attendance_role
            rsvp.attended_marked_at = _current_ist_datetime()
        else:
            rsvp.attendance_role = None
            rsvp.attended_marked_at = None
    if update_data.is_paid is not None:
        rsvp.is_paid = update_data.is_paid
    db.commit()
    
    return {"status": "success"}

from typing import List

class BulkRSVPUpdate(BaseModel):
    rsvp_ids: List[UUID]
    is_paid: bool

@router.post("/events/{event_id}/bulk-payment")
def bulk_update_payments(event_id: UUID, update_data: BulkRSVPUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _verify_admin_owns_event(event_id, db, current_user)
    
    db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.id.in_(update_data.rsvp_ids)
    ).update({"is_paid": update_data.is_paid}, synchronize_session=False)
    
    db.commit()
    return {"status": "success", "updated_count": len(update_data.rsvp_ids)}


@router.post("/events/{event_id}/attendance/checkin")
def checkin_attendance_via_qr(
    event_id: UUID,
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

    feedback_text = (payload.feedback or "").strip() or None
    if event.collect_feedback and not feedback_text:
        raise HTTPException(status_code=400, detail="Feedback is required to mark attendance for this event")

    attendance_role = _resolve_attendance_role(event, current_user.id, db)
    _ensure_member_assignment(event, current_user.id, attendance_role, db)

    existing_rsvp = db.query(RSVP).filter(
        RSVP.user_id == current_user.id,
        RSVP.event_id == event_id,
    ).first()

    if existing_rsvp:
        if existing_rsvp.attended:
            role_updated = False
            if existing_rsvp.attendance_role != attendance_role:
                existing_rsvp.attendance_role = attendance_role
                role_updated = True
            if existing_rsvp.attended_marked_at is None:
                existing_rsvp.attendance_role = attendance_role
                existing_rsvp.attended_marked_at = _current_ist_datetime()
                role_updated = True
            if feedback_text and existing_rsvp.feedback_text != feedback_text:
                existing_rsvp.feedback_text = feedback_text
                role_updated = True
            if role_updated:
                db.commit()
            return {
                "status": "success",
                "event_id": event_id,
                "rsvp_id": existing_rsvp.id,
                "attendance_role": attendance_role,
                "action": "already_attended",
                "message": "Attendance already marked",
            }

        existing_rsvp.attended = True
        existing_rsvp.attendance_role = attendance_role
        existing_rsvp.attended_marked_at = _current_ist_datetime()
        if feedback_text:
            existing_rsvp.feedback_text = feedback_text
        db.commit()
        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": existing_rsvp.id,
            "attendance_role": attendance_role,
            "action": "marked_attended",
            "message": "Attendance marked successfully",
        }

    new_rsvp = RSVP(
        user_id=current_user.id,
        event_id=event_id,
        attended=True,
        attendance_role=attendance_role,
        attended_marked_at=_current_ist_datetime(),
        feedback_text=feedback_text,
    )
    db.add(new_rsvp)
    try:
        db.commit()
        db.refresh(new_rsvp)
        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": new_rsvp.id,
            "attendance_role": attendance_role,
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
            concurrent_rsvp.attendance_role = attendance_role
            concurrent_rsvp.attended_marked_at = _current_ist_datetime()
            if feedback_text:
                concurrent_rsvp.feedback_text = feedback_text
            db.commit()
        elif (
            concurrent_rsvp.attended_marked_at is None
            or concurrent_rsvp.attendance_role != attendance_role
            or (feedback_text and concurrent_rsvp.feedback_text != feedback_text)
        ):
            concurrent_rsvp.attendance_role = attendance_role
            if concurrent_rsvp.attended_marked_at is None:
                concurrent_rsvp.attended_marked_at = _current_ist_datetime()
            if feedback_text:
                concurrent_rsvp.feedback_text = feedback_text
            db.commit()

        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": concurrent_rsvp.id,
            "attendance_role": attendance_role,
            "action": "registered_and_marked_attended",
            "message": "Registered and attendance marked successfully",
        }
