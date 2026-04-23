from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.follow import Follow
from app.models.club import Club
from app.models.user import User
from app.core.audit import log_security_event
from app.core.security import get_current_user
from app.services.authz_rules import require_self_access
from uuid import UUID

router = APIRouter()


@router.post("/clubs/{club_id}/follow")
def follow_club(club_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Follow a club. Requires authentication."""
    # Verify club exists
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Check if already following
    existing = db.query(Follow).filter(
        Follow.user_id == current_user.id, Follow.club_id == club_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already following this club")

    follow = Follow(user_id=current_user.id, club_id=club_id)
    db.add(follow)
    db.commit()
    db.refresh(follow)

    return {
        "status": "success",
        "message": f"Now following {club.name}",
        "follow_id": follow.id,
    }


@router.delete("/clubs/{club_id}/follow")
def unfollow_club(club_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Unfollow a club. Requires authentication."""
    follow = db.query(Follow).filter(
        Follow.user_id == current_user.id, Follow.club_id == club_id
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this club")

    db.delete(follow)
    db.commit()

    return {"status": "success", "message": "Unfollowed club"}


@router.get("/users/{user_id}/following")
def get_user_following(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all clubs a user follows (self only)."""
    try:
        require_self_access(current_user.id, user_id, detail="You can only view your own following list")
    except HTTPException:
        log_security_event(
            "authz.following.denied",
            actor_user_id=current_user.id,
            target_user_id=user_id,
        )
        raise

    follows = db.query(Follow).filter(Follow.user_id == user_id).all()

    result = []
    for f in follows:
        club = db.query(Club).filter(Club.id == f.club_id).first()
        if club:
            follower_count = db.query(Follow).filter(Follow.club_id == club.id).count()
            result.append({
                "id": club.id,
                "name": club.name,
                "logo_url": club.logo_url,
                "category": club.category,
                "follower_count": follower_count,
            })
    log_security_event("authz.following.read", actor_user_id=current_user.id, target_user_id=user_id)
    return result


@router.get("/clubs/{club_id}/followers")
def get_club_followers(
    club_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all followers for a club. Only the owning CLUB_ADMIN can access this."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if current_user.role != "CLUB_ADMIN" or club.admin_id != current_user.id:
        log_security_event(
            "authz.club_followers.denied",
            actor_user_id=current_user.id,
            club_id=club_id,
        )
        raise HTTPException(status_code=403, detail="You can only view followers for your own club")

    follows = db.query(Follow).filter(Follow.club_id == club_id).all()

    followers = []
    for follow in follows:
        student = db.query(User).filter(User.id == follow.user_id).first()
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

    log_security_event("authz.club_followers.read", actor_user_id=current_user.id, club_id=club_id, count=len(followers))

    return {
        "club_id": club_id,
        "follower_count": len(followers),
        "followers": followers,
    }
