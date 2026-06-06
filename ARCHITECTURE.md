# Architecture

## Overview

WAVC is a monorepo full-stack web application with a React frontend and a FastAPI backend. The backend exposes the API, handles authentication and business rules, connects to PostgreSQL, integrates with Supabase Storage for media assets, and serves the built frontend in production.

## Repository Layout

```text
.
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── Procfile
└── package.json
```

## High-Level Runtime Design

```text
Browser
  -> React SPA
  -> FastAPI API and static frontend host
  -> PostgreSQL
  -> Supabase Storage
  -> Google OAuth
```

## Frontend Architecture

The frontend is a React 19 SPA built with Vite.

- `frontend/src/main.jsx` boots the app and applies system dark mode.
- `frontend/src/App.jsx` defines route structure, lazy-loads pages, and protects role-based routes.
- `AuthProvider` loads the authenticated user and exposes auth state to the app.
- `frontend/src/pages/` contains the route-level screens for students and club admins.
- `frontend/src/components/` contains reusable UI and feature-specific components.

### Frontend Route Groups

- Public routes: landing page and login.
- Student routes: dashboard, profile, calendar, clubs, attendance check-in.
- Club admin routes: dashboard, setup, profile, calendar.

### Frontend Data Flow

- The frontend calls FastAPI endpoints under `/api`.
- In local development, Vite proxies `/api` to `http://localhost:8000`.
- In production, FastAPI serves the built SPA and the API from the same origin.

## Backend Architecture

The backend is a FastAPI application organized around routers, models, and service modules.

- `app/main.py` initializes the app, middleware, routers, startup tasks, and static hosting.
- `app/database.py` creates the SQLAlchemy engine and session factory for PostgreSQL.
- `app/routers/` groups API endpoints by domain.
- `app/models/` defines SQLAlchemy entities.
- `app/services/` contains business logic for storage, payload shaping, authorization helpers, and membership synchronization.
- `app/core/` contains security, storage, audit, and rate-limiting infrastructure.

### Middleware and Platform Concerns

`app/main.py` configures:

- CORS for frontend origins.
- Session middleware for OAuth state.
- JWT cookie authentication.
- GZip compression.
- In-memory rate limiting for sensitive routes.
- SPA fallback routing for the built frontend.

### Runtime Schema Compatibility

The backend currently includes startup-time schema compatibility helpers in `app/main.py`. These add missing columns for older databases before the app starts serving traffic.

## API Domain Structure

### `auth`

- Google OAuth login and callback.
- JWT cookie issuance.
- Current-user lookup and logout.
- Role assignment based on SSN email patterns.

### `users`

- Student profile read and update.
- Interest selection.
- Joined club projection updates.
- Student directory endpoints for club member assignment.

### `clubs`

- Club creation and updates.
- Club detail retrieval.
- Club logo upload.
- Club member management.
- Club-specific event listing.

### `follow`

- Follow and unfollow flows.
- Student following list.
- Club follower list for owning admins.

### `events`

- Event CRUD.
- Calendar and feed endpoints.
- Recommended event ranking using interests, keywords, and followed clubs.
- Event poster upload.
- Payment QR upload and removal.
- Attendance QR generation and check-in URL support.
- Event workforce assignment for club members and volunteers.

### `rsvp`

- RSVP and cancel RSVP.
- Event RSVP list for admins.
- Attendance marking.
- Bulk payment updates.
- Student attended-event activity history.

## Data Model

Core entities:

- `User`: identity, role, profile details, joined clubs, interests, granted Google scopes.
- `Club`: club metadata, admin ownership, logo, category, Instagram handle.
- `Event`: event details, poster metadata, payment metadata, attendance QR state.
- `RSVP`: event registration, attendance status, payment status.
- `Follow`: student-to-club follow relationship.
- `ClubMember`: student membership in a club.
- `EventWorker`: event workforce assignment with member or volunteer roles.

## Key Application Flows

### Authentication Flow

1. User starts Google OAuth from the frontend.
2. FastAPI handles the OAuth callback.
3. The backend upserts the user, resolves the role, and sets a JWT cookie.
4. The frontend redirects into the student or club-admin experience.

### Event Discovery Flow

1. The frontend requests `/api/events/feed` or `/api/events/all`.
2. The backend resolves personalization from follows and interests.
3. Events are returned with RSVP state, counts, and recommendation metadata.

### Attendance Flow

1. Club admin opens attendance QR for an event.
2. The backend builds a check-in URL using `FRONTEND_ORIGIN`.
3. Students check in through the frontend attendance page.
4. Admins review and update RSVP attendance and payment state.

### Asset Flow

1. Club logos, event posters, and payment QR images are uploaded through API endpoints.
2. The backend stores them in Supabase Storage.
3. Public asset URLs are saved in PostgreSQL.
4. FastAPI returns those URLs for frontend rendering.

## Production Serving Model

Production uses a single-app deployment model:

- Vite builds the frontend into `frontend/dist`.
- Deployment copies that output into `backend/app/static`.
- FastAPI serves static assets and falls back to `index.html` for SPA routes.

This keeps the frontend and backend on the same origin in production, which simplifies cookie auth, routing, and deployment.
