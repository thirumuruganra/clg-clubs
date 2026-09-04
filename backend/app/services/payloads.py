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
        "section": user.section,
        "joined_clubs": safe_json_list(user.joined_clubs),
        "interests": safe_json_list(user.interests),
    }


def _resolve_managed_clubs(user: User, db: Session) -> list[dict]:
    head_clubs = db.query(Club).filter(Club.admin_id == user.id).all()

    delegated_club_ids = [
        row.club_id
        for row in db.query(ClubMember)
        .filter(ClubMember.user_id == user.id, ClubMember.is_delegated_admin == True)
        .all()
    ]
    delegated_clubs = (
        db.query(Club).filter(Club.id.in_(delegated_club_ids)).all()
        if delegated_club_ids
        else []
    )

    managed = [
        {"id": club.id, "name": club.name, "logo_url": club.logo_url, "is_head": True}
        for club in head_clubs
    ] + [
        {"id": club.id, "name": club.name, "logo_url": club.logo_url, "is_head": False}
        for club in delegated_clubs
    ]
    return managed


def event_payload(event, club, rsvp_count: int, **extra) -> dict:
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
        "payment_link": event.payment_link,
        "payment_qr_url": event.payment_qr_url,
        "is_paid": event.is_paid,
        "registration_fees": event.registration_fees,
        "rsvp_count": rsvp_count,
        "attendance_qr_open": bool(event.attendance_qr_open),
        "collect_feedback": bool(event.collect_feedback),
        **extra,
    }


def auth_me_payload(user: User, db: Session) -> dict:
    payload = user_profile_payload(user)
    granted_scopes_list = safe_json_list(user.google_scopes)
    managed_clubs = _resolve_managed_clubs(user, db)
    payload.update(
        {
            "google_scopes": granted_scopes_list,
            "has_google_calendar_access": GOOGLE_CALENDAR_SCOPE in granted_scopes_list,
            "managed_club_id": managed_clubs[0]["id"] if managed_clubs else None,
            "managed_clubs": managed_clubs,
        }
    )
    return payload
