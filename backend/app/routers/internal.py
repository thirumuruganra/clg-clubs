import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.event_posters import cleanup_event_poster_overflow

router = APIRouter()


def _verify_cron_secret(x_internal_cron_secret: str | None = Header(default=None)) -> None:
    expected = os.getenv("INTERNAL_CRON_SECRET", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="INTERNAL_CRON_SECRET is not configured")

    provided = (x_internal_cron_secret or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid cron secret")


@router.post("/cleanup-posters", dependencies=[Depends(_verify_cron_secret)])
def trigger_poster_cleanup(db: Session = Depends(get_db)):
    """Purge event posters beyond the per-club retention limit. Called by an external cron trigger."""
    return cleanup_event_poster_overflow(db)
