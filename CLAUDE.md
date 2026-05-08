# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gamgee** is a full-stack fitness tracking app (workout logging, personal records, body map visualization).

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Vite + React 18 + TypeScript        |
| Backend  | FastAPI (Python 3.12)               |
| Database | PostgreSQL 16                       |
| Infra    | Docker Compose                      |
| Package managers | pnpm (frontend), pip (backend) |

## Commands

### Full Stack (Docker)
```bash
cp .env.example .env
docker compose up --build
```

Services: frontend on `:5173`, backend on `:8000`, Swagger docs at `:8000/docs`.

### Frontend (local)
```bash
cd frontend
pnpm install
pnpm run dev       # dev server on :5173
pnpm run build     # TypeScript compile + Vite build
```

### Backend (local)
```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
DATABASE_URL=postgresql://gamgee:gamgee@localhost:5432/gamgee uvicorn app.main:app --reload
```

### Database initialization (resets + seeds exercises)
```bash
cd backend && python -m app.init_db
```

## Architecture

### Backend (`backend/app/`)
- `main.py` — FastAPI app entry; registers all routers, sets up CORS (allows `localhost:5173`)
- `database.py` — SQLAlchemy engine, `SessionLocal`, `get_db()` dependency
- `models.py` — ORM models: `User`, `WorkoutSession`, `PersonalRecord`, `Exercise`, `Item`
- `schemas.py` — Pydantic request/response schemas
- `auth.py` — JWT creation/verification, bcrypt password hashing, `get_current_user` dependency
- `init_db.py` / `seed.py` — DB setup and exercise seeding
- `routers/` — `auth.py` (`/api/auth`), `workouts.py` (`/api/workouts`), `prs.py` (`/api/prs`), `items.py` (`/api/items`)

**Key data model notes:**
- `WorkoutSession.exercises` is a JSONB array column (no separate exercise-session join table)
- `PersonalRecord` has a unique constraint on `(user_id, exercise_id)` — use upsert via `PUT /api/prs/{exercise_id}`
- JWT secret comes from `JWT_SECRET` env var; default is `"change-me-in-production-please"`

### Frontend (`frontend/src/`)
- `App.tsx` — Root; renders `WorkoutTracker`
- `WorkoutTracker.tsx` — Monolithic component containing all application state, UI, and two large lookup tables:
  - `MI` — muscle info map (30+ muscle groups with display names and groupings)
  - `EM` — exercise-to-muscle map (100+ exercises mapped to primary/secondary muscles)

**API calls** are proxied through Vite (`/api` → `http://localhost:8000`) configured in `vite.config.ts`. The `BACKEND_URL` env var overrides the proxy target.

### Configuration
- `.env.example` — default credentials (`gamgee`/`gamgee`/`gamgee` for DB user/password/db)
- `docker-compose.yml` — injects env vars into all three services; backend waits for DB health check before starting
- `frontend/nginx.conf` — production reverse proxy config (used in the multi-stage Docker build)
