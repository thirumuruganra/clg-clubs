import os
from urllib.parse import quote

import requests


def is_supabase_storage_configured() -> bool:
    return all(
        [
            os.getenv("SUPABASE_URL", "").strip(),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
            os.getenv("SUPABASE_STORAGE_BUCKET", "").strip(),
        ]
    )


def _get_storage_config() -> tuple[str, str, str]:
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "").strip()

    if not supabase_url or not service_key or not bucket:
        raise RuntimeError(
            "Supabase Storage is not fully configured. "
            "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
        )

    return supabase_url, service_key, bucket


def build_public_storage_url(object_path: str) -> str:
    supabase_url, _, bucket = _get_storage_config()
    normalized_path = object_path.lstrip("/")
    encoded_path = quote(normalized_path, safe="/")
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{encoded_path}"


def upload_storage_object(
    object_path: str,
    payload: bytes,
    content_type: str,
    *,
    cache_control_seconds: int = 31536000,
) -> str:
    supabase_url, service_key, bucket = _get_storage_config()
    normalized_path = object_path.lstrip("/")
    encoded_path = quote(normalized_path, safe="/")
    endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{encoded_path}"

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": content_type,
        "x-upsert": "false",
    }

    response = requests.post(
        endpoint,
        params={"cacheControl": str(cache_control_seconds), "upsert": "false"},
        headers=headers,
        data=payload,
        timeout=25,
    )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Failed to upload object to Supabase Storage bucket '{bucket}' "
            f"(status={response.status_code}): {response.text[:300]}"
        )

    return build_public_storage_url(normalized_path)


def delete_storage_object(object_path: str) -> bool:
    supabase_url, service_key, bucket = _get_storage_config()
    normalized_path = object_path.lstrip("/")
    if not normalized_path:
        return False

    encoded_path = quote(normalized_path, safe="/")
    endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{encoded_path}"

    response = requests.delete(
        endpoint,
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        },
        timeout=25,
    )

    if response.status_code in {200, 204, 404}:
        return True

    raise RuntimeError(
        f"Failed to delete object from Supabase Storage bucket '{bucket}' "
        f"(status={response.status_code}): {response.text[:300]}"
    )
