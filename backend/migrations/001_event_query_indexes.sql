-- Retrofit indexes for existing databases.
--
-- create_all() only creates indexes on tables that don't exist yet, so
-- adding index=True to a SQLAlchemy column does nothing for a database
-- that already has the table. Run this file directly against any
-- pre-existing database (including production) to pick up the indexes
-- added in app/models/event.py, app/models/rsvp.py, and app/models/follow.py.
--
-- Must run in autocommit (e.g. `psql -f`, not inside BEGIN/COMMIT):
-- CREATE INDEX CONCURRENTLY cannot execute inside a transaction block.
-- CONCURRENTLY takes no write lock, so this is safe to run against a
-- live, in-use database.
--
-- Names match SQLAlchemy's default convention (ix_<table>_<column>) so a
-- migrated database and a fresh create_all() database end up identical.
--
-- Usage: psql "$DATABASE_URL" -f backend/migrations/001_event_query_indexes.sql
--    or: heroku pg:psql -a <app> -f backend/migrations/001_event_query_indexes.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_events_club_id    ON events (club_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_events_start_time ON events (start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_events_end_time   ON events (end_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_rsvps_event_id    ON rsvps (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_follows_club_id   ON follows (club_id);
