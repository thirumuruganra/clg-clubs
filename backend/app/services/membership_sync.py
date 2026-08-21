from __future__ import annotations

import json
from collections.abc import Iterable
from typing import TYPE_CHECKING, Any

from app.utils.common import normalize_text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models.user import User


def project_joined_club_names(clubs: Iterable[Any]) -> list[str]:
    names: list[str] = []
    seen = set()

    for club in sorted(clubs, key=lambda item: normalize_text(getattr(item, "name", ""))):
        club_name = str(getattr(club, "name", "") or "").strip()
        if not club_name:
            continue
        key = normalize_text(club_name)
        if key in seen:
            continue
        seen.add(key)
        names.append(club_name)

    return names


def get_user_membership_clubs(db: Session, user_id) -> list[Any]:
    from app.models.club import Club
    from app.models.club_member import ClubMember

    return (
        db.query(Club)
        .join(ClubMember, Club.id == ClubMember.club_id)
        .filter(ClubMember.user_id == user_id)
        .order_by(Club.name.asc())
        .all()
    )


def sync_user_joined_clubs_projection(db: Session, user: User) -> list[str]:
    db.flush()
    joined_clubs = project_joined_club_names(get_user_membership_clubs(db, user.id))
    user.joined_clubs = json.dumps(joined_clubs)
    return joined_clubs