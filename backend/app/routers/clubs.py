import json
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.follow import Follow
from app.models.user import User
from app.schemas import ClubCreate, ClubMemberCreate, ClubUpdate
from app.core.security import get_current_user
from app.services.club_logos import MAX_LOGO_BYTES, replace_club_logo
from typing import Optional

router = APIRouter()


def _club_payload(club: Club, follower_count: int, is_following: bool = False):
    admin_picture = club.admin.picture if club.admin else None
    icon_url = club.logo_url or admin_picture

    return {
        "id": club.id,
        "name": club.name,
        "logo_url": club.logo_url,
        "icon_url": icon_url,
        "admin_picture": admin_picture,
        "category": club.category,
        "instagram_handle": club.instagram_handle,
        "admin_id": club.admin_id,
        "follower_count": follower_count,
        "is_following": is_following,
    }


def _safe_json_list(raw_value):
    if not raw_value:
        return []
    try:
        data = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def _normalize_text(value) -> str:
    return str(value or "").strip().lower()


def _sync_user_joined_clubs(user: User, club_name: str, add: bool) -> bool:
    existing_values = _safe_json_list(user.joined_clubs)
    seen = set()
    normalized_club_name = _normalize_text(club_name)
    normalized_values = []

    for value in existing_values:
        cleaned = str(value or "").strip()
        if not cleaned:
            continue
        key = _normalize_text(cleaned)
        if key in seen:
            continue
        seen.add(key)
        normalized_values.append(cleaned)

    if add:
        already_present = any(_normalize_text(value) == normalized_club_name for value in normalized_values)
        if not already_present:
            normalized_values.append(club_name)
    else:
        normalized_values = [
            value for value in normalized_values if _normalize_text(value) != normalized_club_name
        ]

    user.joined_clubs = json.dumps(normalized_values)
    return True


def _get_owned_club(club_id: int, current_user: User, db: Session) -> Club:
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if current_user.role != "CLUB_ADMIN" or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage members for your own club")

    return club


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

        result.append(_club_payload(club, follower_count, is_following))
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

    return _club_payload(club, follower_count, is_following)


@router.get("/{club_id}/members")
def get_club_members(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all club members. Only the owning CLUB_ADMIN can access this."""
    _get_owned_club(club_id, current_user, db)

    member_rows = (
        db.query(ClubMember, User)
        .join(User, ClubMember.user_id == User.id)
        .filter(ClubMember.club_id == club_id)
        .all()
    )

    members = []
    for membership, student in member_rows:
        members.append(
            {
                "id": membership.id,
                "club_id": membership.club_id,
                "user_id": membership.user_id,
                "created_at": membership.created_at.isoformat() if membership.created_at else None,
                "name": student.name,
                "email": student.email,
                "picture": student.picture,
                "department": student.department,
                "degree": student.degree,
                "batch": student.batch,
                "register_number": student.register_number,
            }
        )

    members.sort(key=lambda member: (_normalize_text(member.get("name") or member.get("email")), member["user_id"]))

    return {
        "club_id": club_id,
        "member_count": len(members),
        "members": members,
    }


@router.post("/{club_id}/members", status_code=status.HTTP_201_CREATED)
def add_club_member(
    club_id: int,
    payload: ClubMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a student as a club member. Only the owning CLUB_ADMIN can access this."""
    club = _get_owned_club(club_id, current_user, db)

    student = db.query(User).filter(User.id == payload.user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.role != "STUDENT":
        raise HTTPException(status_code=422, detail="Only students can be added as club members")

    existing = (
        db.query(ClubMember)
        .filter(ClubMember.club_id == club_id, ClubMember.user_id == payload.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Student is already a club member")

    membership = ClubMember(club_id=club_id, user_id=payload.user_id)
    db.add(membership)
    _sync_user_joined_clubs(student, club.name, add=True)

    db.commit()
    db.refresh(membership)

    return {
        "id": membership.id,
        "club_id": membership.club_id,
        "user_id": membership.user_id,
        "created_at": membership.created_at.isoformat() if membership.created_at else None,
        "name": student.name,
        "email": student.email,
        "picture": student.picture,
        "department": student.department,
        "degree": student.degree,
        "batch": student.batch,
        "register_number": student.register_number,
    }


@router.delete("/{club_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_club_member(
    club_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a student from club members. Only the owning CLUB_ADMIN can access this."""
    club = _get_owned_club(club_id, current_user, db)

    membership = (
        db.query(ClubMember)
        .filter(ClubMember.club_id == club_id, ClubMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Student is not a member of this club")

    student = db.query(User).filter(User.id == user_id).first()
    db.delete(membership)

    if student:
        _sync_user_joined_clubs(student, club.name, add=False)

    db.commit()
    return None


@router.post("/")
def create_club(club: ClubCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new club. Only CLUB_ADMIN users can create clubs."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only CLUB_ADMIN users can create clubs")

    # Check if admin already has a club
    existing = db.query(Club).filter(Club.admin_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This admin already manages a club")

    requested_logo_url = (club.logo_url or "").strip()
    default_logo_url = (current_user.picture or "").strip()

    db_club = Club(
        name=club.name,
        logo_url=requested_logo_url or default_logo_url or None,
        category=club.category,
        instagram_handle=club.instagram_handle,
        admin_id=current_user.id,
    )
    db.add(db_club)
    db.commit()
    db.refresh(db_club)

    return _club_payload(db_club, follower_count=0, is_following=False)


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
        normalized_logo_url = (club_update.logo_url or "").strip()
        fallback_logo_url = (current_user.picture or "").strip()
        club.logo_url = normalized_logo_url or fallback_logo_url or None
    if club_update.instagram_handle is not None:
        club.instagram_handle = club_update.instagram_handle

    db.commit()
    db.refresh(club)

    follower_count = db.query(Follow).filter(Follow.club_id == club.id).count()

    return _club_payload(club, follower_count=follower_count, is_following=False)


@router.post("/{club_id}/logo")
async def upload_club_logo(
    club_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload or replace a club logo in Supabase Storage under club_logos/club-<id>/."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own club logo")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Logo file is empty")

    try:
        logo_payload = replace_club_logo(club, file_bytes, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Logo upload failed. Verify Supabase bucket settings. {exc}",
        ) from exc

    db.commit()
    db.refresh(club)

    follower_count = db.query(Follow).filter(Follow.club_id == club.id).count()

    return {
        "status": "success",
        "club_id": club.id,
        "logo_url": logo_payload["logo_url"],
        "logo_storage_path": logo_payload["logo_storage_path"],
        "max_size_bytes": MAX_LOGO_BYTES,
        "club": _club_payload(club, follower_count=follower_count, is_following=False),
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
            "is_paid": event.is_paid,
            "registration_fees": event.registration_fees,
            "payment_link": event.payment_link,
            "rsvp_count": rsvp_count,
            "attended_count": attended_count,
            "attendance_qr_open": bool(event.attendance_qr_open),
        })
    return result
