from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete as sa_delete
import json
import re
import os
import uuid
from urllib.parse import urlencode, urlparse
from app.database import get_db
from app.models.event import Event
from app.models.club import Club
from app.models.rsvp import RSVP
from app.models.follow import Follow
from app.models.user import User
from app.schemas import EventCreate, EventUpdate, EventResponse
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


def _word_count(text: Optional[str]) -> int:
    if not text:
        return 0
    return len(text.split())


def _validate_short_description(description: Optional[str]) -> None:
    if description is not None and _word_count(description) > 100:
        raise HTTPException(status_code=422, detail="Description must be 100 words or fewer")


def _apply_event_search(stmt, search: Optional[str]):
    if not search or not search.strip():
        return stmt
    search_term = f"%{search.strip()}%"
    return stmt.where(
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


def _normalize_user_interests(interests: List[str]) -> set[str]:
    normalized_tokens = set()
    for interest in interests:
        normalized_tokens.update(_tokenize_text(str(interest)))
    return normalized_tokens


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


async def _require_admin_owned_event(event_id: int, db: AsyncSession, current_user: User) -> Event:
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only club admins can manage attendance QR")

    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage attendance QR for your own club events")

    return event


def _build_event_dict(event: Event, club_name: Optional[str], rsvp_count: int, **extras) -> dict:
    return {
        "id": event.id,
        "club_id": event.club_id,
        "club_name": club_name,
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
        **extras,
    }


async def _get_rsvp_count(db: AsyncSession, event_id: int) -> int:
    res = await db.execute(
        select(func.count()).select_from(RSVP).where(RSVP.event_id == event_id)
    )
    return res.scalar_one()


@router.get("/all")
async def get_all_events(search: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    """Get all events (for calendar view)."""
    stmt = select(Event).order_by(Event.start_time.asc())
    stmt = _apply_event_search(stmt, search)
    events_res = await db.execute(stmt)
    events = events_res.scalars().all()

    result = []
    for event in events:
        club_res = await db.execute(select(Club).where(Club.id == event.club_id))
        club = club_res.scalar_one_or_none()
        rsvp_count = await _get_rsvp_count(db, event.id)
        result.append(_build_event_dict(event, club.name if club else None, rsvp_count))
    return result


@router.get("/feed")
async def get_event_feed(
    type: str = Query("following", pattern="^(following|discover|recommended)$"),
    user_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
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
        follows_res = await db.execute(select(Follow).where(Follow.user_id == user_id))
        followed_club_ids = [f.club_id for f in follows_res.scalars().all()]

        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if user:
            interest_tokens = _normalize_user_interests(_safe_json_list(user.interests))

    if not user_id:
        stmt = select(Event).order_by(Event.start_time.asc())
        stmt = _apply_event_search(stmt, search)
        events_res = await db.execute(stmt)
        events = events_res.scalars().all()
    else:
        if type == "following":
            if not followed_club_ids:
                return []
            stmt = select(Event).where(Event.club_id.in_(followed_club_ids)).order_by(Event.start_time.asc())
            stmt = _apply_event_search(stmt, search)
            events_res = await db.execute(stmt)
            events = events_res.scalars().all()
        elif type == "discover":
            if followed_club_ids:
                stmt = select(Event).where(~Event.club_id.in_(followed_club_ids)).order_by(Event.start_time.asc())
            else:
                stmt = select(Event).order_by(Event.start_time.asc())
            stmt = _apply_event_search(stmt, search)
            events_res = await db.execute(stmt)
            events = events_res.scalars().all()
        else:  # recommended
            stmt = select(Event)
            stmt = _apply_event_search(stmt, search)
            events_res = await db.execute(stmt)
            events = events_res.scalars().all()
            events = sorted(
                events,
                key=lambda event: (
                    -_calculate_recommendation_score(event, interest_tokens, event.club_id in followed_club_ids),
                    event.start_time or datetime.max,
                ),
            )

    result = []
    for event in events:
        club_res = await db.execute(select(Club).where(Club.id == event.club_id))
        club = club_res.scalar_one_or_none()
        rsvp_count = await _get_rsvp_count(db, event.id)

        is_rsvped = False
        is_from_followed_club = event.club_id in followed_club_ids
        recommendation_score = 0.0

        if user_id:
            rsvp_check_res = await db.execute(
                select(RSVP).where(RSVP.event_id == event.id, RSVP.user_id == user_id)
            )
            is_rsvped = rsvp_check_res.scalar_one_or_none() is not None
            if type == "recommended":
                recommendation_score = _calculate_recommendation_score(event, interest_tokens, is_from_followed_club)

        result.append(_build_event_dict(
            event, club.name if club else None, rsvp_count,
            is_rsvped=is_rsvped,
            is_from_followed_club=is_from_followed_club,
            recommendation_score=recommendation_score,
        ))
    return result


@router.get("/{event_id}")
async def get_event(event_id: int, user_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    """Get a single event by ID."""
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
    rsvp_count = await _get_rsvp_count(db, event.id)

    is_rsvped = False
    if user_id:
        rsvp_check_res = await db.execute(
            select(RSVP).where(RSVP.event_id == event.id, RSVP.user_id == user_id)
        )
        is_rsvped = rsvp_check_res.scalar_one_or_none() is not None

    # Live activity: RSVPs in the last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_res = await db.execute(
        select(func.count()).select_from(RSVP).where(
            RSVP.event_id == event.id,
            RSVP.created_at >= one_hour_ago
        )
    )
    recent_rsvps = recent_res.scalar_one()

    return _build_event_dict(
        event, club.name if club else None, rsvp_count,
        is_rsvped=is_rsvped,
        recent_activity=recent_rsvps,
    )


@router.post("/")
async def create_event(
    event: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new event. Only CLUB_ADMIN users who own the club can create events."""
    _validate_short_description(event.description)

    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only club admins can create events")

    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
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
    await db.commit()
    await db.refresh(db_event)

    return _build_event_dict(db_event, club.name, 0)


@router.post("/{event_id}/poster")
async def upload_event_poster(
    event_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload or replace an event poster in Supabase Storage bucket."""
    event = await _require_admin_owned_event(event_id, db, current_user)

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

    await db.commit()
    await db.refresh(event)

    return {
        "status": "success",
        "event_id": event.id,
        "image_url": poster_payload["image_url"],
        "poster_storage_path": poster_payload["poster_storage_path"],
        "max_size_bytes": MAX_POSTER_BYTES,
    }


@router.put("/{event_id}")
async def update_event(
    event_id: int,
    event_update: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing event. Only the club admin who owns the event can update it."""
    _validate_short_description(event_update.description)

    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
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

    await db.commit()
    await db.refresh(event)

    # Refresh club reference after commit
    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
    rsvp_count = await _get_rsvp_count(db, event.id)

    return _build_event_dict(event, club.name if club else None, rsvp_count)


@router.get("/{event_id}/attendance-qr")
async def get_event_attendance_qr(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance QR payload for an event (club admin owner only)."""
    event = await _require_admin_owned_event(event_id, db, current_user)

    if not event.attendance_qr_code:
        event.attendance_qr_code = uuid.uuid4().hex
        await db.commit()
        await db.refresh(event)

    return {
        "event_id": event.id,
        "attendance_qr_open": bool(event.attendance_qr_open),
        "checkin_url": _build_attendance_checkin_url(event.id, event.attendance_qr_code),
    }


@router.post("/{event_id}/attendance-qr/open")
async def open_event_attendance_qr(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Open attendance QR for student scans (club admin owner only)."""
    event = await _require_admin_owned_event(event_id, db, current_user)

    if not event.attendance_qr_code:
        event.attendance_qr_code = uuid.uuid4().hex

    event.attendance_qr_open = True
    await db.commit()
    await db.refresh(event)

    return {
        "status": "success",
        "event_id": event.id,
        "attendance_qr_open": True,
        "checkin_url": _build_attendance_checkin_url(event.id, event.attendance_qr_code),
    }


@router.post("/{event_id}/attendance-qr/close")
async def close_event_attendance_qr(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Close attendance QR scans for an event (club admin owner only)."""
    event = await _require_admin_owned_event(event_id, db, current_user)

    event.attendance_qr_open = False
    await db.commit()

    return {
        "status": "success",
        "event_id": event.id,
        "attendance_qr_open": False,
    }


@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an event. Only the club admin who owns the event can delete it."""
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    club_res = await db.execute(select(Club).where(Club.id == event.club_id))
    club = club_res.scalar_one_or_none()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete events for your own club")

    if event.poster_storage_path or event.image_url:
        try:
            clear_event_poster(event)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=f"Failed to delete event poster from storage: {exc}") from exc

    # Delete associated RSVPs first
    await db.execute(
        sa_delete(RSVP).where(RSVP.event_id == event_id)
    )
    await db.delete(event)
    await db.commit()

    return {"status": "success", "message": "Event deleted"}


@router.get("/{event_id}/activity")
async def get_event_activity(event_id: int, db: AsyncSession = Depends(get_db)):
    """Get live activity for an event (RSVP count in the last hour)."""
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    if not event_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_res = await db.execute(
        select(func.count()).select_from(RSVP).where(
            RSVP.event_id == event_id,
            RSVP.created_at >= one_hour_ago
        )
    )
    recent_count = recent_res.scalar_one()

    total_res = await db.execute(
        select(func.count()).select_from(RSVP).where(RSVP.event_id == event_id)
    )
    total_count = total_res.scalar_one()

    return {
        "event_id": event_id,
        "recent_rsvps": recent_count,
        "total_rsvps": total_count,
    }
