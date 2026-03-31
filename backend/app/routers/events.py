from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.event import Event
from app.models.club import Club
from app.models.rsvp import RSVP
from app.models.follow import Follow
from app.schemas import EventCreate, EventUpdate, EventResponse
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


@router.get("/all")
def get_all_events(db: Session = Depends(get_db)):
    """Get all events (for calendar view)."""
    events = db.query(Event).order_by(Event.start_time.asc()).all()
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
            "rsvp_count": rsvp_count,
        })
    return result


@router.get("/feed")
def get_event_feed(
    type: str = Query("following", pattern="^(following|discover)$"),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get event feed.
    - type=following: events from clubs the user follows
    - type=discover: events from clubs the user does NOT follow
    """
    if not user_id:
        # If no user_id, return all events as discover
        events = db.query(Event).order_by(Event.start_time.asc()).all()
    else:
        # Get IDs of clubs the user follows
        followed_club_ids = [
            f.club_id for f in db.query(Follow).filter(Follow.user_id == user_id).all()
        ]

        if type == "following":
            if not followed_club_ids:
                return []
            events = db.query(Event).filter(
                Event.club_id.in_(followed_club_ids)
            ).order_by(Event.start_time.asc()).all()
        else:  # discover
            if followed_club_ids:
                events = db.query(Event).filter(
                    ~Event.club_id.in_(followed_club_ids)
                ).order_by(Event.start_time.asc()).all()
            else:
                events = db.query(Event).order_by(Event.start_time.asc()).all()

    result = []
    for event in events:
        club = db.query(Club).filter(Club.id == event.club_id).first()
        rsvp_count = db.query(RSVP).filter(RSVP.event_id == event.id).count()
        is_rsvped = False
        if user_id:
            is_rsvped = db.query(RSVP).filter(
                RSVP.event_id == event.id, RSVP.user_id == user_id
            ).first() is not None

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
            "rsvp_count": rsvp_count,
            "is_rsvped": is_rsvped,
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
        "rsvp_count": rsvp_count,
        "is_rsvped": is_rsvped,
        "recent_activity": recent_rsvps,
    }


@router.post("/")
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """Create a new event. Should be called by CLUB_ADMIN users."""
    # Verify the club exists
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    db_event = Event(
        club_id=event.club_id,
        title=event.title,
        description=event.description,
        location=event.location,
        start_time=event.start_time,
        end_time=event.end_time,
        tag=event.tag,
        image_url=event.image_url,
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
        "rsvp_count": 0,
    }


@router.put("/{event_id}")
def update_event(event_id: int, event_update: EventUpdate, db: Session = Depends(get_db)):
    """Update an existing event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

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
        "rsvp_count": rsvp_count,
    }


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

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
