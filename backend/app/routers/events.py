from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_
import json
import re
import os
import uuid
from urllib.parse import urlencode, urlparse
from app.database import get_db
from app.models.event import Event
from app.models.event_worker import EventWorker
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.rsvp import RSVP
from app.models.follow import Follow
from app.models.user import User
from app.schemas import EventCreate, EventUpdate, EventResponse, EventWorkforceCreate
from app.core.security import get_current_user
from app.services.event_posters import (
    MAX_POSTER_BYTES,
    replace_event_poster,
    clear_event_poster,
)
from datetime import datetime, timedelta
from typing import Optional, List

router = APIRouter()


def _require_frontend_checkin_base_url() -> str:
    raw_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip().rstrip("/")

    parsed_origin = urlparse(raw_origin)
    if parsed_origin.scheme not in {"http", "https"} or not parsed_origin.netloc:
        raise RuntimeError(
            "FRONTEND_ORIGIN must be a valid absolute URL (for example, http://localhost:5173)."
        )

    return raw_origin


FRONTEND_CHECKIN_BASE_URL = _require_frontend_checkin_base_url()

WORKFORCE_ROLE_MEMBER = "CLUB_MEMBER"
WORKFORCE_ROLE_VOLUNTEER = "VOLUNTEER"


def _word_count(text: Optional[str]) -> int:
    if not text:
        return 0
    return len(text.split())


def _validate_short_description(description: Optional[str]) -> None:
    if description is not None and _word_count(description) > 100:
        raise HTTPException(status_code=422, detail="Description must be 100 words or fewer")


def _apply_event_search(query, search: Optional[str]):
    if not search or not search.strip():
        return query
    search_term = f"%{search.strip()}%"
    return query.filter(
        or_(
            Event.title.ilike(search_term),
            Event.description.ilike(search_term),
            Event.keywords.ilike(search_term),
        )
    )


def _safe_json_list(raw_value) -> List[str]:
    if not raw_value:
        return []
    try:
        data = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def _tokenize_text(raw_text: Optional[str]) -> set[str]:
    if not raw_text:
        return set()
    return {token for token in re.findall(r"[a-z0-9]+", raw_text.lower()) if token}


def _build_attendance_checkin_url(event_id: int, qr_code: str) -> str:
    query = urlencode({"event_id": event_id, "qr": qr_code})
    return f"{FRONTEND_CHECKIN_BASE_URL}/student/attendance-checkin?{query}"


def _require_admin_owned_event(event_id: int, db: Session, current_user: User) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only club admins can manage attendance QR")

    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage attendance QR for your own club events")

    return event


def _normalize_user_interests(interests: List[str]) -> set[str]:
    normalized_tokens = set()
    for interest in interests:
        normalized_tokens.update(_tokenize_text(str(interest)))
    return normalized_tokens


def _serialize_event_worker(assignment: EventWorker, worker: User) -> dict:
    return {
        "id": assignment.id,
        "event_id": assignment.event_id,
        "user_id": assignment.user_id,
        "role": assignment.role,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        "name": worker.name,
        "email": worker.email,
        "picture": worker.picture,
        "department": worker.department,
        "degree": worker.degree,
        "batch": worker.batch,
        "register_number": worker.register_number,
    }


def _calculate_recommendation_score(event: Event, interest_tokens: set[str], is_followed_club: bool) -> float:
    keyword_tokens = _tokenize_text(event.keywords)
    content_tokens = _tokenize_text(f"{event.title or ''} {event.description or ''}")

    keyword_overlap = len(keyword_tokens & interest_tokens)
    content_overlap = len(content_tokens & interest_tokens)

    # Heavier weight on explicit event keywords than fallback content text.
    score = (keyword_overlap * 6.0) + (content_overlap * 2.0)
    if is_followed_club:
        score += 1.5

    if event.start_time:
        hours_until = (event.start_time - datetime.utcnow()).total_seconds() / 3600
        if hours_until >= 0:
            # Prefer near-future events as a soft tie breaker.
            score += max(0.0, 1.0 - min(hours_until, 168) / 168)

    return score


