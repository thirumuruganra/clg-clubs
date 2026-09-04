import os

from app.core.storage import delete_storage_object, extract_storage_object_path_from_public_url
from app.models.club import Club
from app.services.image_assets import ALLOWED_IMAGE_MIME_TYPES, upload_image, validate_image_bytes


ALLOWED_LOGO_MIME_TYPES = ALLOWED_IMAGE_MIME_TYPES
MAX_LOGO_BYTES = int(os.getenv("CLUB_LOGO_MAX_BYTES", str(2 * 1024 * 1024)))


def _build_object_path(club: Club) -> str:
    # Keep a stable object key per club so logo updates replace in-place.
    return f"club_logos/club-{club.id}/logo"


def replace_club_logo(club: Club, file_bytes: bytes, content_type: str) -> dict[str, str]:
    normalized_type = validate_image_bytes(file_bytes, MAX_LOGO_BYTES, ALLOWED_LOGO_MIME_TYPES, "Logo")

    new_object_path = _build_object_path(club)
    new_public_url = upload_image(new_object_path, file_bytes, normalized_type)

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
