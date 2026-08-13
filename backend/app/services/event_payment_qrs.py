from datetime import datetime

from app.core.storage import delete_storage_object, extract_storage_object_path_from_public_url, upload_storage_object
from app.models.event import Event
from app.services.event_posters import (
    ALLOWED_POSTER_MIME_TYPES,
    MAX_POSTER_BYTES,
    _slugify_segment,
    sniff_image_mime_type,
)


def _build_object_path(event: Event) -> str:
    club_name = event.club.name if getattr(event, "club", None) else None
    club_folder = _slugify_segment(club_name, f"club-{event.club_id}")
    return f"clubs/{club_folder}/event-{event.id}/payment-qr"


def replace_event_payment_qr(event: Event, file_bytes: bytes, content_type: str) -> dict[str, str | int]:
    file_size = len(file_bytes)
    if file_size <= 0:
        raise ValueError("Payment QR file is empty")
    if file_size > MAX_POSTER_BYTES:
        raise ValueError(f"Payment QR file must be {MAX_POSTER_BYTES // (1024 * 1024)} MB or smaller")

    sniffed_type = sniff_image_mime_type(file_bytes)
    if sniffed_type is None or sniffed_type not in ALLOWED_POSTER_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_POSTER_MIME_TYPES.keys()))
        raise ValueError(f"Unsupported payment QR type. Allowed types: {allowed}")
    normalized_type = sniffed_type

    previous_object_path = (event.payment_qr_storage_path or "").strip()
    new_object_path = previous_object_path or _build_object_path(event)
    new_public_url = upload_storage_object(
        new_object_path,
        file_bytes,
        normalized_type,
        cache_control_seconds=31536000,
        upsert=True,
    )

    old_object_path = previous_object_path
    if old_object_path and old_object_path != new_object_path:
        try:
            delete_storage_object(old_object_path)
        except RuntimeError:
            pass

    event.payment_qr_url = new_public_url
    event.payment_qr_storage_path = new_object_path
    event.payment_qr_mime_type = normalized_type
    event.payment_qr_size_bytes = file_size
    event.payment_qr_uploaded_at = datetime.utcnow()
    event.payment_qr_deleted_at = None

    return {
        "payment_qr_url": new_public_url,
        "payment_qr_storage_path": new_object_path,
        "max_size_bytes": MAX_POSTER_BYTES,
    }


def clear_event_payment_qr(event: Event) -> bool:
    object_path = (event.payment_qr_storage_path or "").strip()
    if not object_path:
        object_path = extract_storage_object_path_from_public_url(event.payment_qr_url or "") or ""

    if object_path:
        delete_storage_object(object_path)

    event.payment_qr_url = None
    event.payment_qr_storage_path = None
    event.payment_qr_mime_type = None
    event.payment_qr_size_bytes = None
    event.payment_qr_deleted_at = datetime.utcnow()

    return True