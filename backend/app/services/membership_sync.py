from __future__ import annotations

import json
from collections.abc import Iterable
from typing import TYPE_CHECKING, Any

from app.utils.common import normalize_text, unique_non_empty_strings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models.user import User


def normalize_requested_club_names(values: Iterable[Any]) -> list[str]:
    return unique_non_empty_strings(values)


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


def resolve_requested_clubs(clubs: Iterable[Any], requested_names: Iterable[Any]) -> list[Any]:
    requested = normalize_requested_club_names(requested_names)
    if not requested:
        return []

    club_by_name = {}
    for club in clubs:
        club_name = str(getattr(club, "name", "") or "").strip()
        key = normalize_text(club_name)
        if key and key not in club_by_name:
            club_by_name[key] = club

    resolved = []
    seen = set()
    for requested_name in requested:
        club = club_by_name.get(normalize_text(requested_name))
        if club is None:
            continue

        club_id = getattr(club, "id", None) or normalize_text(getattr(club, "name", ""))
        if club_id in seen:
            continue
        seen.add(club_id)
        resolved.append(club)

    return resolved


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


def add_missing_memberships_for_requested_clubs(db: Session, user: User, requested_names: Iterable[Any]) -> list[Any]:
    from app.models.club import Club
    from app.models.club_member import ClubMember

    requested_clubs = resolve_requested_clubs(db.query(Club).all(), requested_names)
    if not requested_clubs:
        return []

    requested_club_ids = [club.id for club in requested_clubs]
    existing_membership_ids = {
        club_id
        for (club_id,) in (
            db.query(ClubMember.club_id)
            .filter(ClubMember.user_id == user.id, ClubMember.club_id.in_(requested_club_ids))
            .all()
        )
    }

    added_clubs = []
    for club in requested_clubs:
        if club.id in existing_membership_ids:
            continue
        db.add(ClubMember(club_id=club.id, user_id=user.id))
        added_clubs.append(club)

    return added_clubs


def sync_user_joined_clubs_projection(db: Session, user: User) -> list[str]:
    db.flush()
    joined_clubs = project_joined_club_names(get_user_membership_clubs(db, user.id))
    user.joined_clubs = json.dumps(joined_clubs)
    return joined_clubs