import os
import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.storage import (
    delete_storage_object,
    extract_storage_object_path_from_public_url,
    upload_storage_object,
)
from app.models.event import Event


ALLOWED_POSTER_MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
MAX_POSTER_BYTES = int(os.getenv("EVENT_POSTER_MAX_BYTES", str(2 * 1024 * 1024)))
MAX_POSTERS_PER_CLUB = max(1, int(os.getenv("EVENT_POSTER_MAX_PER_CLUB", "5")))


def _normalize_content_type(content_type: Optional[str]) -> str:
    if not content_type:
        return ""
    return content_type.split(";", 1)[0].strip().lower()


def sniff_image_mime_type(file_bytes: bytes) -> Optional[str]:
    """Identify an image's real type from its magic bytes.

    The client-supplied Content-Type header is attacker-controlled and easy to
    spoof (e.g. upload an HTML/SVG/script payload labeled image/png), so
    upload validation must be based on the actual file content instead.
    """
    if file_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if file_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP":
        return "image/webp"
    return None


def _slugify_segment(raw_value: Optional[str], fallback: str) -> str:
    if not raw_value:
        return fallback

    normalized = re.sub(r"[^a-z0-9]+", "-", raw_value.strip().lower())
    normalized = normalized.strip("-")
    if not normalized:
        return fallback

    return normalized[:80]


def _build_object_path(event: Event) -> str:
    club_name = event.club.name if getattr(event, "club", None) else None
    club_folder = _slugify_segment(club_name, f"club-{event.club_id}")
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
    file_size = len(file_bytes)
    if file_size <= 0:
        raise ValueError("Poster file is empty")
    if file_size > MAX_POSTER_BYTES:
        raise ValueError(f"Poster file must be {MAX_POSTER_BYTES // (1024 * 1024)} MB or smaller")

    # Validate against the file's real content, not the client-supplied
    # (spoofable) Content-Type header.
    sniffed_type = sniff_image_mime_type(file_bytes)
    if sniffed_type is None or sniffed_type not in ALLOWED_POSTER_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_POSTER_MIME_TYPES.keys()))
        raise ValueError(f"Unsupported poster type. Allowed types: {allowed}")
    normalized_type = sniffed_type

    previous_object_path = (event.poster_storage_path or "").strip()
    new_object_path = previous_object_path or _build_object_path(event)
    new_public_url = upload_storage_object(
        new_object_path,
        file_bytes,
        normalized_type,
        cache_control_seconds=31536000,
        upsert=True,
    )

    event.image_url = new_public_url
    event.poster_storage_path = new_object_path
    event.poster_mime_type = normalized_type
    event.poster_size_bytes = file_size
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
