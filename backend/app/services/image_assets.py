import re
from typing import Optional

from app.core.storage import upload_storage_object

ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


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


def slugify_segment(raw_value: Optional[str], fallback: str) -> str:
    if not raw_value:
        return fallback

    normalized = re.sub(r"[^a-z0-9]+", "-", raw_value.strip().lower())
    normalized = normalized.strip("-")
    return normalized[:80] if normalized else fallback


def validate_image_bytes(file_bytes: bytes, max_bytes: int, allowed_types: set[str], label: str) -> str:
    """Enforce size + real (sniffed) MIME type. Returns the validated MIME type."""
    file_size = len(file_bytes)
    if file_size <= 0:
        raise ValueError(f"{label} file is empty")
    if file_size > max_bytes:
        raise ValueError(f"{label} file must be {max_bytes // (1024 * 1024)} MB or smaller")

    sniffed_type = sniff_image_mime_type(file_bytes)
    if sniffed_type is None or sniffed_type not in allowed_types:
        allowed = ", ".join(sorted(allowed_types))
        raise ValueError(f"Unsupported {label.lower()} type. Allowed types: {allowed}")
    return sniffed_type


def upload_image(object_path: str, file_bytes: bytes, mime_type: str) -> str:
    return upload_storage_object(
        object_path,
        file_bytes,
        mime_type,
        cache_control_seconds=31536000,
        upsert=True,
    )
