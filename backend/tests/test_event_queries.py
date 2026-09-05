import os
import unittest
import uuid
from datetime import datetime, timedelta

from sqlalchemy import event as sa_event
from sqlalchemy.orm import Session as OrmSession

from app.database import engine
from app.models.club import Club
from app.models.event import Event
from app.models.rsvp import RSVP
from app.models.user import User
from app.services.event_queries import event_rows_query


@unittest.skipUnless(os.getenv("DATABASE_URL"), "requires a real database connection")
class EventQueriesIntegrationTests(unittest.TestCase):
    """
    Regression guard for the N+1 fix in app/services/event_queries.py.

    Every test in this suite already requires a reachable Postgres
    (app.database connects at import time), so this runs against the real
    configured database. All writes happen inside a transaction rolled
    back in tearDown, so nothing persists.
    """

    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.db = OrmSession(bind=self.connection)

        self.admin = User(id=uuid.uuid4(), email=f"admin-{uuid.uuid4().hex}@test.local", role="CLUB_ADMIN")
        self.club = Club(id=uuid.uuid4(), name="Test Query Club", category="TECH", admin_id=self.admin.id)
        self.db.add_all([self.admin, self.club])
        self.db.flush()

        self.events = self._seed_events(self.club.id, count=3, rsvp_counts=[2, 1, 0])

    def tearDown(self):
        self.db.close()
        self.transaction.rollback()
        self.connection.close()

    def _seed_events(self, club_id, count, rsvp_counts=None):
        events = []
        for i in range(count):
            event = Event(
                id=uuid.uuid4(),
                club_id=club_id,
                title=f"Event {i}",
                start_time=datetime.utcnow() + timedelta(days=i + 1),
                end_time=datetime.utcnow() + timedelta(days=i + 1, hours=2),
            )
            self.db.add(event)
            events.append(event)
        self.db.flush()

        for event, rsvp_count in zip(events, rsvp_counts or []):
            for _ in range(rsvp_count):
                student = User(id=uuid.uuid4(), email=f"student-{uuid.uuid4().hex}@test.local", role="STUDENT")
                self.db.add(student)
                self.db.flush()
                self.db.add(RSVP(id=uuid.uuid4(), user_id=student.id, event_id=event.id))
        self.db.flush()
        return events

    def test_rsvp_count_matches_seeded_data(self):
        rows = (
            event_rows_query(self.db)
            .filter(Event.club_id == self.club.id)
            .order_by(Event.start_time.asc())
            .all()
        )
        counts = {event.title: rsvp_count for event, club, rsvp_count in rows}
        self.assertEqual(counts, {"Event 0": 2, "Event 1": 1, "Event 2": 0})

    def test_query_count_does_not_grow_with_event_count(self):
        """
        The regression guard: fetching a 3-event club and a 10-event club
        through event_rows_query must issue the same number of SQL
        statements. If someone reintroduces a per-row loop, this fails.
        """
        big_club = Club(id=uuid.uuid4(), name="Test Query Club Big", category="TECH", admin_id=self.admin.id)
        self.db.add(big_club)
        self.db.flush()
        self._seed_events(big_club.id, count=10)

        def count_statements(club_id):
            count = 0

            def on_execute(conn, cursor, statement, parameters, context, executemany):
                nonlocal count
                count += 1

            sa_event.listen(self.connection, "before_cursor_execute", on_execute)
            try:
                event_rows_query(self.db).filter(Event.club_id == club_id).all()
            finally:
                sa_event.remove(self.connection, "before_cursor_execute", on_execute)
            return count

        small_club_statements = count_statements(self.club.id)
        big_club_statements = count_statements(big_club.id)

        self.assertEqual(small_club_statements, big_club_statements)


if __name__ == "__main__":
    unittest.main()
