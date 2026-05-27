import unittest
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException

from app.models.club_member import ClubMember
from app.models.event_worker import EventWorker
from app.models.rsvp import RSVP
from app.routers.rsvp import (
    WORKFORCE_ROLE_MEMBER,
    WORKFORCE_ROLE_VOLUNTEER,
    _ensure_member_assignment,
    _infer_attendance_role,
    _resolve_attendance_role,
    _sorted_rsvp_rows,
)


class _FakeQuery:
    def __init__(self, result):
        self._result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._result


class _FakeDb:
    def __init__(self, results=None):
        self.results = results or {}
        self.added = []

    def query(self, model):
        return _FakeQuery(self.results.get(model))

    def add(self, value):
        self.added.append(value)


def _build_event(club_id=None):
    return SimpleNamespace(id=uuid4(), club_id=club_id or uuid4())


def _build_rsvp(attendance_role, name, department, batch, degree="B.E."):
    return SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        attendance_role=attendance_role,
        attended=True,
        is_paid=False,
        attended_marked_at=datetime(2026, 5, 18, 10, 0, 0),
        created_at=datetime(2026, 5, 18, 9, 0, 0),
        event=None,
        user=SimpleNamespace(
            id=uuid4(),
            name=name,
            email=f"{name.lower()}@ssn.edu.in",
            department=department,
            degree=degree,
            batch=batch,
            register_number=f"3122{name[:3].upper()}123",
        ),
    )


class RSVPAttendanceTests(unittest.TestCase):
    def test_resolve_attendance_role_prefers_club_member(self):
        event = _build_event()
        db = _FakeDb(
            {
                ClubMember: SimpleNamespace(user_id=uuid4()),
                EventWorker: None,
            }
        )

        resolved = _resolve_attendance_role(event, uuid4(), db)

        self.assertEqual(resolved, RSVP.ATTENDANCE_ROLE_CLUB_MEMBER)

    def test_resolve_attendance_role_for_assigned_volunteer(self):
        event = _build_event()
        db = _FakeDb(
            {
                ClubMember: None,
                EventWorker: SimpleNamespace(role=WORKFORCE_ROLE_VOLUNTEER),
            }
        )

        resolved = _resolve_attendance_role(event, uuid4(), db)

        self.assertEqual(resolved, RSVP.ATTENDANCE_ROLE_VOLUNTEER)

    def test_resolve_attendance_role_for_regular_participant(self):
        event = _build_event()
        db = _FakeDb({ClubMember: None, EventWorker: None})

        resolved = _resolve_attendance_role(event, uuid4(), db)

        self.assertEqual(resolved, RSVP.ATTENDANCE_ROLE_PARTICIPANT)

    def test_resolve_attendance_role_rejects_member_volunteer_conflict(self):
        event = _build_event()
        db = _FakeDb(
            {
                ClubMember: SimpleNamespace(user_id=uuid4()),
                EventWorker: SimpleNamespace(role=WORKFORCE_ROLE_VOLUNTEER),
            }
        )

        with self.assertRaises(HTTPException) as context:
            _resolve_attendance_role(event, uuid4(), db)

        self.assertEqual(context.exception.status_code, 409)

    def test_infer_attendance_role_uses_member_precedence_for_legacy_rows(self):
        event = _build_event()
        db = _FakeDb(
            {
                ClubMember: SimpleNamespace(user_id=uuid4()),
                EventWorker: SimpleNamespace(role=WORKFORCE_ROLE_VOLUNTEER),
            }
        )

        resolved = _infer_attendance_role(event, uuid4(), db)

        self.assertEqual(resolved, RSVP.ATTENDANCE_ROLE_CLUB_MEMBER)

    def test_ensure_member_assignment_adds_missing_worker(self):
        event = _build_event()
        user_id = uuid4()
        db = _FakeDb({EventWorker: None})

        _ensure_member_assignment(event, user_id, RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, db)

        self.assertEqual(len(db.added), 1)
        assignment = db.added[0]
        self.assertIsInstance(assignment, EventWorker)
        self.assertEqual(assignment.event_id, event.id)
        self.assertEqual(assignment.user_id, user_id)
        self.assertEqual(assignment.role, WORKFORCE_ROLE_MEMBER)

    def test_ensure_member_assignment_skips_non_members(self):
        event = _build_event()
        db = _FakeDb({EventWorker: None})

        _ensure_member_assignment(event, uuid4(), RSVP.ATTENDANCE_ROLE_PARTICIPANT, db)

        self.assertEqual(db.added, [])

    def test_sorted_rsvp_rows_groups_member_then_volunteer_then_student(self):
        rows = _sorted_rsvp_rows(
            [
                _build_rsvp(RSVP.ATTENDANCE_ROLE_PARTICIPANT, "Amy", "CSE", "2023"),
                _build_rsvp(RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, "Zara", "ECE", "2024"),
                _build_rsvp(RSVP.ATTENDANCE_ROLE_VOLUNTEER, "Bob", "AI", "2023"),
                _build_rsvp(RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, "Carl", "CSE", "2023"),
                _build_rsvp(RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, "Ben", "CSE", "2023"),
            ],
            _FakeDb(),
        )

        self.assertEqual(
            [(row["attendance_role"], row["user"]["name"]) for row in rows],
            [
                (RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, "Ben"),
                (RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, "Carl"),
                (RSVP.ATTENDANCE_ROLE_CLUB_MEMBER, "Zara"),
                (RSVP.ATTENDANCE_ROLE_VOLUNTEER, "Bob"),
                (RSVP.ATTENDANCE_ROLE_PARTICIPANT, "Amy"),
            ],
        )


if __name__ == "__main__":
    unittest.main()