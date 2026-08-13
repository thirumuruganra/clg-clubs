import asyncio
import logging
import time

import httpx

from app.services.authz_rules import PERSONALIZATION_DETAIL, SELF_ACCESS_DETAIL


logger = logging.getLogger(__name__)

NO_SERVICE_URL = "https://naas.isalman.dev/no"
# Every matching 403 previously made a live outbound call on the request path,
# so a burst of denied requests (or an attacker probing endpoints) fanned out
# into repeated calls to a third party we don't control. Cache the reason
# briefly instead of calling on every single request.
_CACHE_TTL_SECONDS = 300
_cache_lock = asyncio.Lock()
_cached_reason: str | None = None
_cached_at: float = 0.0

_ACCESS_DENIED_DETAILS = {
    PERSONALIZATION_DETAIL.lower(),
    SELF_ACCESS_DETAIL.lower(),
    "not authorized",
}
_ACCESS_DENIED_PREFIXES = (
    "only ",
    "you can only ",
)


def should_use_no_service_message(detail: object) -> bool:
    if not isinstance(detail, str):
        return False

    normalized_detail = detail.strip().lower()
    if not normalized_detail:
        return False

    return normalized_detail in _ACCESS_DENIED_DETAILS or normalized_detail.startswith(_ACCESS_DENIED_PREFIXES)


async def fetch_no_service_reason(fallback_detail: str) -> str:
    global _cached_reason, _cached_at

    now = time.monotonic()
    if _cached_reason is not None and (now - _cached_at) < _CACHE_TTL_SECONDS:
        return _cached_reason

    async with _cache_lock:
        # Re-check after acquiring the lock: another request may have
        # refreshed the cache while we were waiting.
        now = time.monotonic()
        if _cached_reason is not None and (now - _cached_at) < _CACHE_TTL_SECONDS:
            return _cached_reason

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(NO_SERVICE_URL)
                response.raise_for_status()
                payload = response.json()
        except Exception:
            logger.warning("No-as-a-Service request failed", exc_info=True)
            return fallback_detail

        reason = payload.get("reason")
        if isinstance(reason, str):
            stripped_reason = reason.strip()
            if stripped_reason:
                _cached_reason = stripped_reason
                _cached_at = now
                return stripped_reason

        return fallback_detail