@router.get("/all")
def get_all_events(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Get all events (for calendar view)."""
    query = db.query(Event)
    query = _apply_event_search(query, search)
    events = query.order_by(Event.start_time.asc()).all()
    result = []
    for event in events:
        club = db.query(Club).filter(Club.id == event.club_id).first()
        rsvp_count = db.query(RSVP).filter(RSVP.event_id == event.id).count()
        result.append({
            "id": event.id,
            "club_id": event.club_id,
            "club_name": club.name if club else None,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "start_time": event.start_time.isoformat() if event.start_time else None,
            "end_time": event.end_time.isoformat() if event.end_time else None,
            "tag": event.tag,
            "image_url": event.image_url,
            "keywords": event.keywords,
            "payment_link": event.payment_link,
            "is_paid": event.is_paid,
            "registration_fees": event.registration_fees,
            "rsvp_count": rsvp_count,
            "attendance_qr_open": bool(event.attendance_qr_open),
        })
    return result


@router.get("/feed")
def get_event_feed(
    type: str = Query("following", pattern="^(following|discover|recommended)$"),
    user_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get event feed.
    - type=following: events from clubs the user follows
    - type=discover: events from clubs the user does NOT follow
    - type=recommended: ranked mixed feed by user interests + recency
    """
    followed_club_ids = []
    interest_tokens = set()

    if user_id:
        followed_club_ids = [
            f.club_id for f in db.query(Follow).filter(Follow.user_id == user_id).all()
        ]
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            interest_tokens = _normalize_user_interests(_safe_json_list(user.interests))

    if not user_id:
        # If no user_id, return all events chronologically.
        query = db.query(Event)
        query = _apply_event_search(query, search)
        events = query.order_by(Event.start_time.asc()).all()
    else:
        if type == "following":
            if not followed_club_ids:
                return []
            query = db.query(Event).filter(Event.club_id.in_(followed_club_ids))
            query = _apply_event_search(query, search)
            events = query.order_by(Event.start_time.asc()).all()
        elif type == "discover":
            if followed_club_ids:
                query = db.query(Event).filter(~Event.club_id.in_(followed_club_ids))
            else:
                query = db.query(Event)
            query = _apply_event_search(query, search)
            events = query.order_by(Event.start_time.asc()).all()
        else:  # recommended
            query = db.query(Event)
            query = _apply_event_search(query, search)
            events = query.all()
            events = sorted(
                events,
                key=lambda event: (
                    -_calculate_recommendation_score(event, interest_tokens, event.club_id in followed_club_ids),
                    event.start_time or datetime.max,
                ),
            )

    result = []
    for event in events:
        club = db.query(Club).filter(Club.id == event.club_id).first()
        rsvp_count = db.query(RSVP).filter(RSVP.event_id == event.id).count()
        is_rsvped = False
        is_from_followed_club = event.club_id in followed_club_ids
        recommendation_score = 0.0
        if user_id:
            is_rsvped = db.query(RSVP).filter(
                RSVP.event_id == event.id, RSVP.user_id == user_id
            ).first() is not None
            if type == "recommended":
                recommendation_score = _calculate_recommendation_score(
                    event,
                    interest_tokens,
                    is_from_followed_club,
                )

        result.append({
            "id": event.id,
            "club_id": event.club_id,
            "club_name": club.name if club else None,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "start_time": event.start_time.isoformat() if event.start_time else None,
            "end_time": event.end_time.isoformat() if event.end_time else None,
            "tag": event.tag,
            "image_url": event.image_url,
            "keywords": event.keywords,
            "payment_link": event.payment_link,
            "is_paid": event.is_paid,
            "registration_fees": event.registration_fees,
            "rsvp_count": rsvp_count,
            "is_rsvped": is_rsvped,
            "is_from_followed_club": is_from_followed_club,
            "recommendation_score": recommendation_score,
            "attendance_qr_open": bool(event.attendance_qr_open),
        })
    return result


@router.get("/{event_id}")
def get_event(event_id: int, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get a single event by ID."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    club = db.query(Club).filter(Club.id == event.club_id).first()
    rsvp_count = db.query(RSVP).filter(RSVP.event_id == event.id).count()

    is_rsvped = False
    if user_id:
        is_rsvped = db.query(RSVP).filter(
            RSVP.event_id == event.id, RSVP.user_id == user_id
        ).first() is not None

    # Live activity: RSVPs in the last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_rsvps = db.query(RSVP).filter(
        RSVP.event_id == event.id,
        RSVP.created_at >= one_hour_ago
    ).count()

    return {
        "id": event.id,
        "club_id": event.club_id,
        "club_name": club.name if club else None,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "start_time": event.start_time.isoformat() if event.start_time else None,
        "end_time": event.end_time.isoformat() if event.end_time else None,
        "tag": event.tag,
        "image_url": event.image_url,
        "keywords": event.keywords,
            "payment_link": event.payment_link,
            "is_paid": event.is_paid,
            "registration_fees": event.registration_fees,
        "rsvp_count": rsvp_count,
        "is_rsvped": is_rsvped,
        "recent_activity": recent_rsvps,
            "attendance_qr_open": bool(event.attendance_qr_open),
    }


@router.post("/")
def create_event(event: EventCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new event. Only CLUB_ADMIN users who own the club can create events."""
    _validate_short_description(event.description)

    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only club admins can create events")
    # Verify the club exists
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create events for your own club")

    db_event = Event(
        club_id=event.club_id,
        title=event.title,
        description=event.description,
        location=event.location,
        start_time=event.start_time,
        end_time=event.end_time,
        tag=event.tag,
        image_url=event.image_url,
        keywords=event.keywords,
        payment_link=event.payment_link,
        is_paid=event.is_paid,
        registration_fees=event.registration_fees,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return {
        "id": db_event.id,
        "club_id": db_event.club_id,
        "club_name": club.name,
        "title": db_event.title,
        "description": db_event.description,
        "location": db_event.location,
        "start_time": db_event.start_time.isoformat() if db_event.start_time else None,
        "end_time": db_event.end_time.isoformat() if db_event.end_time else None,
        "tag": db_event.tag,
        "image_url": db_event.image_url,
        "keywords": db_event.keywords,
            "payment_link": db_event.payment_link,
            "is_paid": db_event.is_paid,
            "registration_fees": db_event.registration_fees,
        "rsvp_count": 0,
        "attendance_qr_open": bool(db_event.attendance_qr_open),
    }


@router.post("/{event_id}/poster")
async def upload_event_poster(
    event_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload or replace an event poster in Supabase Storage bucket."""
    event = _require_admin_owned_event(event_id, db, current_user)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Poster file is empty")

    try:
        poster_payload = replace_event_poster(event, file_bytes, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Poster upload failed. Verify Supabase bucket settings. {exc}",
        ) from exc

    db.commit()
    db.refresh(event)

    return {
        "status": "success",
        "event_id": event.id,
        "image_url": poster_payload["image_url"],
        "poster_storage_path": poster_payload["poster_storage_path"],
        "max_size_bytes": MAX_POSTER_BYTES,
    }


@router.put("/{event_id}")
def update_event(event_id: int, event_update: EventUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing event. Only the club admin who owns the event can update it."""
    _validate_short_description(event_update.description)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update events for your own club")

    if event_update.title is not None:
        event.title = event_update.title
    if event_update.description is not None:
        event.description = event_update.description
    if event_update.location is not None:
        event.location = event_update.location
    if event_update.start_time is not None:
        event.start_time = event_update.start_time
    if event_update.end_time is not None:
        event.end_time = event_update.end_time
    if event_update.tag is not None:
        event.tag = event_update.tag
    if event_update.image_url is not None:
        normalized_image_url = (event_update.image_url or "").strip()
        current_image_url = (event.image_url or "").strip()

        if normalized_image_url == current_image_url:
            pass
        elif not normalized_image_url:
            try:
                clear_event_poster(event)
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=f"Failed to delete existing poster: {exc}") from exc
        else:
            if event.poster_storage_path:
                try:
                    clear_event_poster(event)
                except RuntimeError as exc:
                    raise HTTPException(status_code=502, detail=f"Failed to delete existing poster: {exc}") from exc
                event.poster_deleted_at = None
            event.image_url = normalized_image_url
    if event_update.keywords is not None:
        event.keywords = event_update.keywords
    if event_update.payment_link is not None:
        event.payment_link = event_update.payment_link
    if event_update.is_paid is not None:
        event.is_paid = event_update.is_paid
    if event_update.registration_fees is not None:
        event.registration_fees = event_update.registration_fees

    db.commit()
    db.refresh(event)

    club = db.query(Club).filter(Club.id == event.club_id).first()
    rsvp_count = db.query(RSVP).filter(RSVP.event_id == event.id).count()

    return {
        "id": event.id,
        "club_id": event.club_id,
        "club_name": club.name if club else None,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "start_time": event.start_time.isoformat() if event.start_time else None,
        "end_time": event.end_time.isoformat() if event.end_time else None,
        "tag": event.tag,
        "image_url": event.image_url,
        "keywords": event.keywords,
            "payment_link": event.payment_link,
            "is_paid": event.is_paid,
            "registration_fees": event.registration_fees,
        "rsvp_count": rsvp_count,
        "attendance_qr_open": bool(event.attendance_qr_open),
    }


@router.get("/{event_id}/attendance-qr")
def get_event_attendance_qr(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get attendance QR payload for an event (club admin owner only)."""
    event = _require_admin_owned_event(event_id, db, current_user)

    if not event.attendance_qr_code:
        event.attendance_qr_code = uuid.uuid4().hex
        db.commit()
        db.refresh(event)

    return {
        "event_id": event.id,
        "attendance_qr_open": bool(event.attendance_qr_open),
        "checkin_url": _build_attendance_checkin_url(event.id, event.attendance_qr_code),
    }


@router.post("/{event_id}/attendance-qr/open")
def open_event_attendance_qr(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Open attendance QR for student scans (club admin owner only)."""
    event = _require_admin_owned_event(event_id, db, current_user)

    if not event.attendance_qr_code:
        event.attendance_qr_code = uuid.uuid4().hex

    event.attendance_qr_open = True
    db.commit()
    db.refresh(event)

    return {
        "status": "success",
        "event_id": event.id,
        "attendance_qr_open": True,
        "checkin_url": _build_attendance_checkin_url(event.id, event.attendance_qr_code),
    }


@router.post("/{event_id}/attendance-qr/close")
def close_event_attendance_qr(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Close attendance QR scans for an event (club admin owner only)."""
    event = _require_admin_owned_event(event_id, db, current_user)

    event.attendance_qr_open = False
    db.commit()

    return {
        "status": "success",
        "event_id": event.id,
        "attendance_qr_open": False,
    }


@router.get("/{event_id}/workforce")
def get_event_workforce(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get workforce assignments (club members + volunteers) for one event."""
    event = _require_admin_owned_event(event_id, db, current_user)

    assignments = (
        db.query(EventWorker, User)
        .join(User, EventWorker.user_id == User.id)
        .filter(EventWorker.event_id == event_id)
        .all()
    )

    workers = [_serialize_event_worker(assignment, worker) for assignment, worker in assignments]
    workers.sort(
        key=lambda row: (
            row.get("role") != WORKFORCE_ROLE_MEMBER,
            str(row.get("name") or row.get("email") or "").strip().lower(),
            row.get("user_id") or 0,
        )
    )

    member_count = sum(1 for row in workers if row.get("role") == WORKFORCE_ROLE_MEMBER)
    volunteer_count = sum(1 for row in workers if row.get("role") == WORKFORCE_ROLE_VOLUNTEER)

    return {
        "event_id": event_id,
        "club_id": event.club_id,
        "member_count": member_count,
        "volunteer_count": volunteer_count,
        "workers": workers,
    }


@router.post("/{event_id}/workforce", status_code=201)
def add_event_workforce_member(
    event_id: int,
    payload: EventWorkforceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a club member or volunteer to an event."""
    event = _require_admin_owned_event(event_id, db, current_user)

    student = db.query(User).filter(User.id == payload.user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.role != "STUDENT":
        raise HTTPException(status_code=422, detail="Only students can be assigned")

    if payload.role == WORKFORCE_ROLE_MEMBER:
        is_club_member = (
            db.query(ClubMember)
            .filter(ClubMember.club_id == event.club_id, ClubMember.user_id == payload.user_id)
            .first()
            is not None
        )
        if not is_club_member:
            raise HTTPException(status_code=422, detail="User must be a club member for CLUB_MEMBER role")

    existing_assignment = (
        db.query(EventWorker)
        .filter(EventWorker.event_id == event_id, EventWorker.user_id == payload.user_id)
        .first()
    )
    if existing_assignment:
        if existing_assignment.role == payload.role:
            raise HTTPException(status_code=400, detail="Student is already assigned to this event")
        raise HTTPException(
            status_code=400,
            detail=f"Student is already assigned as {existing_assignment.role}. Remove and add again to change role.",
        )

    assignment = EventWorker(event_id=event_id, user_id=payload.user_id, role=payload.role)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return _serialize_event_worker(assignment, student)


@router.delete("/{event_id}/workforce/{assignment_id}", status_code=204)
def remove_event_workforce_member(
    event_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove one workforce assignment from an event."""
    _require_admin_owned_event(event_id, db, current_user)

    assignment = (
        db.query(EventWorker)
        .filter(EventWorker.id == assignment_id, EventWorker.event_id == event_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Workforce assignment not found")

    db.delete(assignment)
    db.commit()
    return None


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an event. Only the club admin who owns the event can delete it."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete events for your own club")

    if event.poster_storage_path or event.image_url:
        try:
            clear_event_poster(event)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=f"Failed to delete event poster from storage: {exc}") from exc

    # Delete associated RSVPs first
    db.query(RSVP).filter(RSVP.event_id == event_id).delete()
    db.query(EventWorker).filter(EventWorker.event_id == event_id).delete()
    db.delete(event)
    db.commit()

    return {"status": "success", "message": "Event deleted"}


@router.get("/{event_id}/activity")
def get_event_activity(event_id: int, db: Session = Depends(get_db)):
    """Get live activity for an event (RSVP count in the last hour)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_count = db.query(RSVP).filter(
        RSVP.event_id == event_id,
        RSVP.created_at >= one_hour_ago
    ).count()

    total_count = db.query(RSVP).filter(RSVP.event_id == event_id).count()

    return {
        "event_id": event_id,
        "recent_rsvps": recent_count,
        "total_rsvps": total_count,
    }
