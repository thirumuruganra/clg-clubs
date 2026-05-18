import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from app.services.event_posters import (
    MAX_POSTERS_PER_CLUB,
    cleanup_club_event_poster_overflow,
    replace_event_poster,
)


def _build_event(**overrides):
    now = datetime(2026, 5, 18, 12, 0, 0)
    values = {
        "id": uuid4(),
        "club_id": uuid4(),
        "club": SimpleNamespace(name="Robotics Club"),
        "start_time": now,
        "end_time": now + timedelta(hours=2),
        "image_url": None,
        "poster_storage_path": None,
        "poster_mime_type": None,
        "poster_size_bytes": None,
        "poster_uploaded_at": None,
        "poster_deleted_at": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class EventPosterRetentionTests(unittest.TestCase):
    def test_cleanup_club_event_poster_overflow_removes_oldest_posters(self) -> None:
        db = SimpleNamespace(flush=Mock())
        club_id = uuid4()
        base_time = datetime(2026, 5, 18, 10, 0, 0)
        oldest = _build_event(club_id=club_id, poster_storage_path="oldest", poster_uploaded_at=base_time)
        newer = _build_event(
            club_id=club_id,
            poster_storage_path="newer",
            poster_uploaded_at=base_time + timedelta(hours=1),
        )
        newest = _build_event(
            club_id=club_id,
            poster_storage_path="newest",
            poster_uploaded_at=base_time + timedelta(hours=2),
        )

        with (
            patch(
                "app.services.event_posters._query_club_poster_events",
                return_value=[newest, oldest, newer],
            ),
            patch("app.services.event_posters.clear_event_poster") as clear_event_poster_mock,
        ):
            summary = cleanup_club_event_poster_overflow(db, club_id, max_posters=2)

        clear_event_poster_mock.assert_called_once_with(oldest)
        db.flush.assert_called_once_with()
        self.assertEqual(summary, {"checked": 3, "deleted": 1, "failed": 0})

    def test_replace_event_poster_prunes_before_storing_sixth_poster(self) -> None:
        db = SimpleNamespace()
        event = _build_event()

        with (
            patch(
                "app.services.event_posters.upload_storage_object",
                return_value="https://storage.example/poster.png",
            ) as upload_storage_object_mock,
            patch(
                "app.services.event_posters.cleanup_club_event_poster_overflow",
                return_value={"checked": 5, "deleted": 1, "failed": 0},
            ) as cleanup_mock,
        ):
            payload = replace_event_poster(db, event, b"poster-bytes", "image/png")

        upload_storage_object_mock.assert_called_once()
        cleanup_mock.assert_called_once_with(
            db,
            event.club_id,
            max_posters=MAX_POSTERS_PER_CLUB - 1,
            exclude_event_id=event.id,
        )
        self.assertEqual(payload["image_url"], "https://storage.example/poster.png")
        self.assertTrue(event.poster_storage_path.endswith("/poster"))
        self.assertEqual(event.poster_mime_type, "image/png")
        self.assertEqual(event.poster_size_bytes, len(b"poster-bytes"))
        self.assertIsNotNone(event.poster_uploaded_at)
        self.assertIsNone(event.poster_deleted_at)

    def test_replace_event_poster_does_not_prune_when_replacing_existing_poster(self) -> None:
        db = SimpleNamespace()
        event = _build_event(
            image_url="https://storage.example/existing.png",
            poster_storage_path="clubs/robotics/event-1/poster",
            poster_uploaded_at=datetime(2026, 5, 18, 11, 0, 0),
        )

        with (
            patch(
                "app.services.event_posters.upload_storage_object",
                return_value="https://storage.example/existing.png",
            ),
            patch("app.services.event_posters.cleanup_club_event_poster_overflow") as cleanup_mock,
        ):
            replace_event_poster(db, event, b"new-poster", "image/png")

        cleanup_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()