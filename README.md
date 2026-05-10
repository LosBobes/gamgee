# Gamgee Workout Buddy

A self-hosted workout tracking app. Log sessions, track personal records, visualise muscle coverage, and get progression coaching — all behind a per-user JWT auth wall.

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Vite + React 18 + TypeScript      |
| Backend  | FastAPI (Python 3.12)             |
| Database | PostgreSQL 16                     |
| Infra    | Docker Compose                    |

---

## Features

**Workout logging**
- Wizard-guided session builder: pick a focus (push / pull / legs / upper / lower / full body / core), browse suggested exercises, review muscle coverage on an SVG body map, then start.
- Live session timer, per-set weight + rep entry, PR badge when a new personal record is hit.
- Add exercises mid-session; mark individual sets done.

**Personal records**
- Automatically detected and persisted after each finished workout.
- Estimated 1RM shown per exercise (Epley formula).
- Cardio exercises tracked separately (time/distance).

**History**
- List view: expandable session cards with full exercise/set breakdown.
- Calendar view: month grid with workout days highlighted; click a day to expand the session.

**Coach tab**
- Per-exercise progression analysis across all logged sessions.
- Statuses: `NEW` → `PROGRESSING` → `BUILDING REPS` → `READY TO JUMP` → `STALLED` → `PLATEAU` → `DELOAD`.
- Recommends a concrete next-session target weight × reps with a plain-English reason.
- Sorted by exercises that need the most attention first.

**Profile tab**
- Aggregate stats: total workouts, volume lifted, time logged, sets done.
- 16-week activity heatmap.
- Top 5 most-logged exercises and muscle group frequency bars.

**Muscle visualisation**
- Front and back SVG body maps — single clean silhouette path, muscles highlight with a soft glow only when active. Used in the wizard and exercise suggestion cards.

---

## Getting started

### Docker Compose (recommended)

```bash
cp .env.example .env      # default creds: gamgee / gamgee / gamgee
docker compose up --build
```

| Service       | URL                        |
|---------------|----------------------------|
| App           | http://localhost:5173      |
| API           | http://localhost:8000      |
| Swagger docs  | http://localhost:8000/docs |

### Local development

**Backend**
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate     # Windows; use bin/activate on Linux/Mac
pip install -r requirements.txt
DATABASE_URL=postgresql://gamgee:gamgee@localhost:5432/gamgee uvicorn app.main:app --reload
```

Seed the exercise catalogue (required on first run):
```bash
python -m app.init_db
```

**Frontend**
```bash
cd frontend
pnpm install
pnpm run dev        # dev server on :5173, proxies /api → :8000
pnpm run build      # TypeScript check + production bundle
```

---

## Project structure

```
gamgee/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI app, routers, CORS
│       ├── database.py      # SQLAlchemy engine + SessionLocal
│       ├── models.py        # ORM: User, WorkoutSession, PersonalRecord, Exercise
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── auth.py          # JWT creation/verification, bcrypt, get_current_user
│       ├── init_db.py       # DB init + exercise seeding
│       └── routers/
│           ├── auth.py      # /api/auth — register, login, me
│           ├── workouts.py  # /api/workouts — list, create
│           └── prs.py       # /api/prs — list, upsert
│
└── frontend/
    ├── Dockerfile           # multi-stage: dev / builder / nginx
    ├── nginx.conf           # production reverse-proxy
    ├── vite.config.ts       # /api proxy → backend
    └── src/
        ├── WorkoutTracker.tsx        # root state + all shared handlers
        ├── WorkoutTracker.css        # global styles + CSS custom properties
        ├── types.ts                  # all TypeScript interfaces
        ├── utils.ts                  # fmtClock, fmtDate, fmtDur, orm1
        ├── analysis.ts               # per-exercise progression analysis engine
        ├── data/
        │   ├── exercises.ts          # 100+ exercises, categories, muscle maps
        │   ├── muscles.ts            # 32 muscle IDs → name + group
        │   ├── focuses.ts            # 7 workout focus templates
        │   ├── bodymap.ts            # SVG body path + front/back muscle coords
        │   └── tips.ts               # coaching tip cards
        └── components/
            ├── AuthScreen.tsx
            ├── AppHeader.tsx
            ├── StatsBar.tsx
            ├── BodyMap.tsx
            ├── ExercisePicker.tsx
            ├── SuggCard.tsx
            ├── workout/
            │   ├── WorkoutTab.tsx
            │   ├── WizardStart.tsx
            │   ├── WizardFocus.tsx
            │   ├── WizardBuild.tsx
            │   ├── WizardReview.tsx
            │   ├── ActiveWorkout.tsx
            │   └── ExerciseCard.tsx
            └── tabs/
                ├── HistoryTab.tsx
                ├── PRsTab.tsx
                ├── CoachTab.tsx
                └── ProfileTab.tsx
```

---

## API reference

All routes except `/api/auth/register`, `/api/auth/login`, and `/health` require `Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method | Path        | Body                          | Description              |
|--------|-------------|-------------------------------|--------------------------|
| POST   | `/register` | `{ username, password }`      | Create account           |
| POST   | `/login`    | OAuth2 form `username`+`password` | Returns JWT          |
| GET    | `/me`       | —                             | Current user info        |

### Workouts — `/api/workouts`

| Method | Path | Body                    | Description                            |
|--------|------|-------------------------|----------------------------------------|
| GET    | `/`  | —                       | All sessions for the current user, newest first |
| POST   | `/`  | `WorkoutSession` object | Save a completed session (idempotent by `id`) |

`WorkoutSession.exercises` is stored as a JSONB column — no separate join table.

### Personal Records — `/api/prs`

| Method | Path              | Body                  | Description                       |
|--------|-------------------|-----------------------|-----------------------------------|
| GET    | `/`               | —                     | All PRs for the current user      |
| PUT    | `/{exercise_id}`  | `PersonalRecord` body | Upsert (create or overwrite) a PR |

PRs have a unique constraint on `(user_id, exercise_id)`.

---

## Configuration

Copy `.env.example` to `.env`. Key variables:

| Variable       | Default                        | Description                        |
|----------------|--------------------------------|------------------------------------|
| `POSTGRES_USER` | `gamgee`                      | DB username                        |
| `POSTGRES_PASSWORD` | `gamgee`                  | DB password                        |
| `POSTGRES_DB`  | `gamgee`                       | DB name                            |
| `JWT_SECRET`   | `change-me-in-production-please` | HS256 signing secret — change this |
| `BACKEND_URL`  | `http://backend:8000`          | Vite proxy target (Docker internal)|

---

## Password reset

### Self-service (user knows current password)

`POST /api/auth/change-password` — authenticated, no admin required:

```bash
curl -X POST https://yourdomain.com/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "old", "new_password": "new-min-8-chars"}'
```

Returns `204 No Content` on success. Fails with `400` if the current password is wrong or the new one is under 8 characters.

### Admin reset (user locked out)

There is no email-based reset flow. Reset via `psql` on the server:

```bash
# 1. Shell into the running DB container
docker exec -it gamgee-db-1 psql -U gamgee -d gamgee

# 2. Generate a bcrypt hash for the new password (run this locally or on the server)
python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('newpassword'))"

# 3. Update the user (paste the hash from step 2)
UPDATE users
SET hashed_password = '$2b$12$...'
WHERE username = 'the_username';
```
