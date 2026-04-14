import os
from typing import Optional

from app.core.storage import (
    delete_storage_object,
    extract_storage_object_path_from_public_url,
    upload_storage_object,
)
from app.models.club import Club


ALLOWED_LOGO_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_LOGO_BYTES = int(os.getenv("CLUB_LOGO_MAX_BYTES", str(2 * 1024 * 1024)))


def _normalize_content_type(content_type: Optional[str]) -> str:
    if not content_type:
        return ""
    return content_type.split(";", 1)[0].strip().lower()


def _build_object_path(club: Club) -> str:
    # Keep a stable object key per club so logo updates replace in-place.
    return f"club_logos/club-{club.id}/logo"


def replace_club_logo(club: Club, file_bytes: bytes, content_type: str) -> dict[str, str]:
    normalized_type = _normalize_content_type(content_type)
    if normalized_type not in ALLOWED_LOGO_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_LOGO_MIME_TYPES))
        raise ValueError(f"Unsupported logo type. Allowed types: {allowed}")

    file_size = len(file_bytes)
    if file_size <= 0:
        raise ValueError("Logo file is empty")
    if file_size > MAX_LOGO_BYTES:
        raise ValueError(f"Logo file must be {MAX_LOGO_BYTES // (1024 * 1024)} MB or smaller")

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
