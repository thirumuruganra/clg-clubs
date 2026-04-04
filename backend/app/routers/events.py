from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
import json
import re
from app.database import get_db
from app.models.event import Event
from app.models.club import Club
from app.models.rsvp import RSVP
from app.models.follow import Follow
from app.models.user import User
from app.schemas import EventCreate, EventUpdate, EventResponse
from app.core.security import get_current_user
from datetime import datetime, timedelta
from typing import Optional, List

router = APIRouter()


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
            "rsvp_count": rsvp_count,
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
            "rsvp_count": rsvp_count,
            "is_rsvped": is_rsvped,
            "is_from_followed_club": is_from_followed_club,
            "recommendation_score": recommendation_score,
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
        "rsvp_count": rsvp_count,
        "is_rsvped": is_rsvped,
        "recent_activity": recent_rsvps,
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
        "rsvp_count": 0,
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
        event.image_url = event_update.image_url
    if event_update.keywords is not None:
        event.keywords = event_update.keywords

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
        "rsvp_count": rsvp_count,
    }


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an event. Only the club admin who owns the event can delete it."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete events for your own club")

    # Delete associated RSVPs first
    db.query(RSVP).filter(RSVP.event_id == event_id).delete()
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
