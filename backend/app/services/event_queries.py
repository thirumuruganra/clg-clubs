from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Query, Session

from app.models.club import Club
from app.models.event import Event
from app.models.rsvp import RSVP

"""
Shared event-list query builder.

Every list endpoint that returns events was issuing one extra query per
event for its club, its RSVP count, and (where relevant) the caller's own
RSVP — an N+1 pattern that scales with the size of the event catalogue.
event_rows_query() builds one query carrying the club join and any needed
counts as correlated scalar subqueries, so layering a filter or sort on
top never reintroduces a per-row loop.
"""


def _rsvp_count_subquery(*extra_filters):
    stmt = select(func.count(RSVP.id)).where(RSVP.event_id == Event.id, *extra_filters)
    return stmt.correlate(Event).scalar_subquery()


def event_rows_query(
    db: Session,
    *,
    personalization_user_id: Optional[UUID] = None,
    with_attended: bool = False,
) -> Query:
    """
    Query yielding (Event, Club, rsvp_count[, personal_attended][, attended_count]).

    `personal_attended` is the caller's own RSVP.attended value, or None if
    they haven't RSVPed — so `is_rsvped = personal_attended is not None`.
    `attended_count` (used by the club events tab) counts marked-attended RSVPs.
    """
    columns = [Event, Club, _rsvp_count_subquery().label("rsvp_count")]

    if personalization_user_id is not None:
        personal_attended = (
            select(RSVP.attended)
            .where(RSVP.event_id == Event.id, RSVP.user_id == personalization_user_id)
            .correlate(Event)
            .limit(1)
            .scalar_subquery()
        )
        columns.append(personal_attended.label("personal_attended"))

    if with_attended:
        columns.append(_rsvp_count_subquery(RSVP.attended == True).label("attended_count"))

    return db.query(*columns).join(Club, Event.club_id == Club.id)


def apply_event_search(query: Query, search: Optional[str]) -> Query:
    """Case-insensitive match across title/description/keywords."""
    if not search or not search.strip():
        return query
    search_term = f"%{search.strip()}%"
    return query.filter(
        or_(
            Event.title.ilike(search_term),
            Event.description.ilike(search_term),
            Event.keywords.ilike(search_term),
        )
    )


def apply_event_filters(
    query: Query,
    *,
    tag: Optional[str] = None,
    is_paid: Optional[bool] = None,
    starts_within_days: Optional[int] = None,
) -> Query:
    if tag:
        query = query.filter(Event.tag == tag)
    if is_paid is not None:
        query = query.filter(Event.is_paid == is_paid)
    if starts_within_days is not None:
        now = datetime.utcnow()
        query = query.filter(
            Event.start_time >= now,
            Event.start_time <= now + timedelta(days=starts_within_days),
        )
    return query


def apply_event_sort(query: Query, sort: str) -> Query:
    if sort == "soonest":
        return query.order_by(Event.start_time.asc())
    if sort == "popular":
        # rsvp_count is the label event_rows_query() gives its correlated
        # subquery column; ordering by the alias is standard Postgres.
        return query.order_by(text("rsvp_count DESC"))
    return query
