from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.club import Club
from app.models.follow import Follow
from app.models.user import User
from app.schemas import ClubCreate, ClubUpdate
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


async def _get_follower_count(db: AsyncSession, club_id: int) -> int:
    res = await db.execute(
        select(func.count()).select_from(Follow).where(Follow.club_id == club_id)
    )
    return res.scalar_one()


async def _is_following(db: AsyncSession, user_id: int, club_id: int) -> bool:
    res = await db.execute(
        select(Follow).where(Follow.user_id == user_id, Follow.club_id == club_id)
    )
    return res.scalar_one_or_none() is not None


@router.get("/")
async def get_all_clubs(user_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    """Get all clubs with follower count and follow status for current user."""
    from sqlalchemy.orm import selectinload
    clubs_res = await db.execute(select(Club).options(selectinload(Club.admin)))
    clubs = clubs_res.scalars().all()

    result = []
    for club in clubs:
        follower_count = await _get_follower_count(db, club.id)
        following = False
        if user_id:
            following = await _is_following(db, user_id, club.id)
        result.append(_club_payload(club, follower_count, following))
    return result


@router.get("/{club_id}")
async def get_club(club_id: int, user_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    """Get a single club by ID."""
    from sqlalchemy.orm import selectinload
    res = await db.execute(select(Club).options(selectinload(Club.admin)).where(Club.id == club_id))
    club = res.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    follower_count = await _get_follower_count(db, club.id)
    following = False
    if user_id:
        following = await _is_following(db, user_id, club.id)

    return _club_payload(club, follower_count, following)


@router.post("/")
async def create_club(club: ClubCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new club. Only CLUB_ADMIN users can create clubs."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only CLUB_ADMIN users can create clubs")

    # Check if admin already has a club
    existing_res = await db.execute(select(Club).where(Club.admin_id == current_user.id))
    if existing_res.scalar_one_or_none():
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
    await db.commit()
    await db.refresh(db_club)

    # Re-fetch with admin relationship loaded
    from sqlalchemy.orm import selectinload
    res = await db.execute(select(Club).options(selectinload(Club.admin)).where(Club.id == db_club.id))
    db_club = res.scalar_one()

    return _club_payload(db_club, follower_count=0, is_following=False)


@router.put("/{club_id}")
async def update_club(club_id: int, club_update: ClubUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing club. Only the owning admin can update."""
    from sqlalchemy.orm import selectinload
    res = await db.execute(select(Club).options(selectinload(Club.admin)).where(Club.id == club_id))
    club = res.scalar_one_or_none()
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

    await db.commit()
    await db.refresh(club)

    follower_count = await _get_follower_count(db, club.id)

    return _club_payload(club, follower_count=follower_count, is_following=False)


@router.post("/{club_id}/logo")
async def upload_club_logo(
    club_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload or replace a club logo in Supabase Storage under club_logos/club-<id>/."""
    from sqlalchemy.orm import selectinload
    res = await db.execute(select(Club).options(selectinload(Club.admin)).where(Club.id == club_id))
    club = res.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own club logo")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Logo file is empty")

    try:
        logo_payload = await run_in_threadpool(replace_club_logo, club, file_bytes, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Logo upload failed. Verify Supabase bucket settings. {exc}",
        ) from exc

    await db.commit()
    await db.refresh(club)

    follower_count = await _get_follower_count(db, club.id)

    return {
        "status": "success",
        "club_id": club.id,
        "logo_url": logo_payload["logo_url"],
        "logo_storage_path": logo_payload["logo_storage_path"],
        "max_size_bytes": MAX_LOGO_BYTES,
        "club": _club_payload(club, follower_count=follower_count, is_following=False),
    }


@router.get("/{club_id}/events")
async def get_club_events(club_id: int, db: AsyncSession = Depends(get_db)):
    """Get all events for a specific club."""
    from app.models.event import Event
    from app.models.rsvp import RSVP

    club_res = await db.execute(select(Club).where(Club.id == club_id))
    club = club_res.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    events_res = await db.execute(
        select(Event).where(Event.club_id == club_id).order_by(Event.start_time.asc())
    )
    events = events_res.scalars().all()

    result = []
    for event in events:
        rsvp_count_res = await db.execute(
            select(func.count()).select_from(RSVP).where(RSVP.event_id == event.id)
        )
        rsvp_count = rsvp_count_res.scalar_one()

        attended_count_res = await db.execute(
            select(func.count()).select_from(RSVP).where(RSVP.event_id == event.id, RSVP.attended == True)
        )
        attended_count = attended_count_res.scalar_one()

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
