from sqlalchemy.orm import Session

from app.core.security import GOOGLE_CALENDAR_SCOPE
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.user import User
from app.utils.common import safe_json_list


def user_profile_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "batch": user.batch,
        "department": user.department,
        "degree": user.degree,
        "register_number": user.register_number,
        "joined_clubs": safe_json_list(user.joined_clubs),
        "interests": safe_json_list(user.interests),
    }


def _resolve_managed_club_id(user: User, db: Session):
    club = db.query(Club).filter(Club.admin_id == user.id).first()
    if club:
        return club.id

    membership = (
        db.query(ClubMember)
        .filter(ClubMember.user_id == user.id, ClubMember.is_delegated_admin == True)
        .first()
    )
    return membership.club_id if membership else None


def auth_me_payload(user: User, db: Session) -> dict:
    payload = user_profile_payload(user)
    granted_scopes_list = safe_json_list(user.google_scopes)
    payload.update(
        {
            "google_scopes": granted_scopes_list,
            "has_google_calendar_access": GOOGLE_CALENDAR_SCOPE in granted_scopes_list,
            "managed_club_id": _resolve_managed_club_id(user, db),
        }
    )
    return payload
