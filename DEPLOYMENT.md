# Deployment

WAVC is deployed as a single Heroku app. The frontend is built during deployment and copied into `backend/app/static`, and FastAPI serves both the API and the built SPA.

## Prerequisites

- Heroku CLI installed and authenticated.
- A Heroku app.
- Heroku Postgres attached to the app.
- Google OAuth credentials for the production domain.
- A Supabase Storage bucket for club logos, event posters, and payment QR assets.

## Deployment Model

- `frontend/` is built with Vite.
- The root `heroku-postbuild` script copies `frontend/dist` into `backend/app/static`.
- `Procfile` starts `uvicorn` from `backend/`.
- FastAPI serves `/api/*` routes and the built frontend from `/`.

## 1. Create the Heroku App

From the repository root:

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:essential-0 -a your-app-name
```

## 2. Configure Buildpacks

This app needs both Node.js and Python buildpacks.

```bash
heroku buildpacks:clear -a your-app-name
heroku buildpacks:add --index 1 heroku/nodejs -a your-app-name
heroku buildpacks:add --index 2 heroku/python -a your-app-name
```

## 3. Set Environment Variables

Required values:

```bash
heroku config:set APP_ENV=production -a your-app-name
heroku config:set SECRET_KEY=$(openssl rand -hex 32) -a your-app-name
heroku config:set FRONTEND_ORIGIN=https://your-app-name.herokuapp.com -a your-app-name
heroku config:set FRONTEND_ALLOWED_ORIGINS=https://your-app-name.herokuapp.com -a your-app-name
heroku config:set CORS_ALLOW_ORIGINS=https://your-app-name.herokuapp.com -a your-app-name
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com -a your-app-name
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret -a your-app-name
heroku config:set SUPABASE_URL=https://your-project-id.supabase.co -a your-app-name
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key -a your-app-name
heroku config:set SUPABASE_STORAGE_BUCKET=your-storage-bucket -a your-app-name
```

Notes:

- `DATABASE_URL` is supplied automatically by Heroku Postgres.
- `FRONTEND_ORIGIN` must be a valid absolute URL because attendance QR links use it.
- `GOOGLE_REDIRECT_URI` is optional. If not set, the backend derives the callback URL automatically.

Optional tuning:

```bash
heroku config:set EVENT_POSTER_MAX_BYTES=2097152 -a your-app-name
heroku config:set EVENT_POSTER_MAX_PER_CLUB=5 -a your-app-name
heroku config:set CLUB_LOGO_MAX_BYTES=2097152 -a your-app-name
heroku config:set SESSION_SAMESITE=lax -a your-app-name
heroku config:set ACCESS_TOKEN_SAMESITE=lax -a your-app-name
heroku config:set SESSION_COOKIE_NAME=wavc_oauth_session -a your-app-name
```

Required for the scheduled poster-cleanup cron (see `.github/workflows/poster-cleanup.yml`):

```bash
heroku config:set INTERNAL_CRON_SECRET=$(openssl rand -hex 32) -a your-app-name
```

Set the same value, plus `BACKEND_PUBLIC_BASE_URL` (e.g. `https://your-app-name.herokuapp.com`), as GitHub Actions repo secrets so the workflow can authenticate to `POST /api/internal/cleanup-posters`.

## 4. Configure Google OAuth

In Google Cloud Console, add:

- Authorized JavaScript origin: `https://your-app-name.herokuapp.com`
- Authorized redirect URI: `https://your-app-name.herokuapp.com/api/auth/callback`

## 5. Deploy

From the repository root:

```bash
git push heroku main:main
```

If your deployment branch is different, push that branch to Heroku `main`.

## 6. What Heroku Builds

During deployment, Heroku runs the root `heroku-postbuild` script:

```bash
npm --prefix frontend install --include=dev
npm --prefix frontend run build
rm -rf backend/app/static
mkdir -p backend/app/static
cp -r frontend/dist/. backend/app/static/
```

That produces a single deployable FastAPI app that serves both API responses and frontend assets.

## 7. Verify the Deployment

```bash
heroku logs --tail -a your-app-name
heroku open -a your-app-name
```

Verify that:

- `/` loads the frontend.
- Google sign-in completes successfully.
- `/api/auth/me` works after login.
- Event poster and logo uploads work.
- Attendance QR links point to the correct production frontend origin.
