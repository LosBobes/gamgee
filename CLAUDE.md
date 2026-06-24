# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gamgee** is a self-hosted, full-stack fitness tracker: workout logging, personal records, body-map visualisation, coaching analysis, buddy/scoreboard, trainer↔trainee coaching, live co-workouts, in-app chat, and Web Push notifications.

| Layer            | Technology                                  |
|------------------|---------------------------------------------|
| Frontend         | Vite + React 18 + TypeScript (PWA)          |
| Backend          | FastAPI (Python 3.12)                       |
| Database         | PostgreSQL 16 (SQLAlchemy 2 ORM)            |
| Realtime         | SSE (`/api/events/stream`), WebSocket (`/api/chat/ws`), Web Push (VAPID) |
| Infra            | Docker Compose (dev + prod); Hetzner + Caddy in prod |
| Package managers | pnpm (frontend), pip (backend)              |
| Tests            | pytest, vitest, Playwright                  |

## Commands

### Full stack (Docker)
```bash
cp .env.example .env
docker compose up --build
```
Services: frontend on `:5173`, backend on `:8000`, Swagger at `:8000/docs`, DB on `:5432`.

### Frontend (local)
```bash
cd frontend
pnpm install
pnpm run dev          # dev server on :5173 (proxies /api → :8000)
pnpm run build        # tsc --noEmit + Vite production build
pnpm test             # vitest unit tests (tests/unit/**/*.test.ts)
pnpm exec playwright test   # e2e tests (tests/e2e), auto-starts vite
```

