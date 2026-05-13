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
- `main.py` — FastAPI app; registers all routers, sets up CORS (allows `localhost:5173`), auto-creates tables on startup; runs lightweight in-place migrations (ALTER TABLE IF NOT EXISTS) for new columns so existing dev DBs don't need a full reset
- `database.py` — SQLAlchemy engine, `SessionLocal`, `get_db()` dependency
- `models.py` — ORM models: `User`, `WorkoutSession`, `PersonalRecord`, `Exercise`, `Item`, `BodyMetric`
- `schemas.py` — Pydantic request/response schemas
- `auth.py` — JWT (HS256, 7-day expiry), bcrypt hashing, `get_current_user` dependency; secret from `JWT_SECRET` env var
- `password_policy.py` — OWASP/NIST 800-63B password validation (12–128 chars, complexity rules, username/email similarity check, common-password blocklist)
- `init_db.py` / `seed.py` — DB setup and exercise seeding (~93 exercises)
- `routers/auth.py` (`/api/auth`) — register, login (OAuth2 password flow), `GET /api/auth/me`, `POST /api/auth/change-password`, `PATCH /api/auth/preferences` (updates `primary_color`; validates `#RRGGBB` format)
- `routers/workouts.py` (`/api/workouts`) — list (GET), create (POST), update (PUT `/{session_id}`), delete (DELETE `/{session_id}`); client generates UUID for session `id`
- `routers/prs.py` (`/api/prs`) — list (GET), upsert (PUT `/api/prs/{exercise_id}`), delete (DELETE `/api/prs/{exercise_id}`)
- `routers/health.py` (`/api/health`) — body metric CRUD: list (GET, filterable by `metric_type`, `from`, `to`), create (POST), delete (DELETE `/{metric_id}`)
- `routers/items.py` (`/api/items`) — generic CRUD (scaffold, mostly unused)

**Key data model notes:**
- `WorkoutSession.id` is a client-generated UUID string (not DB autoincrement); POST returns 409 on duplicate
- `WorkoutSession.exercises` is a JSONB array column — no join table; full exercise+sets data embedded
- `WorkoutSession.duration` is stored in **milliseconds**
- `PersonalRecord` has a unique constraint on `(user_id, exercise_id)` — always upsert via `PUT /api/prs/{exercise_id}`; has `is_cardio` boolean field
- `Exercise.id` is a short human-readable key (e.g. `"bench"`, `"ohp"`) matching the frontend's `EM` map
- `User` has `name`, `email` (unique), `gender`, and `primary_color` (nullable `VARCHAR(7)`, e.g. `"#28D1FF"`) — all added via in-place migration in `main.py`
- `BodyMetric` stores time-series health data: `metric_type`, `value`, `unit`, `date` (ISO string), optional `note`

### Frontend (`frontend/src/`)

**State and orchestration** — `WorkoutTracker.tsx` is the single stateful root. It owns all app state (auth token, history, PRs, wizard steps, active workout, `primaryColor`), performs all `authFetch` calls, and passes data/callbacks down. `App.tsx` renders `<SplashScreen />` alongside `<WorkoutTracker />`; both are mounted immediately so the color `useEffect` fires before the splash finishes.

**Wizard flow** (`components/workout/`) — workout creation is a 4-step wizard:
1. `WizardStart` — show last session summary, prompt to start
2. `WizardFocus` — pick a muscle-group focus (from `data/focuses.ts`)
3. `WizardBuild` — search/add exercises; `BodyMap` previews muscle coverage
4. `WizardReview` — final review before starting
5. `ActiveWorkout` — live set logging with PR detection

`WorkoutTab.tsx` routes between wizard steps and `ActiveWorkout` based on `active` + `wStep` props.

**Tabs** (`components/tabs/`) — `HistoryTab`, `PRsTab`, `CoachTab`, `ProfileTab` are pure display components; all data is passed from `WorkoutTracker`.

**Data layer** (`src/data/`) — static lookup tables bundled with the frontend:
- `exercises.ts` — `EM`: exercise-id → `{ p: string[], s: string[] }` (primary/secondary muscle ids); `ALL_EX`: full `ExerciseDef[]` list
- `muscles.ts` — `MI`: muscle-id → `{ n: string, g: string }` (display name + group)
- `focuses.ts` — focus definitions (`FocusDef[]`) with associated exercise ids
- `bodymap.ts` — SVG path/ellipse data for the anatomical body map
- `tips.ts` — coaching tip content

**Logic** (`src/`):
- `analysis.ts` — `analyzeEx(exId, history)` computes progression status (`NEW`, `GAINING`, `READY`, `STALLED`, etc.), estimated 1RM, and next recommended weight/reps
- `constants.ts` — `UPPER_IDS` set, `GROUPS` list, `getActive()` (builds `ActiveMuscles` from exercise list), `muscleGroups()`, `STATUS` map
- `utils.ts` — `fmtClock`, `fmtDate`, `fmtDur`, `orm1` (Epley 1RM estimate: `w * (1 + r/30)`)
- `types.ts` — all shared TypeScript interfaces

**API calls** are proxied through Vite (`/api` → `http://localhost:8000`) configured in `vite.config.ts`. The `BACKEND_URL` env var overrides the proxy target. Auth token stored in `localStorage` as `"iron_log_token"`; 401 response auto-clears it.

**Theming system** — the entire app is driven by a single CSS custom property `--primary` (default `#28D1FF`). All accent colours, tints, and the PR highlight colour derive from it in CSS:
- `--accent` = `var(--primary)` — used for interactive elements
- `--ad` / `--ad2` = `color-mix(in srgb, var(--primary) 11%/22%, transparent)` — tinted backgrounds
- `--pr` = `var(--primary)` — PR card weight values and badges; used to share the same accent
- `--pr-muted` = `color-mix(in srgb, var(--primary) 65%, var(--muted))` — secondary PR info (1RM estimates)
- `--logo-hue-shift` — CSS `hue-rotate` value for the PNG logo; computed as `selectedHue − 193°` (193° is the original cyan hue)

`WorkoutTracker.tsx` manages `primaryColor` state (initialised from `localStorage` key `gamgee_primary_color`) and applies all three variables to `document.documentElement` via a `useEffect`. A small inline `<script>` in `index.html` applies the same variables synchronously from `localStorage` before the first paint, preventing any colour flash during the splash screen.

`ProfileTab.tsx` contains a `ColorPicker` component with 8 preset swatches and a native `<input type="color">` for arbitrary hex values. Selecting a colour calls `PATCH /api/auth/preferences` to persist it, and updates the parent `primaryColor` state immediately (optimistic). The `hexToHue(hex)` utility in `WorkoutTracker.tsx` converts a hex colour to its HSL hue (0–360°).

### Configuration
- `.env.example` — default credentials (`gamgee`/`gamgee`/`gamgee` for DB user/password/db)
- `docker-compose.yml` — dev compose; injects env vars, backend waits for DB healthcheck, frontend volume-mounted for HMR
- `docker-compose.prod.yml` — production compose; no volume mounts, no `--reload`, restricted port exposure, requires real `JWT_SECRET`
- `frontend/nginx.conf` — production reverse proxy (used in multi-stage Docker build for frontend)
- `Caddyfile` + `docs/deployment.md` — Hetzner + Caddy production deployment guide
