from app.core.security import GOOGLE_CALENDAR_SCOPE
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


def auth_me_payload(user: User) -> dict:
    payload = user_profile_payload(user)
    granted_scopes_list = safe_json_list(user.google_scopes)
    payload.update(
        {
            "google_scopes": granted_scopes_list,
            "has_google_calendar_access": GOOGLE_CALENDAR_SCOPE in granted_scopes_list,
        }
    )
    return payload
