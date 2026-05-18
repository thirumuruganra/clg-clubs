import logging

import httpx

from app.services.authz_rules import PERSONALIZATION_DETAIL, SELF_ACCESS_DETAIL


logger = logging.getLogger(__name__)

NO_SERVICE_URL = "https://naas.isalman.dev/no"

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
            return stripped_reason

    return fallback_detail