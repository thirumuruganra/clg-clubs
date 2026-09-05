import os
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.storage import (
    delete_storage_object,
    extract_storage_object_path_from_public_url,
)
from app.models.event import Event
from app.services.image_assets import ALLOWED_IMAGE_MIME_TYPES, slugify_segment, upload_image, validate_image_bytes


ALLOWED_POSTER_MIME_TYPES = ALLOWED_IMAGE_MIME_TYPES
MAX_POSTER_BYTES = int(os.getenv("EVENT_POSTER_MAX_BYTES", str(2 * 1024 * 1024)))
MAX_POSTERS_PER_CLUB = max(1, int(os.getenv("EVENT_POSTER_MAX_PER_CLUB", "5")))


def _build_object_path(event: Event) -> str:
    club_name = event.club.name if getattr(event, "club", None) else None
    club_folder = slugify_segment(club_name, f"club-{event.club_id}")
    return f"clubs/{club_folder}/event-{event.id}/poster"


def _event_poster_age_key(event: Event) -> tuple[datetime, datetime, datetime, str]:
    return (
        event.poster_uploaded_at or datetime.min,
        event.start_time or datetime.min,
        event.end_time or datetime.min,
        str(event.id),
    )


def cleanup_event_poster_overflow(db: Session) -> dict[str, int]:
    poster_events = (
        db.query(Event)
        .filter(Event.poster_storage_path.isnot(None))
        .all()
    )

    club_events: dict[object, list[Event]] = {}
    for event in poster_events:
        club_events.setdefault(event.club_id, []).append(event)

    checked = len(poster_events)
    deleted = 0
    failed = 0

    for events in club_events.values():
        events.sort(key=_event_poster_age_key)
        overflow_count = max(0, len(events) - MAX_POSTERS_PER_CLUB)
        for event in events[:overflow_count]:
            try:
                clear_event_poster(event)
                deleted += 1
            except RuntimeError:
                failed += 1

    if deleted > 0:
        db.commit()

    return {
        "checked": checked,
        "deleted": deleted,
        "failed": failed,
    }


def replace_event_poster(event: Event, file_bytes: bytes, content_type: str) -> dict[str, str]:
    normalized_type = validate_image_bytes(file_bytes, MAX_POSTER_BYTES, ALLOWED_POSTER_MIME_TYPES, "Poster")

    previous_object_path = (event.poster_storage_path or "").strip()
    new_object_path = previous_object_path or _build_object_path(event)
    new_public_url = upload_image(new_object_path, file_bytes, normalized_type)

    event.image_url = new_public_url
    event.poster_storage_path = new_object_path
    event.poster_mime_type = normalized_type
    event.poster_size_bytes = len(file_bytes)
    event.poster_uploaded_at = datetime.utcnow()
    event.poster_deleted_at = None

    return {
        "image_url": new_public_url,
        "poster_storage_path": new_object_path,
    }


def clear_event_poster(event: Event) -> bool:
    object_path = (event.poster_storage_path or "").strip()
    if not object_path:
        object_path = extract_storage_object_path_from_public_url(event.image_url or "") or ""

    if object_path:
        delete_storage_object(object_path)

    event.image_url = None
    event.poster_storage_path = None
    event.poster_mime_type = None
    event.poster_size_bytes = None
    event.poster_deleted_at = datetime.utcnow()

    return True
