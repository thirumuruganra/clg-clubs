import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from app.services.membership_sync import (
    project_joined_club_names,
    resolve_requested_clubs,
    sync_user_joined_clubs_projection,
)


class _FakeDb:
    def __init__(self) -> None:
        self.flush_called = False

    def flush(self) -> None:
        self.flush_called = True


class MembershipSyncTests(unittest.TestCase):
    def test_resolve_requested_clubs_ignores_duplicates_and_unknown_names(self) -> None:
        robotics = SimpleNamespace(id=uuid4(), name="Robotics Club")
        ai = SimpleNamespace(id=uuid4(), name="AI Club")

        resolved = resolve_requested_clubs(
            [robotics, ai],
            [" robotics club ", "ROBOTICS CLUB", "Unknown Club", "AI Club"],
        )

        self.assertEqual([club.id for club in resolved], [robotics.id, ai.id])

    def test_project_joined_club_names_uses_membership_source_of_truth(self) -> None:
        projected = project_joined_club_names(
            [
                SimpleNamespace(name=" Robotics Club "),
                SimpleNamespace(name="AI Club"),
                SimpleNamespace(name="robotics club"),
                SimpleNamespace(name=""),
            ]
        )

        self.assertEqual(projected, ["AI Club", "Robotics Club"])

    def test_sync_user_joined_clubs_projection_updates_json_from_memberships(self) -> None:
        db = _FakeDb()
        user = SimpleNamespace(id=uuid4(), joined_clubs='["Legacy Club"]')
        clubs = [
            SimpleNamespace(name="Robotics Club"),
            SimpleNamespace(name="AI Club"),
        ]

        with patch("app.services.membership_sync.get_user_membership_clubs", return_value=clubs):
            joined_clubs = sync_user_joined_clubs_projection(db, user)

        self.assertTrue(db.flush_called)
        self.assertEqual(joined_clubs, ["AI Club", "Robotics Club"])
        self.assertEqual(json.loads(user.joined_clubs), ["AI Club", "Robotics Club"])

    def test_sync_user_joined_clubs_projection_drops_removed_membership(self) -> None:
        db = _FakeDb()
        user = SimpleNamespace(id=uuid4(), joined_clubs='["AI Club", "Robotics Club"]')

        with patch(
            "app.services.membership_sync.get_user_membership_clubs",
            return_value=[SimpleNamespace(name="Robotics Club")],
        ):
            joined_clubs = sync_user_joined_clubs_projection(db, user)

        self.assertEqual(joined_clubs, ["Robotics Club"])
        self.assertEqual(json.loads(user.joined_clubs), ["Robotics Club"])


if __name__ == "__main__":
    unittest.main()