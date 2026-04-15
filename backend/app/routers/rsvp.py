from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update as sa_update
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.rsvp import RSVP
from app.models.event import Event
from app.models.club import Club
from app.models.user import User
from app.core.security import get_current_user
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()
IST_TZ = ZoneInfo("Asia/Kolkata")


def _current_ist_datetime() -> datetime:
    """Return current time in IST as a naive datetime for DB storage."""
    return datetime.now(timezone.utc).astimezone(IST_TZ).replace(tzinfo=None)


async def _verify_admin_owns_event(event_id: int, db: AsyncSession, current_user: User) -> None:
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update RSVP data for your own club events")


@router.post("/events/{event_id}/rsvp")
async def rsvp_to_event(event_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """RSVP to an event (register / 'I will be there'). Requires authentication."""
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    if not event_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if user already RSVPed
    existing_res = await db.execute(
        select(RSVP).where(RSVP.user_id == current_user.id, RSVP.event_id == event_id)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already RSVPed to this event")

    rsvp = RSVP(user_id=current_user.id, event_id=event_id)
    db.add(rsvp)
    await db.commit()
    await db.refresh(rsvp)

    return {
        "status": "success",
        "message": "Successfully registered for event",
        "rsvp_id": rsvp.id,
    }


@router.delete("/events/{event_id}/rsvp")
async def cancel_rsvp(event_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Cancel an RSVP. Requires authentication."""
    result = await db.execute(
        select(RSVP).where(RSVP.user_id == current_user.id, RSVP.event_id == event_id)
    )
    rsvp = result.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    await db.delete(rsvp)
    await db.commit()

    return {"status": "success", "message": "RSVP cancelled"}


@router.get("/events/{event_id}/rsvps")
async def get_event_rsvps(event_id: int, db: AsyncSession = Depends(get_db)):
    """Get all RSVPs for an event."""
    from sqlalchemy.orm import selectinload

    event_res = await db.execute(select(Event).where(Event.id == event_id))
    if not event_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    rsvps_res = await db.execute(
        select(RSVP).options(selectinload(RSVP.user)).where(RSVP.event_id == event_id)
    )
    rsvps = rsvps_res.scalars().all()

    return {
        "event_id": event_id,
        "total": len(rsvps),
        "rsvps": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "attended": r.attended,
                "is_paid": r.is_paid,
                "attended_marked_at": r.attended_marked_at.isoformat() if r.attended_marked_at else None,
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
async def get_user_activity(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all attended events for the current user."""
    from sqlalchemy.orm import selectinload

    rsvps_res = await db.execute(
        select(RSVP)
        .options(selectinload(RSVP.event).selectinload(Event.club))
        .where(RSVP.user_id == current_user.id, RSVP.attended == True)
        .join(Event, RSVP.event_id == Event.id)
        .join(Club, Event.club_id == Club.id)
    )
    rsvps = rsvps_res.scalars().all()

    activities = []
    for r in rsvps:
        activities.append({
            "event_name": r.event.title,
            "club_name": r.event.club.name if r.event.club else "Unknown Club",
            "start_time": r.event.start_time.isoformat() if r.event.start_time else None,
            "end_time": r.event.end_time.isoformat() if r.event.end_time else None,
        })
    return activities


class RSVPAttendUpdate(BaseModel):
    attended: Optional[bool] = None
    is_paid: Optional[bool] = None


class AttendanceCheckinRequest(BaseModel):
    qr_code: str


@router.patch("/rsvps/{rsvp_id}")
async def update_rsvp_attendance(
    rsvp_id: int,
    update_data: RSVPAttendUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update RSVP attendance status. Typically requires Club Admin."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(RSVP).where(RSVP.id == rsvp_id))
    rsvp = result.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")

    await _verify_admin_owns_event(rsvp.event_id, db, current_user)

    if update_data.attended is not None:
        rsvp.attended = update_data.attended
        if update_data.attended:
            rsvp.attended_marked_at = _current_ist_datetime()
        else:
            rsvp.attended_marked_at = None
    if update_data.is_paid is not None:
        rsvp.is_paid = update_data.is_paid
    await db.commit()

    return {"status": "success"}


class BulkRSVPUpdate(BaseModel):
    rsvp_ids: List[int]
    is_paid: bool


@router.post("/events/{event_id}/bulk-payment")
async def bulk_update_payments(
    event_id: int,
    update_data: BulkRSVPUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    await _verify_admin_owns_event(event_id, db, current_user)

    await db.execute(
        sa_update(RSVP)
        .where(RSVP.event_id == event_id, RSVP.id.in_(update_data.rsvp_ids))
        .values(is_paid=update_data.is_paid)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return {"status": "success", "updated_count": len(update_data.rsvp_ids)}


@router.post("/events/{event_id}/attendance/checkin")
async def checkin_attendance_via_qr(
    event_id: int,
    payload: AttendanceCheckinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark attendance by scanning an event QR. Auto-registers if RSVP doesn't exist."""
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.attendance_qr_code or payload.qr_code != event.attendance_qr_code:
        raise HTTPException(status_code=400, detail="Invalid attendance QR")

    if not event.attendance_qr_open:
        raise HTTPException(status_code=403, detail="Attendance QR is closed for this event")

    existing_res = await db.execute(
        select(RSVP).where(RSVP.user_id == current_user.id, RSVP.event_id == event_id)
    )
    existing_rsvp = existing_res.scalar_one_or_none()

    if existing_rsvp:
        if existing_rsvp.attended:
            if existing_rsvp.attended_marked_at is None:
                existing_rsvp.attended_marked_at = _current_ist_datetime()
                await db.commit()
            return {
                "status": "success",
                "event_id": event_id,
                "rsvp_id": existing_rsvp.id,
                "action": "already_attended",
                "message": "Attendance already marked",
            }

        existing_rsvp.attended = True
        existing_rsvp.attended_marked_at = _current_ist_datetime()
        await db.commit()
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
        await db.commit()
        await db.refresh(new_rsvp)
        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": new_rsvp.id,
            "action": "registered_and_marked_attended",
            "message": "Registered and attendance marked successfully",
        }
    except IntegrityError:
        # Handle race condition where RSVP was created concurrently.
        await db.rollback()
        concurrent_res = await db.execute(
            select(RSVP).where(RSVP.user_id == current_user.id, RSVP.event_id == event_id)
        )
        concurrent_rsvp = concurrent_res.scalar_one_or_none()
        if not concurrent_rsvp:
            raise HTTPException(status_code=409, detail="Could not complete check-in")

        if not concurrent_rsvp.attended:
            concurrent_rsvp.attended = True
            concurrent_rsvp.attended_marked_at = _current_ist_datetime()
            await db.commit()
        elif concurrent_rsvp.attended_marked_at is None:
            concurrent_rsvp.attended_marked_at = _current_ist_datetime()
            await db.commit()

        return {
            "status": "success",
            "event_id": event_id,
            "rsvp_id": concurrent_rsvp.id,
            "action": "registered_and_marked_attended",
            "message": "Registered and attendance marked successfully",
        }
