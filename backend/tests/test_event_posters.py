import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from app.services.event_posters import (
    MAX_POSTERS_PER_CLUB,
    cleanup_event_poster_overflow,
    clear_event_poster,
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


def _build_db(events: list) -> SimpleNamespace:
    query_result = SimpleNamespace(filter=lambda *a, **k: SimpleNamespace(all=lambda: events))
    return SimpleNamespace(query=lambda *a, **k: query_result, commit=Mock())


class EventPosterRetentionTests(unittest.TestCase):
    def test_cleanup_event_poster_overflow_removes_oldest_posters_per_club(self) -> None:
        club_id = uuid4()
        base_time = datetime(2026, 5, 18, 10, 0, 0)
        events = [
            _build_event(club_id=club_id, poster_storage_path=f"poster-{i}", poster_uploaded_at=base_time + timedelta(hours=i))
            for i in range(MAX_POSTERS_PER_CLUB + 1)
        ]
        oldest = events[0]
        db = _build_db(events)

        with patch("app.services.event_posters.clear_event_poster") as clear_event_poster_mock:
            summary = cleanup_event_poster_overflow(db)

        clear_event_poster_mock.assert_called_once_with(oldest)
        db.commit.assert_called_once_with()
        self.assertEqual(summary, {"checked": len(events), "deleted": 1, "failed": 0})

    def test_cleanup_event_poster_overflow_noop_under_the_limit(self) -> None:
        events = [_build_event(poster_storage_path="only-poster")]
        db = _build_db(events)

        with patch("app.services.event_posters.clear_event_poster") as clear_event_poster_mock:
            summary = cleanup_event_poster_overflow(db)

        clear_event_poster_mock.assert_not_called()
        db.commit.assert_not_called()
        self.assertEqual(summary, {"checked": 1, "deleted": 0, "failed": 0})

    def test_replace_event_poster_uploads_and_sets_metadata(self) -> None:
        event = _build_event()

        with patch(
            "app.services.event_posters.upload_image",
            return_value="https://storage.example/poster.png",
        ) as upload_image_mock:
            payload = replace_event_poster(event, b"\x89PNG\r\n\x1a\n" + b"rest", "image/png")

        upload_image_mock.assert_called_once()
        self.assertEqual(payload["image_url"], "https://storage.example/poster.png")
        self.assertTrue(event.poster_storage_path.endswith("/poster"))
        self.assertEqual(event.poster_mime_type, "image/png")
        self.assertIsNotNone(event.poster_uploaded_at)
        self.assertIsNone(event.poster_deleted_at)

    def test_replace_event_poster_rejects_spoofed_content_type(self) -> None:
        event = _build_event()

        with self.assertRaises(ValueError):
            replace_event_poster(event, b"<script>not-an-image</script>", "image/png")

    def test_clear_event_poster_deletes_storage_object_and_resets_fields(self) -> None:
        event = _build_event(image_url="https://storage.example/poster.png", poster_storage_path="clubs/x/event-1/poster")

        with patch("app.services.event_posters.delete_storage_object") as delete_storage_object_mock:
            clear_event_poster(event)

        delete_storage_object_mock.assert_called_once_with("clubs/x/event-1/poster")
        self.assertIsNone(event.image_url)
        self.assertIsNone(event.poster_storage_path)
        self.assertIsNotNone(event.poster_deleted_at)


if __name__ == "__main__":
    unittest.main()
