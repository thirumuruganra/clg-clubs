# Product Requirement Document (PRD): WAVC (FastAPI Edition)

**App Name:** WAVC (What's Active in Various Clubs)
**Platform:** Progressive Web App (PWA) with various viewports
**Architecture:** Monorepo with separated Frontend/Backend.

## 1. Project Structure

The code must be organized into two distinct directories under the root:

```text
/wavc-root
│
├── /backend            # Python FastAPI Application
│   ├── /app
│   │   ├── /models     # SQLAlchemy Database Models
│   │   ├── /routers    # API Endpoints (Auth, Events, Clubs)
│   │   ├── /schemas    # Pydantic Models (Request/Response)
│   │   └── main.py     # App Entry Point
│   ├── requirements.txt
│   └── .env
│
└── /frontend           # React Application
    ├── /src
    │   ├── /components
    │   ├── /pages
    │   └── App.jsx
    ├── package.json
    └── vite.config.js

```

## 2. Tech Stack Requirements

### Backend (Folder: `/backend`)

* **Language:** Python 3.10+
* **Framework:** **FastAPI** (High performance, async).
* **Server:** Uvicorn.
* **Database ORM:** **SQLAlchemy** (Async) with **Alembic** for migrations.
* **Database:** PostgreSQL.
* **Authentication:** `authlib` (for Google OAuth2) + `python-jose` (for internal JWT handling).
* **Google Integration:** `google-api-python-client` and `google-auth-oauthlib`.

### Frontend (Folder: `/frontend`)

* **Framework:** React.js (Vite) + Tailwind CSS.
* **Calendar UI Reference:** [`@event-calendar/react`](https://github.com/origin-space/event-calendar).
* **HTTP Client:** Axios (for API calls).

---

## 3. Authentication & User Logic

### 3.1 Google OAuth2 Flow

* **Library:** Use `authlib` to handle the OAuth handshake.
* **Scopes Required:**
* `openid`, `email`, `profile`
* `https://www.googleapis.com/auth/calendar.events` (Critical: allows writing to the user's calendar).


* **Token Storage:** Upon successful login, the backend must store the user's **Google Access Token** (and Refresh Token if possible) in the database or encrypted session to perform API calls on their behalf later.

### 3.2 Role Assignment Logic (Python Regex)

* **Trigger:** Inside the `/auth/callback` endpoint.
* **Logic:**
1. **Extract Email:** Get `user_info['email']` from Google.
2. **Domain Check:** Ensure it ends with `@ssn.edu.in`.
3. **Student Regex:** Use Python `re` module: `r'.*[0-9]{4,}@ssn\.edu\.in$'`.
* **If Match:** Assign `role = "STUDENT"`.


4. **Club Check:** If regex does not match, check if email exists in `AllowedClubEmail` table.
* **If Found:** Assign `role = "CLUB_ADMIN"`.


5. **Fallback:** Assign `role = "STUDENT"` (Guest).

---

## 4. Feature Specifications

### 4.1 Feature: The Event Calendar (Frontend)

* **Route:** `/home`
* **UI:** Monthly view using `@event-calendar/react`.
* **Data Fetching:**
* **Left Tile (Calendar):** Fetches events from `/api/events/all` (visualized on calendar).
* **"For You" List:** Fetches from `/api/events/feed?type=following`.
* **"Discover" List:** Fetches from `/api/events/feed?type=discover`.



### 4.2 Feature: "Add to Google Calendar" (Backend Action)

* **Endpoint:** `POST /api/events/{id}/sync-calendar`
* **Implementation:**
1. Fetch the `Google Access Token` associated with the current user.
2. Build the service object: `build('calendar', 'v3', credentials=creds)`.
3. Construct the event body (Summary, Location, Description, Start/End).
4. Call: `service.events().insert(calendarId='primary', body=event).execute()`.


* **Response:** JSON `{ "status": "success", "message": "Event added to your Google Calendar" }`.

### 4.3 Feature: Live Activity (Redis/DB)

* **Logic:** Count RSVPs created in the last hour.
* **SQL Query (via SQLAlchemy):**
```python
# Logic concept
one_hour_ago = datetime.utcnow() - timedelta(hours=1)
count = db.query(RSVP).filter(RSVP.event_id == id, RSVP.created_at >= one_hour_ago).count()

```



---

## 5. Database Schema (SQLAlchemy Models)

### `models/user.py`

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String) # "STUDENT" or "CLUB_ADMIN"
    google_token = Column(String) # Encrypted Access Token for Calendar API

```

### `models/club.py`

```python
class Club(Base):
    __tablename__ = "clubs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    logo_url = Column(String)
    category = Column(String) # "TECH", "NON_TECH"
    admin_id = Column(Integer, ForeignKey("users.id"))

```

### `models/event.py`

```python
class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    title = Column(String)
    description = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    tag = Column(String) # "TECH", "NON_TECH"

```

---

## 6. Prompt for the Coding Agent

*(Copy and paste this specific instruction to your AI coding tool)*

> "Create a full-stack project structure with two root folders: `frontend` and `backend`.
> **For the Backend:**
> Initialize a **FastAPI** application using Python 3.10+.
> 1. Setup **SQLAlchemy** (Async) with PostgreSQL.
> 2. Create the models: User, Club, Event, RSVP, Follow.
> 3. Implement **Google OAuth2** using `authlib`. In the callback, use Python Regex (`r'.*[0-9]{4,}@ssn\.edu\.in$'`) to auto-assign the 'STUDENT' role if the email matches; otherwise check a whitelist for 'CLUB_ADMIN'.
> 4. Create an endpoint `POST /events/{id}/sync` that uses the `google-api-python-client` to insert the event into the user's Google Calendar.
> 
> 
> **For the Frontend:**
> Initialize a **React + Vite** app.
> 1. Install `@event-calendar/react` and Tailwind CSS.
> 2. Create a dashboard layout with two lists: 'For You' (events from followed clubs) and 'Discover' (events from non-followed clubs)."
> 
>
