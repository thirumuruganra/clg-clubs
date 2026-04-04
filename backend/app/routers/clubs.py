from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.club import Club
from app.models.follow import Follow
from app.models.user import User
from app.schemas import ClubCreate, ClubUpdate
from app.core.security import get_current_user
from typing import Optional

router = APIRouter()


@router.get("/")
def get_all_clubs(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get all clubs with follower count and follow status for current user."""
    clubs = db.query(Club).all()
    result = []
    for club in clubs:
        follower_count = db.query(Follow).filter(Follow.club_id == club.id).count()
        is_following = False
        if user_id:
            is_following = db.query(Follow).filter(
                Follow.user_id == user_id, Follow.club_id == club.id
            ).first() is not None

        result.append({
            "id": club.id,
            "name": club.name,
            "logo_url": club.logo_url,
            "category": club.category,
            "instagram_handle": club.instagram_handle,
            "admin_id": club.admin_id,
            "follower_count": follower_count,
            "is_following": is_following,
        })
    return result


@router.get("/{club_id}")
def get_club(club_id: int, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get a single club by ID."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    follower_count = db.query(Follow).filter(Follow.club_id == club.id).count()
    is_following = False
    if user_id:
        is_following = db.query(Follow).filter(
            Follow.user_id == user_id, Follow.club_id == club.id
        ).first() is not None

    return {
        "id": club.id,
        "name": club.name,
        "logo_url": club.logo_url,
        "category": club.category,
        "instagram_handle": club.instagram_handle,
        "admin_id": club.admin_id,
        "follower_count": follower_count,
        "is_following": is_following,
    }


@router.post("/")
def create_club(club: ClubCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new club. Only CLUB_ADMIN users can create clubs."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only CLUB_ADMIN users can create clubs")

    # Check if admin already has a club
    existing = db.query(Club).filter(Club.admin_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This admin already manages a club")

    db_club = Club(
        name=club.name,
        logo_url=club.logo_url,
        category=club.category,
        instagram_handle=club.instagram_handle,
        admin_id=current_user.id,
    )
    db.add(db_club)
    db.commit()
    db.refresh(db_club)

    return {
        "id": db_club.id,
        "name": db_club.name,
        "logo_url": db_club.logo_url,
        "category": db_club.category,
        "instagram_handle": db_club.instagram_handle,
        "admin_id": db_club.admin_id,
        "follower_count": 0,
        "is_following": False,
    }


@router.put("/{club_id}")
def update_club(club_id: int, club_update: ClubUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing club. Only the owning admin can update."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own club")

    if club_update.name is not None:
        club.name = club_update.name
    if club_update.category is not None:
        club.category = club_update.category
    if club_update.logo_url is not None:
        club.logo_url = club_update.logo_url
    if club_update.instagram_handle is not None:
        club.instagram_handle = club_update.instagram_handle

    db.commit()
    db.refresh(club)

    follower_count = db.query(Follow).filter(Follow.club_id == club.id).count()

    return {
        "id": club.id,
        "name": club.name,
        "logo_url": club.logo_url,
        "category": club.category,
        "instagram_handle": club.instagram_handle,
        "admin_id": club.admin_id,
        "follower_count": follower_count,
    }


@router.get("/{club_id}/events")
def get_club_events(club_id: int, db: Session = Depends(get_db)):
    """Get all events for a specific club."""
    from app.models.event import Event
    from app.models.rsvp import RSVP

    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    events = db.query(Event).filter(Event.club_id == club_id).order_by(Event.start_time.asc()).all()
    result = []
    for event in events:
        rsvp_count = db.query(RSVP).filter(RSVP.event_id == event.id).count()
        attended_count = db.query(RSVP).filter(RSVP.event_id == event.id, RSVP.attended == True).count()
        result.append({
            "id": event.id,
            "club_id": event.club_id,
            "club_name": club.name,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "start_time": event.start_time.isoformat() if event.start_time else None,
            "end_time": event.end_time.isoformat() if event.end_time else None,
            "tag": event.tag,
            "image_url": event.image_url,
            "keywords": event.keywords,
            "rsvp_count": rsvp_count,
            "attended_count": attended_count,
        })
    return result
