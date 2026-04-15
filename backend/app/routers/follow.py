from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.follow import Follow
from app.models.club import Club
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()


@router.post("/clubs/{club_id}/follow")
async def follow_club(club_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Follow a club. Requires authentication."""
    # Verify club exists
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Check if already following
    existing_res = await db.execute(
        select(Follow).where(Follow.user_id == current_user.id, Follow.club_id == club_id)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already following this club")

    follow = Follow(user_id=current_user.id, club_id=club_id)
    db.add(follow)
    await db.commit()
    await db.refresh(follow)

    return {
        "status": "success",
        "message": f"Now following {club.name}",
        "follow_id": follow.id,
    }


@router.delete("/clubs/{club_id}/follow")
async def unfollow_club(club_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Unfollow a club. Requires authentication."""
    result = await db.execute(
        select(Follow).where(Follow.user_id == current_user.id, Follow.club_id == club_id)
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this club")

    await db.delete(follow)
    await db.commit()

    return {"status": "success", "message": "Unfollowed club"}


@router.get("/users/{user_id}/following")
async def get_user_following(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get all clubs a user follows."""
    follows_res = await db.execute(select(Follow).where(Follow.user_id == user_id))
    follows = follows_res.scalars().all()

    result = []
    for f in follows:
        club_res = await db.execute(select(Club).where(Club.id == f.club_id))
        club = club_res.scalar_one_or_none()
        if club:
            count_res = await db.execute(
                select(func.count()).select_from(Follow).where(Follow.club_id == club.id)
            )
            follower_count = count_res.scalar_one()
            result.append({
                "id": club.id,
                "name": club.name,
                "logo_url": club.logo_url,
                "category": club.category,
                "follower_count": follower_count,
            })
    return result


@router.get("/clubs/{club_id}/followers")
async def get_club_followers(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all followers for a club. Only the owning CLUB_ADMIN can access this."""
    club_res = await db.execute(select(Club).where(Club.id == club_id))
    club = club_res.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if current_user.role != "CLUB_ADMIN" or club.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view followers for your own club")

    follows_res = await db.execute(select(Follow).where(Follow.club_id == club_id))
    follows = follows_res.scalars().all()

    followers = []
    for follow in follows:
        student_res = await db.execute(select(User).where(User.id == follow.user_id))
        student = student_res.scalar_one_or_none()
        if not student:
            continue

        followers.append(
            {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "picture": student.picture,
                "department": student.department,
                "degree": student.degree,
                "batch": student.batch,
                "register_number": student.register_number,
            }
        )

    followers.sort(key=lambda follower: (follower.get("name") or "").lower())

    return {
        "club_id": club_id,
        "follower_count": len(followers),
        "followers": followers,
    }
