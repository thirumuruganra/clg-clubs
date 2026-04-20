# WAVC (What's Active in Various Clubs)

WAVC is a Progressive Web App (PWA) designed to keep students informed about activities across various college clubs. This project uses a modern web stack with a React frontend and a FastAPI backend.

## Project Structure

This project is organized as a monorepo containing both the frontend and backend codebases:

- `frontend/`: React + Vite progressive web application.
- `backend/`: Python FastAPI application.
- `ui_mockups/`: HTML/CSS mockups for the application interfaces.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Python](https://www.python.org/) 3.12+

## Setup & Run Instructions

### 1. Backend Setup

The backend is built with Python and FastAPI. 

Navigate to the backend directory and activate the virtual environment:
```bash
cd backend
source wavc/bin/activate
```

Install the required dependencies:
```bash
pip install -r requirements.txt
```

Run the FastAPI development server:
```bash
uvicorn app.main:app --reload
```
The backend API will start, typically at `http://127.0.0.1:8000`.

### 2. Frontend Setup

The frontend is built with React and Vite. Open a new terminal window/tab to keep the backend running.

Navigate to the frontend directory:
```bash
cd frontend
```

Install the required Node dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The frontend application will start, usually at `http://localhost:5173`.

## Additional Notes

- Ensure both the backend and frontend servers are running simultaneously for the application to function correctly.
- Review `./prd.md` for specific product requirements and architecture details.
- Review `backend/app/` for the core API logic, routing, and database setup.

## Heroku Deployment (Single App, Frontend Built on Deploy)

This repository can be deployed to Heroku as a single app by serving the built frontend from FastAPI. Heroku will build the frontend during deployment and copy the build output into `backend/app/static` automatically.

### 1. Prerequisites

- Heroku CLI installed and authenticated.
- Google OAuth credentials configured in Google Cloud Console.
- Python version is defined in `.python-version` at repository root.

### 2. Create Heroku App and Database

From repository root:

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:essential-0 -a your-app-name
```

### 3. Configure Buildpacks (Node.js + Python)

From repository root:

```bash
heroku buildpacks:clear -a your-app-name
heroku buildpacks:add --index 1 heroku/nodejs -a your-app-name
heroku buildpacks:add --index 2 heroku/python -a your-app-name
```

### 4. Configure Environment Variables

Use the keys in `backend/.env.example`.

Example:

```bash
heroku config:set SECRET_KEY=$(openssl rand -hex 32) -a your-app-name
heroku config:set FRONTEND_ORIGIN=https://your-app-name.herokuapp.com -a your-app-name
heroku config:set FRONTEND_ALLOWED_ORIGINS=https://your-app-name.herokuapp.com,http://localhost:5173,http://127.0.0.1:5173 -a your-app-name
heroku config:set CORS_ALLOW_ORIGINS=https://your-app-name.herokuapp.com,http://localhost:5173,http://127.0.0.1:5173 -a your-app-name
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com -a your-app-name
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret -a your-app-name

# Supabase Storage bucket for event posters
heroku config:set SUPABASE_URL=https://your-project-id.supabase.co -a your-app-name
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key -a your-app-name
heroku config:set SUPABASE_STORAGE_BUCKET=event-posters -a your-app-name

# Optional tuning (defaults shown)
heroku config:set EVENT_POSTER_MAX_BYTES=2097152 -a your-app-name
heroku config:set POSTER_CLEANUP_INTERVAL_MINUTES=15 -a your-app-name
```

`FRONTEND_ORIGIN` is required for attendance QR links. The backend does not fall back to localhost, and startup will fail if this value is missing or invalid.

Event posters are uploaded to a Supabase Storage bucket. The frontend compresses poster files using `browser-image-compression` before upload (JPEG/PNG/WebP, up to 2 MB by default). The backend stores each poster with a unique object path and long cache-control so browser caching works automatically.

After an event ends, a background cleanup job deletes poster objects from Supabase Storage and clears the event poster URL. Cleanup runs every 15 minutes by default and can be tuned via `POSTER_CLEANUP_INTERVAL_MINUTES`.

For local backend runs, set `FRONTEND_ORIGIN=http://localhost:5173` (or your local frontend origin).

`DATABASE_URL` is automatically provided by the Heroku Postgres add-on.

### 5. Set Google OAuth Redirects

In Google Cloud Console OAuth client settings:

- Authorized JavaScript origin: `https://your-app-name.herokuapp.com`
- Authorized redirect URI: `https://your-app-name.herokuapp.com/api/auth/callback`

### 6. Deploy From Repository Root

From repository root:

```bash
git push heroku main
```

Heroku build process will:

- Install frontend dependencies.
- Build the frontend with Vite.
- Copy `frontend/dist` into `backend/app/static`.

### 7. Verify

```bash
heroku logs --tail -a your-app-name
heroku open -a your-app-name
```