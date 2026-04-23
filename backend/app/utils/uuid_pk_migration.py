from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.database import engine


TARGET_TABLES = [
    "users",
    "clubs",
    "events",
    "follows",
    "club_members",
    "event_workers",
    "rsvps",
]


@dataclass(frozen=True)
class SqlCheck:
    label: str
    sql: str


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _column_exists(conn: Connection, table_name: str, column_name: str) -> bool:
    exists = conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table_name
              AND column_name = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).scalar_one_or_none()
    return exists is not None


def _is_uuid_column(conn: Connection, table_name: str, column_name: str) -> bool:
    column_type = conn.execute(
        text(
            """
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table_name
              AND column_name = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).scalar_one_or_none()
    return column_type == "uuid"


def _rename_column_if_needed(conn: Connection, table_name: str, old_name: str, new_name: str) -> None:
    if not _column_exists(conn, table_name, old_name):
        return
    if _column_exists(conn, table_name, new_name):
        return

    conn.execute(
        text(f"ALTER TABLE {_q(table_name)} RENAME COLUMN {_q(old_name)} TO {_q(new_name)}")
    )


def _ensure_uuid_extension(conn: Connection) -> None:
    conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))


def _add_uuid_shadow_columns(conn: Connection) -> None:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid_id UUID"))
    conn.execute(text("ALTER TABLE clubs ADD COLUMN IF NOT EXISTS uuid_id UUID"))
    conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS uuid_id UUID"))
    conn.execute(text("ALTER TABLE follows ADD COLUMN IF NOT EXISTS uuid_id UUID"))
    conn.execute(text("ALTER TABLE club_members ADD COLUMN IF NOT EXISTS uuid_id UUID"))
    conn.execute(text("ALTER TABLE event_workers ADD COLUMN IF NOT EXISTS uuid_id UUID"))
    conn.execute(text("ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS uuid_id UUID"))

    conn.execute(text("ALTER TABLE clubs ADD COLUMN IF NOT EXISTS admin_uuid UUID"))
    conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS club_uuid UUID"))
    conn.execute(text("ALTER TABLE follows ADD COLUMN IF NOT EXISTS user_uuid UUID"))
    conn.execute(text("ALTER TABLE follows ADD COLUMN IF NOT EXISTS club_uuid UUID"))
    conn.execute(text("ALTER TABLE club_members ADD COLUMN IF NOT EXISTS user_uuid UUID"))
    conn.execute(text("ALTER TABLE club_members ADD COLUMN IF NOT EXISTS club_uuid UUID"))
    conn.execute(text("ALTER TABLE event_workers ADD COLUMN IF NOT EXISTS user_uuid UUID"))
    conn.execute(text("ALTER TABLE event_workers ADD COLUMN IF NOT EXISTS event_uuid UUID"))
    conn.execute(text("ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS user_uuid UUID"))
    conn.execute(text("ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS event_uuid UUID"))


def _backfill_uuid_columns(conn: Connection) -> None:
    for table_name in TARGET_TABLES:
        conn.execute(text(f"UPDATE {_q(table_name)} SET uuid_id = gen_random_uuid() WHERE uuid_id IS NULL"))

    conn.execute(
        text(
            """
            UPDATE clubs c
            SET admin_uuid = u.uuid_id
            FROM users u
            WHERE c.admin_uuid IS NULL
              AND c.admin_id = u.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE events e
            SET club_uuid = c.uuid_id
            FROM clubs c
            WHERE e.club_uuid IS NULL
              AND e.club_id = c.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE follows f
            SET user_uuid = u.uuid_id
            FROM users u
            WHERE f.user_uuid IS NULL
              AND f.user_id = u.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE follows f
            SET club_uuid = c.uuid_id
            FROM clubs c
            WHERE f.club_uuid IS NULL
              AND f.club_id = c.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE club_members cm
            SET user_uuid = u.uuid_id
            FROM users u
            WHERE cm.user_uuid IS NULL
              AND cm.user_id = u.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE club_members cm
            SET club_uuid = c.uuid_id
            FROM clubs c
            WHERE cm.club_uuid IS NULL
              AND cm.club_id = c.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE event_workers ew
            SET user_uuid = u.uuid_id
            FROM users u
            WHERE ew.user_uuid IS NULL
              AND ew.user_id = u.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE event_workers ew
            SET event_uuid = e.uuid_id
            FROM events e
            WHERE ew.event_uuid IS NULL
              AND ew.event_id = e.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE rsvps r
            SET user_uuid = u.uuid_id
            FROM users u
            WHERE r.user_uuid IS NULL
              AND r.user_id = u.id
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE rsvps r
            SET event_uuid = e.uuid_id
            FROM events e
            WHERE r.event_uuid IS NULL
              AND r.event_id = e.id
            """
        )
    )


def _run_integrity_gate(conn: Connection) -> None:
    checks = [
        SqlCheck("users.uuid_id", "SELECT COUNT(*) FROM users WHERE uuid_id IS NULL"),
        SqlCheck("clubs.uuid_id", "SELECT COUNT(*) FROM clubs WHERE uuid_id IS NULL"),
        SqlCheck("events.uuid_id", "SELECT COUNT(*) FROM events WHERE uuid_id IS NULL"),
        SqlCheck("follows.uuid_id", "SELECT COUNT(*) FROM follows WHERE uuid_id IS NULL"),
        SqlCheck("club_members.uuid_id", "SELECT COUNT(*) FROM club_members WHERE uuid_id IS NULL"),
        SqlCheck("event_workers.uuid_id", "SELECT COUNT(*) FROM event_workers WHERE uuid_id IS NULL"),
        SqlCheck("rsvps.uuid_id", "SELECT COUNT(*) FROM rsvps WHERE uuid_id IS NULL"),
        SqlCheck("clubs.admin_uuid", "SELECT COUNT(*) FROM clubs WHERE admin_uuid IS NULL"),
        SqlCheck("events.club_uuid", "SELECT COUNT(*) FROM events WHERE club_uuid IS NULL"),
        SqlCheck("follows.user_uuid", "SELECT COUNT(*) FROM follows WHERE user_uuid IS NULL"),
        SqlCheck("follows.club_uuid", "SELECT COUNT(*) FROM follows WHERE club_uuid IS NULL"),
        SqlCheck("club_members.user_uuid", "SELECT COUNT(*) FROM club_members WHERE user_uuid IS NULL"),
        SqlCheck("club_members.club_uuid", "SELECT COUNT(*) FROM club_members WHERE club_uuid IS NULL"),
        SqlCheck("event_workers.user_uuid", "SELECT COUNT(*) FROM event_workers WHERE user_uuid IS NULL"),
        SqlCheck("event_workers.event_uuid", "SELECT COUNT(*) FROM event_workers WHERE event_uuid IS NULL"),
        SqlCheck("rsvps.user_uuid", "SELECT COUNT(*) FROM rsvps WHERE user_uuid IS NULL"),
        SqlCheck("rsvps.event_uuid", "SELECT COUNT(*) FROM rsvps WHERE event_uuid IS NULL"),
    ]

    failures: list[str] = []
    for check in checks:
        count = conn.execute(text(check.sql)).scalar_one()
        if count:
            failures.append(f"{check.label}: {count} null rows")

    if failures:
        raise RuntimeError("Integrity gate failed: " + "; ".join(failures))


def _drop_existing_foreign_keys(conn: Connection) -> None:
    foreign_keys = conn.execute(
        text(
            """
            SELECT t.relname AS table_name, c.conname AS constraint_name
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE c.contype = 'f'
              AND n.nspname = 'public'
              AND t.relname = ANY(:tables)
            ORDER BY t.relname, c.conname
            """
        ),
        {"tables": TARGET_TABLES},
    ).mappings().all()

    for row in foreign_keys:
        table_name = row["table_name"]
        constraint_name = row["constraint_name"]
        conn.execute(
            text(
                f"ALTER TABLE {_q(table_name)} DROP CONSTRAINT IF EXISTS {_q(constraint_name)}"
            )
        )


def _drop_old_constraints(conn: Connection) -> None:
    for table_name in TARGET_TABLES:
        conn.execute(text(f"ALTER TABLE {_q(table_name)} DROP CONSTRAINT IF EXISTS {_q(table_name + '_pkey')}"))

    conn.execute(text("ALTER TABLE follows DROP CONSTRAINT IF EXISTS uq_user_club_follow"))
    conn.execute(text("ALTER TABLE club_members DROP CONSTRAINT IF EXISTS uq_club_member_user"))
    conn.execute(text("ALTER TABLE event_workers DROP CONSTRAINT IF EXISTS uq_event_worker_user"))
    conn.execute(text("ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS uq_user_event_rsvp"))


def _swap_uuid_columns_into_canonical_names(conn: Connection) -> None:
    _rename_column_if_needed(conn, "users", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "users", "uuid_id", "id")

    _rename_column_if_needed(conn, "clubs", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "clubs", "uuid_id", "id")
    _rename_column_if_needed(conn, "clubs", "admin_id", "legacy_admin_int_id")
    _rename_column_if_needed(conn, "clubs", "admin_uuid", "admin_id")

    _rename_column_if_needed(conn, "events", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "events", "uuid_id", "id")
    _rename_column_if_needed(conn, "events", "club_id", "legacy_club_int_id")
    _rename_column_if_needed(conn, "events", "club_uuid", "club_id")

    _rename_column_if_needed(conn, "follows", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "follows", "uuid_id", "id")
    _rename_column_if_needed(conn, "follows", "user_id", "legacy_user_int_id")
    _rename_column_if_needed(conn, "follows", "user_uuid", "user_id")
    _rename_column_if_needed(conn, "follows", "club_id", "legacy_club_int_id")
    _rename_column_if_needed(conn, "follows", "club_uuid", "club_id")

    _rename_column_if_needed(conn, "club_members", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "club_members", "uuid_id", "id")
    _rename_column_if_needed(conn, "club_members", "user_id", "legacy_user_int_id")
    _rename_column_if_needed(conn, "club_members", "user_uuid", "user_id")
    _rename_column_if_needed(conn, "club_members", "club_id", "legacy_club_int_id")
    _rename_column_if_needed(conn, "club_members", "club_uuid", "club_id")

    _rename_column_if_needed(conn, "event_workers", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "event_workers", "uuid_id", "id")
    _rename_column_if_needed(conn, "event_workers", "user_id", "legacy_user_int_id")
    _rename_column_if_needed(conn, "event_workers", "user_uuid", "user_id")
    _rename_column_if_needed(conn, "event_workers", "event_id", "legacy_event_int_id")
    _rename_column_if_needed(conn, "event_workers", "event_uuid", "event_id")

    _rename_column_if_needed(conn, "rsvps", "id", "legacy_int_id")
    _rename_column_if_needed(conn, "rsvps", "uuid_id", "id")
    _rename_column_if_needed(conn, "rsvps", "user_id", "legacy_user_int_id")
    _rename_column_if_needed(conn, "rsvps", "user_uuid", "user_id")
    _rename_column_if_needed(conn, "rsvps", "event_id", "legacy_event_int_id")
    _rename_column_if_needed(conn, "rsvps", "event_uuid", "event_id")


def _enforce_uuid_defaults_and_not_null(conn: Connection) -> None:
    for table_name in TARGET_TABLES:
        conn.execute(text(f"ALTER TABLE {_q(table_name)} ALTER COLUMN id SET NOT NULL"))
        conn.execute(text(f"ALTER TABLE {_q(table_name)} ALTER COLUMN id SET DEFAULT gen_random_uuid()"))

    conn.execute(text("ALTER TABLE clubs ALTER COLUMN admin_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE events ALTER COLUMN club_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE follows ALTER COLUMN user_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE follows ALTER COLUMN club_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE club_members ALTER COLUMN user_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE club_members ALTER COLUMN club_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE event_workers ALTER COLUMN user_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE event_workers ALTER COLUMN event_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE rsvps ALTER COLUMN user_id SET NOT NULL"))
    conn.execute(text("ALTER TABLE rsvps ALTER COLUMN event_id SET NOT NULL"))


def _create_uuid_constraints(conn: Connection) -> None:
    for table_name in TARGET_TABLES:
        conn.execute(text(f"ALTER TABLE {_q(table_name)} ADD CONSTRAINT {_q(table_name + '_pkey')} PRIMARY KEY (id)"))

    conn.execute(
        text(
            """
            ALTER TABLE clubs
            ADD CONSTRAINT clubs_admin_id_fkey
            FOREIGN KEY (admin_id) REFERENCES users(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE events
            ADD CONSTRAINT events_club_id_fkey
            FOREIGN KEY (club_id) REFERENCES clubs(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE follows
            ADD CONSTRAINT follows_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE follows
            ADD CONSTRAINT follows_club_id_fkey
            FOREIGN KEY (club_id) REFERENCES clubs(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE club_members
            ADD CONSTRAINT club_members_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE club_members
            ADD CONSTRAINT club_members_club_id_fkey
            FOREIGN KEY (club_id) REFERENCES clubs(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE event_workers
            ADD CONSTRAINT event_workers_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE event_workers
            ADD CONSTRAINT event_workers_event_id_fkey
            FOREIGN KEY (event_id) REFERENCES events(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE rsvps
            ADD CONSTRAINT rsvps_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id)
            """
        )
    )
    conn.execute(
        text(
            """
            ALTER TABLE rsvps
            ADD CONSTRAINT rsvps_event_id_fkey
            FOREIGN KEY (event_id) REFERENCES events(id)
            """
        )
    )

    conn.execute(text("ALTER TABLE follows ADD CONSTRAINT uq_user_club_follow UNIQUE (user_id, club_id)"))
    conn.execute(text("ALTER TABLE club_members ADD CONSTRAINT uq_club_member_user UNIQUE (club_id, user_id)"))
    conn.execute(text("ALTER TABLE event_workers ADD CONSTRAINT uq_event_worker_user UNIQUE (event_id, user_id)"))
    conn.execute(text("ALTER TABLE rsvps ADD CONSTRAINT uq_user_event_rsvp UNIQUE (user_id, event_id)"))


def _create_uuid_indexes(conn: Connection) -> None:
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_clubs_admin_id ON clubs (admin_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_events_club_id ON events (club_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_follows_user_id ON follows (user_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_follows_club_id ON follows (club_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_club_members_club_id ON club_members (club_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_club_members_user_id ON club_members (user_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_event_workers_event_id ON event_workers (event_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_event_workers_user_id ON event_workers (user_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rsvps_user_id ON rsvps (user_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rsvps_event_id ON rsvps (event_id)"))


def _verify_post_swap_uuid_contract(conn: Connection) -> None:
    contract_checks = [
        ("users.id", _is_uuid_column(conn, "users", "id")),
        ("clubs.id", _is_uuid_column(conn, "clubs", "id")),
        ("events.id", _is_uuid_column(conn, "events", "id")),
        ("follows.id", _is_uuid_column(conn, "follows", "id")),
        ("club_members.id", _is_uuid_column(conn, "club_members", "id")),
        ("event_workers.id", _is_uuid_column(conn, "event_workers", "id")),
        ("rsvps.id", _is_uuid_column(conn, "rsvps", "id")),
        ("clubs.admin_id", _is_uuid_column(conn, "clubs", "admin_id")),
        ("events.club_id", _is_uuid_column(conn, "events", "club_id")),
        ("follows.user_id", _is_uuid_column(conn, "follows", "user_id")),
        ("follows.club_id", _is_uuid_column(conn, "follows", "club_id")),
        ("club_members.user_id", _is_uuid_column(conn, "club_members", "user_id")),
        ("club_members.club_id", _is_uuid_column(conn, "club_members", "club_id")),
        ("event_workers.user_id", _is_uuid_column(conn, "event_workers", "user_id")),
        ("event_workers.event_id", _is_uuid_column(conn, "event_workers", "event_id")),
        ("rsvps.user_id", _is_uuid_column(conn, "rsvps", "user_id")),
        ("rsvps.event_id", _is_uuid_column(conn, "rsvps", "event_id")),
    ]

    invalid = [label for label, ok in contract_checks if not ok]
    if invalid:
        raise RuntimeError("Post-swap UUID contract verification failed for: " + ", ".join(invalid))


def migrate_uuid_primary_keys() -> None:
    with engine.begin() as conn:
        if _is_uuid_column(conn, "users", "id"):
            print("UUID PK migration skipped: schema already migrated.")
            return

        print("Starting UUID PK migration...")
        _ensure_uuid_extension(conn)
        _add_uuid_shadow_columns(conn)
        _backfill_uuid_columns(conn)
        _run_integrity_gate(conn)

        _drop_existing_foreign_keys(conn)
        _drop_old_constraints(conn)
        _swap_uuid_columns_into_canonical_names(conn)
        _enforce_uuid_defaults_and_not_null(conn)
        _create_uuid_constraints(conn)
        _create_uuid_indexes(conn)
        _verify_post_swap_uuid_contract(conn)

        print("UUID PK migration complete.")


if __name__ == "__main__":
    migrate_uuid_primary_keys()