### Backend (local)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # .venv/Scripts/activate on Windows
pip install -r requirements-dev.txt
DATABASE_URL=postgresql://gamgee:gamgee@localhost:5432/gamgee uvicorn app.main:app --reload
pytest                                # backend tests
python -m app.init_db                 # reset + seed exercise catalogue
python -m app.content_seed            # seed editable content tables (quotes, tips, etc.)
python -m app.gen_vapid               # generate a fresh VAPID keypair for Web Push
```

### Production
- `docker-compose.prod.yml` — no volume mounts, no `--reload`, restricted port exposure; requires real `JWT_SECRET`, `PASSWORD_PEPPER`, `VAPID_*`, and `SENDGRID_*`.
- `Caddyfile` + `docs/deployment.md` — Hetzner + Caddy production walkthrough.
- `Makefile` — `make ssh` / `make db-tunnel` for ops on a Hetzner box.
- `.github/workflows/deploy.yml` — auto-deploys `main` via SSH on push.
- `.github/workflows/test.yml` — runs pytest, vitest (with `tsc --noEmit`), and Playwright on every PR.

## Architecture

### Backend (`backend/app/`)

**Core**
- `main.py` — FastAPI app; registers every router under `/api`; CORS allows `localhost:5173` + `APP_BASE_URL` + `CORS_EXTRA_ORIGINS`; auto-creates tables on startup and runs lightweight Postgres-only in-place migrations (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) so existing dev DBs pick up new columns without a full reset; calls `content_seed.seed_if_empty()` so a fresh DB is usable immediately; exposes `/health` for liveness checks.
- `database.py` — SQLAlchemy engine, `SessionLocal`, `get_db()` dependency.
- `models.py` — all ORM models (see "Data model" below).
- `schemas.py` — Pydantic v2 request/response schemas.
- `auth.py` — JWT (HS256, 7-day expiry, secret from `JWT_SECRET`); bcrypt hashing with optional `PASSWORD_PEPPER` (HMAC-SHA256 + base64 before bcrypt, sidestepping bcrypt's 72-byte truncation); `get_current_user` and `get_admin_user` dependencies; `password_needs_rehash()` upgrades pre-pepper hashes on next login.
- `password_policy.py` — OWASP/NIST 800-63B validation (12–128 chars, complexity, username/email similarity, common-password blocklist).
- `tokens.py` — opaque random tokens for password-reset and email-verify; stored as SHA-256 hash so the DB row alone can't be replayed.
- `email_service.py` — SendGrid integration (falls back to stdout logging when `SENDGRID_API_KEY` is empty); helpers for password-reset and email-verify mails. See `docs/sendgrid-setup.md`.
- `push.py` — Web Push (VAPID) dispatch via `pywebpush`; degrades to no-op when VAPID env vars are unset; dead 404/410 subscriptions are auto-pruned; `dispatch_batch_async` fires from a daemon thread so requests don't block. See `docs/web-push-vapid.md`.
- `gen_vapid.py` — CLI to mint a `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` pair.
- `events.py` — in-process SSE pub/sub for general realtime signals (notifications, buddy / live / trainer changes). Single Uvicorn worker only — swap in Redis pub/sub if scaled.
- `chat_ws.py` — parallel pub/sub bus dedicated to chat traffic; carries full `MessageOut` JSON over WebSockets.
- `notifications.py` — central helpers: `create_notification`, `notify_buddies` (honours per-buddy + global `notify_*` flags), and `publish_*` signals. Each creator queues SSE/WebSocket/push events that are drained in a SQLAlchemy `after_commit` listener so we only fan out events for changes that actually persisted (and `after_rollback` discards them).
- `init_db.py` / `seed.py` — schema reset + ~93-exercise catalogue seed.
- `content_seed.py` — bulk seed of the editable content tables (quotes, tips, focuses, muscles, stretches, exercise info, body-map shapes, etc.). Idempotent: only inserts rows that don't already exist, so admin edits survive restarts.

**Routers (mounted under `/api`)** — `backend/app/routers/`
- `auth.py` (`/auth`) — `POST /register`, `POST /register-trainer`, `POST /login` (OAuth2 password flow; accepts username **or** email, case-insensitive), `GET /me`, `POST /change-password`, `PATCH /preferences` (`primary_color`, `progression_speed`), `PATCH /notification-preferences`, `PATCH /gym-preferences` (home-gym geofence + `training_reminders_enabled`, powering the location/time workout suggestions), `PATCH /profile`; password-reset + email-verification flows: `POST /forgot-password`, `POST /reset-password`, `POST /verify-email`, `POST /resend-verification`, `POST /resend-verification-me`. Forgot/resend always return 202 to avoid email enumeration.
- `workouts.py` (`/workouts`) — list (GET), create (POST), update (PUT `/{id}`), delete (DELETE `/{id}`). `id` is a client-generated UUID; duplicate POST returns 409.
- `prs.py` (`/prs`) — list (GET), upsert (PUT `/{exercise_id}`), delete (DELETE `/{exercise_id}`).
- `health.py` (`/health`) — body metric CRUD (`metric_type`, `value`, `unit`, `date`, `note`); GET supports `metric_type` / `from` / `to` filters.
- `items.py` (`/items`) — generic scaffold CRUD, mostly unused.
- `admin.py` (`/admin`) — admin-only endpoints (user list, role flips, feedback triage). Guarded by `get_admin_user`.
- `buddies.py` (`/buddies`) — user search, friend requests (`pending_out`/`pending_in`/`accepted`), per-buddy notification toggles, weekly/monthly scoreboard, motivation pings, public profile fetch.
- `notifications.py` (`/notifications`) — list / mark-read / delete in-app notifications.
- `live.py` (`/live-sessions`) — real-time co-workout sessions (status `active` → `ended`); owners broadcast their current exercise/set/weight, buddies and accepted trainers can view; trainers additionally see the set-by-set timeline via `LiveSetEvent` rows.
- `feedback.py` — user feedback intake (`router`); admin triage queue (`admin_router`).
- `events.py` (`/events`) — `GET /stream` returns an SSE event stream keyed off the JWT (token can be passed via `Authorization` header *or* `?token=` query because `EventSource` can't set headers).
- `content.py` (`/content`) — public GETs + admin-only writes for editable content tables (quotes, tips, focuses, muscles, stretches, exercise info, metric defs, body-map shapes, week days).
- `trainers.py` (`/trainers`) — trainer directory, profile updates, request/accept/decline trainer↔trainee links.
- `regimes.py` (`/regimes`) — 7-day workout-plan CRUD and the rule-based questionnaire generator (goal, experience, days/week, focus + avoid muscles, equipment).
- `assignments.py` (`/assignments`) — trainer assigns a regime to a trainee; trainee accepts and applies to their weekly plan.
- `chat.py` (`/chat`) — DMs + coaching-channel chat (REST for bootstrap, WebSocket `/chat/ws` for live delivery). Conversations are stored as ordered `(user_low, user_high, kind)` so each peer relationship is a single row.

**Data model highlights** (`models.py`)
- `User`: `is_admin`, `is_verified` (existing users grandfathered as verified on migration so they don't get locked out), `is_trainer` + trainer profile columns, `primary_color`, `progression_speed`, and four `notify_*` master switches that gate buddy-driven pings; plus a home-gym geofence (`gym_name`, `gym_latitude`, `gym_longitude`, `gym_radius_m`) and `training_reminders_enabled` that drive the client-side location/time "start your usual training" suggestion.
- `WorkoutSession.id` is a client-generated UUID string; `exercises` is a **JSONB** array (no join table; full exercise+sets embedded); `duration` is **milliseconds**.
- `PersonalRecord` has a unique `(user_id, exercise_id)` constraint — always upsert via `PUT /api/prs/{exercise_id}`; `is_cardio` boolean.
- `Exercise.id` is the short key (`"bench"`, `"ohp"`, …) matching the frontend `EM` map.
- `BodyMetric` stores time-series health data (`metric_type`, `value`, `unit`, `date`, `note`).
- Buddy system: `Buddy` is **directed** (two rows per accepted pair) so `WHERE user_id = X` returns every buddy in one query.
- `Notification.payload` is JSONB; `kind` covers `buddy_request | buddy_accepted | workout_done | pr_set | motivate | live_started | live_joined | live_ended | chat_message | trainer_link_request | trainer_link_accepted | regime_assigned`.
- `LiveSession` exposes rich set-by-set broadcast columns (`current_exercise_id`, `current_set_index`, `last_weight`, etc.) plus a separate `LiveSetEvent` table for the trainer-only timeline.
- `PushSubscription`: unique `(user_id, endpoint)`; auto-upsert on resubscribe; auto-pruned when push returns 404/410.
- `TrainerLink` is **asymmetric** (single row with `trainer_id`/`trainee_id`/`initiator_id`) — contrast with `Buddy`'s two-row directed design.
- `Conversation` (and `Message`, `MessageRead`) — DM and coaching-channel chat, with per-user read tracking for unread badges.
- Editable content tables: `Quote`, `Tip`, `Focus`, `Muscle`, `Stretch`, `ExerciseInfo`, `MetricDef`, `BodyMapShape`, `WeekDay`, `ExerciseMotion`. These mirror the data that used to live in `frontend/src/data/*.ts`; the frontend can now read everything live via `/api/content/*`.
- Token tables (`PasswordResetToken`, `EmailVerificationToken`) store `token_hash` (SHA-256), `expires_at`, and a consumed/used timestamp.

### Frontend (`frontend/src/`)

**Top-level routing** (`App.tsx`)
- `/admin` → `<AdminApp />` (admin console, `src/admin/`).
- `/exercise-graphics` → `<ExerciseGraphicsDemo />` (stick-figure animation gallery).
- `/exercise-editor` → `<ExerciseEditor />` (motion/keyframe editor).
- `/reset-password?token=…` and `/verify-email?token=…` — deep links from emails; force the auth screen until the flow completes.
- Everything else → `<WorkoutTracker />` (the main app), with a one-shot splash gated on `sessionStorage["gamgee_splash_shown"]`.

**State and orchestration** — `WorkoutTracker.tsx` is the single stateful root. It owns every piece of app state (token, user info, history, PRs, weekly plan, wizard state, active workout, primary colour, buddies/notifications/live/trainers/regimes/conversations), performs all `authFetch` calls, and passes data + callbacks down. Real-time refresh is driven by `useEventStream` (SSE) and `useChatSocket` (WebSocket).

**Tabs** (`components/tabs/`) — `workout | history | prs | buddies | health | coach | exercises | notifications | profile | settings | chat | coaching | trainees | regimes`. Active tab is persisted to `sessionStorage`; a `?tab=` query param overrides it (push notifications deep-link this way via the service worker).

**Wizard flow** (`components/workout/`) — workout creation steps:
1. `WizardStart` — last-session summary, motivational quote, start button.
2. `WizardMode` — pick a plan source (weekly plan, focus, custom build).
3. `WizardFocus` / `WizardWeeklySetup` — pick a focus or edit the recurring 7-day plan.
4. `WizardBuild` — search/add exercises; `BodyMap` previews coverage.
5. `WizardCardio` — optional warm-up / cool-down cardio slots.
6. `ActiveWorkout` — live set logging with PR detection (broadcasts to `LiveSession` if active).
7. `WorkoutComplete` — post-workout summary, share to buddies.

`WorkoutTab.tsx` routes between wizard steps and `ActiveWorkout` based on `active` + `wStep` props.

**Hooks** (`src/hooks/`)
- `useEventStream(token, onEvent)` — subscribes to `/api/events/stream` via `EventSource`; auto-reconnects.
- `useChatSocket(token, onMessage)` — opens a WebSocket to `/api/chat/ws`; receives `message | conversation | read` events.
- `useContentLibrary` — lazy-fetches and caches `/api/content/*` lookup tables.
- `useMobileBackGesture` — Android back-button / swipe handler.

**Context** (`src/context/`)
- `ToneContext` — voice setting (`bro | grl | pro`) that swaps body copy on quotes/tips.
- `OnboardingContext` — first-run tour state.

**Data layer** (`src/data/`) — static lookup tables bundled with the frontend (the canonical copy now lives in DB; these are fallbacks / offline defaults):
- `exercises.ts` — `EM` (id → `{ p, s }` primary/secondary muscle ids); `ALL_EX` (full `ExerciseDef[]`); also subscribes to user-created custom exercises stored in localStorage.
- `exerciseInfo.ts` — setup/execute/cue strings.
- `exerciseMotions.ts` + `motionStorage.ts` — stick-figure animation keyframes for `<StickFigure />`.
- `muscles.ts` — `MI` (id → display name + group).
- `focuses.ts` — `FocusDef[]`.
- `bodymap.ts` — SVG path/ellipse data.
- `tips.ts`, `quotes.ts`, `stretches.ts`, `metrics.ts` — coaching content.
- `weeklyPlan.ts` — load/save the user's recurring 7-day plan from `localStorage` (`gamgee_weekly_plan`).
- `contentApi.ts` — typed helpers for the `/api/content/*` endpoints.

**Logic** (`src/`)
- `analysis.ts` — `analyzeEx(exId, history)` → progression status (`NEW | GAINING | READY | STALLED | …`), estimated 1RM, recommended next weight/reps.
- `constants.ts` — `UPPER_IDS`, `GROUPS`, `getActive()` builds `ActiveMuscles` from exercises, `muscleGroups()`, `STATUS` map.
- `utils.ts` — `fmtClock`, `fmtDate`, `fmtDur`, `orm1` (Epley: `w * (1 + r/30)`).
- `types.ts` — every shared TypeScript interface (workouts, buddies, live sessions, trainers/regimes, chat).
- `push.ts` — service-worker registration + Web Push subscribe/unsubscribe helpers.

**Auth + API**
- Token stored in `localStorage["iron_log_token"]`. A 401 from any `authFetch` automatically clears it and bumps the user to the auth screen.
- Vite proxies `/api` → `BACKEND_URL` (defaults to `http://localhost:8000`); WebSocket upgrade is also forwarded (`ws: true`) so the chat socket works in dev.
- The auth screen (`components/AuthScreen.tsx`) drives register / login / forgot-password / reset / verify-email — all gated on a single component with view switching.

**PWA** — configured in `vite.config.ts` via `vite-plugin-pwa`. Manifest sets theme/background colour, icons, standalone display. Workbox runtime caching: `NetworkOnly` for `/api/events` and `/api/chat/ws`, `NetworkFirst` for the rest of `/api/*`. `public/push-handlers.js` is imported into the generated service worker to handle Web Push events.

**Theming system** — a single CSS custom property `--primary` (default `#28D1FF`) drives every accent in the app:
- `--accent` = `var(--primary)` — interactive elements.
- `--ad` / `--ad2` — `color-mix(in srgb, var(--primary) 11%/22%, transparent)` tinted backgrounds.
- `--pr` = `var(--primary)`; `--pr-muted` = `color-mix(in srgb, var(--primary) 65%, var(--muted))` — PR card accents.
- `--logo-hue-shift` = `selectedHue − 193°` — CSS `hue-rotate` applied to the PNG logo (193° is the original cyan).

`WorkoutTracker.tsx` reads/writes `localStorage["gamgee_primary_color"]`, applies the variables to `document.documentElement` via `useEffect`, and persists via `PATCH /api/auth/preferences`. A small inline `<script>` in `index.html` re-applies the colour synchronously from `localStorage` *before* the first paint so the splash screen never flashes the default cyan.

`ProfileTab.tsx` contains the `ColorPicker` (8 swatches + native `<input type="color">`); `hexToHue(hex)` in `WorkoutTracker.tsx` converts a hex to HSL hue (0–360°).

### Configuration
- `.env.example` — every env var documented inline. Key ones: `JWT_SECRET`, `PASSWORD_PEPPER`, `SENDGRID_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`, `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` / `_SUBJECT`, `CORS_EXTRA_ORIGINS`.
- `docker-compose.yml` — dev compose; injects env vars, backend waits for DB healthcheck, frontend volume-mounted for HMR.
- `docker-compose.prod.yml` — production compose; no volume mounts, no `--reload`, restricted port exposure.
- `frontend/nginx.conf` — production reverse proxy (multi-stage Docker build target).
- `docs/` — `deployment.md` (Hetzner+Caddy), `sendgrid-setup.md`, `web-push-vapid.md`, plus body-map design docs.

## Conventions worth knowing

- **In-place migrations only.** New columns are added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `main.py`; there's no Alembic in use (despite the dep being listed). Add new migrations alongside existing ones in `main.py`'s startup block. Wrap any non-idempotent migration (e.g., column with default that needs backfilling) in an `information_schema` check, like `is_verified` already does, so it only runs once.
- **Editable content lives in DB.** When adding a new lookup table (a new flavour of `Quote`/`Tip`/etc.), seed defaults via `content_seed.py`; the seeder upserts by id so admin edits aren't clobbered on restart.
- **Realtime fan-out happens via `notifications.py` helpers.** Don't call `events.publish` / `chat_ws.publish` / `push.send_to_user` directly from routers — go through `create_notification` / `notify_buddies` / `publish_*` so events are deferred to `after_commit` and discarded on rollback.
- **Token-style endpoints return 202 unconditionally.** `forgot-password`, `resend-verification`, and similar must not leak whether an email is registered.
- **JWT for SSE/WebSocket comes via `?token=`,** not `Authorization`, because `EventSource` and (browser) WebSocket can't set custom headers. Both validate the token before subscribing.
- **Cardio vs. strength PRs** — `PersonalRecord.is_cardio` flips the PR comparison (greater weight × reps for strength, greater value for cardio).
- **Two notification gates.** Buddy-driven pings require **both** the recipient's global `User.notify_*` flag **and** the per-buddy `Buddy.notify_*` flag — see `_PREF_FIELD` in `notifications.py`.
- **Don't reuse component names across routes.** `App.tsx` switches on `window.location.pathname` for `/admin`, `/exercise-graphics`, `/exercise-editor` — these are entirely separate component trees, not React Router routes.
- **PWA service worker caches `/api/*` with NetworkFirst.** When debugging stale data in dev, hard-reload **and** unregister the service worker.
- **Tests live in `backend/tests/` (pytest) and `frontend/tests/unit/` (vitest) + `frontend/tests/e2e/` (Playwright).** CI runs all three and additionally enforces `tsc --noEmit` on the frontend; keep them green.
