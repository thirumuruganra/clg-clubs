from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.user import User


def is_club_head(user: User, club: Club) -> bool:
    return user.role == "CLUB_ADMIN" and club.admin_id == user.id


def has_delegated_admin_access(user_id: UUID, club_id: UUID, db: Session) -> bool:
    return db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == user_id,
        ClubMember.is_delegated_admin == True,
    ).first() is not None


def has_club_admin_access(user: User, club: Club, db: Session) -> bool:
    return is_club_head(user, club) or has_delegated_admin_access(user.id, club.id, db)


def require_club_head(club_id: UUID, current_user: User, db: Session) -> Club:
    """Strict: only the club head. Use for settings, member add/remove, and granting access itself."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if not is_club_head(current_user, club):
        raise HTTPException(status_code=403, detail="You can only manage members for your own club")

    return club


def require_club_admin_access(club_id: UUID, current_user: User, db: Session) -> Club:
    """Permissive: club head OR a member with delegated admin access."""
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if not has_club_admin_access(current_user, club, db):
        raise HTTPException(status_code=403, detail="You don't have admin access to this club")

    return club
