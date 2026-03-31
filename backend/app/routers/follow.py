from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.follow import Follow
from app.models.club import Club

router = APIRouter()


@router.post("/clubs/{club_id}/follow")
def follow_club(club_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """Follow a club."""
    # Verify club exists
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    # Check if already following
    existing = db.query(Follow).filter(
        Follow.user_id == user_id, Follow.club_id == club_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already following this club")

    follow = Follow(user_id=user_id, club_id=club_id)
    db.add(follow)
    db.commit()
    db.refresh(follow)

    return {
        "status": "success",
        "message": f"Now following {club.name}",
        "follow_id": follow.id,
    }


@router.delete("/clubs/{club_id}/follow")
def unfollow_club(club_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """Unfollow a club."""
    follow = db.query(Follow).filter(
        Follow.user_id == user_id, Follow.club_id == club_id
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this club")

    db.delete(follow)
    db.commit()

    return {"status": "success", "message": "Unfollowed club"}


@router.get("/users/{user_id}/following")
def get_user_following(user_id: int, db: Session = Depends(get_db)):
    """Get all clubs a user follows."""
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
    return result
