import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("security.audit")


def log_security_event(event: str, **fields: Any) -> None:
    """Write security audit event as structured JSON."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    logger.info(json.dumps(record, default=str))
