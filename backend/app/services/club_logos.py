import os

from app.core.storage import (
    delete_storage_object,
    extract_storage_object_path_from_public_url,
    upload_storage_object,
)
from app.models.club import Club
from app.services.event_posters import sniff_image_mime_type


ALLOWED_LOGO_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_LOGO_BYTES = int(os.getenv("CLUB_LOGO_MAX_BYTES", str(2 * 1024 * 1024)))


def _build_object_path(club: Club) -> str:
    # Keep a stable object key per club so logo updates replace in-place.
    return f"club_logos/club-{club.id}/logo"


def replace_club_logo(club: Club, file_bytes: bytes, content_type: str) -> dict[str, str]:
    file_size = len(file_bytes)
    if file_size <= 0:
        raise ValueError("Logo file is empty")
    if file_size > MAX_LOGO_BYTES:
        raise ValueError(f"Logo file must be {MAX_LOGO_BYTES // (1024 * 1024)} MB or smaller")

    # Validate against the file's real content, not the client-supplied
    # (spoofable) Content-Type header.
    sniffed_type = sniff_image_mime_type(file_bytes)
    if sniffed_type is None or sniffed_type not in ALLOWED_LOGO_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_LOGO_MIME_TYPES))
        raise ValueError(f"Unsupported logo type. Allowed types: {allowed}")
    normalized_type = sniffed_type

    new_object_path = _build_object_path(club)
    new_public_url = upload_storage_object(
        new_object_path,
        file_bytes,
        normalized_type,
        cache_control_seconds=31536000,
        upsert=True,
    )

    previous_object_path = extract_storage_object_path_from_public_url(club.logo_url or "")
    if previous_object_path and previous_object_path != new_object_path:
        try:
            delete_storage_object(previous_object_path)
        except RuntimeError:
            # Old path cleanup is best effort when the folder naming changed.
            pass

    club.logo_url = new_public_url

    return {
        "logo_url": new_public_url,
        "logo_storage_path": new_object_path,
    }
