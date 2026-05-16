# Gamgee — Upgrade & Feature Recommendations

A grounded list of upgrades and new-feature ideas for the current stack
(FastAPI + Postgres backend, Vite/React PWA frontend, SSE + WebSocket
realtime, Web Push, Docker Compose deploy). Items are ordered roughly by
**user value per unit of effort** within each section, with notes on
implementation surface and any gotchas.

---

## 1. High-impact user-facing features

### 1.1 Rest-timer with smart defaults and push notifications
Workout logging today captures sets but not the rest interval between
them. A built-in timer that auto-starts when a set is completed in
`ActiveWorkout`, with defaults tied to the exercise type (compound vs
isolation, strength vs hypertrophy), would close the most common gap
versus competing trackers. Fire a Web Push notification when the timer
ends so the user can put the phone down.

- **Frontend**: extend `ActiveWorkout` with a per-set timer; cache the
  user's last-used rest per exercise in `localStorage`.
- **Backend**: optional per-set `rest_seconds` field on the JSONB
  `WorkoutSession.exercises` payload (no schema change needed since it's
  JSONB).
- **Push**: reuse `push.dispatch_batch_async`; new `Notification.kind =
  "rest_done"` that's *not* fanned out to buddies.

### 1.2 Set-level RPE / RIR tracking
The analyzer (`analysis.ts`) currently infers readiness only from weight
× reps. Adding an optional 1–10 RPE or 0–4 RIR field per set would
dramatically improve the `READY` / `STALLED` heuristic and unlock
volume-load-by-RPE charts.

- **Frontend**: extra optional input on each set; default hidden behind a
  setting so casual users don't see it.
- **Backend**: again, JSONB so no migration. Update `analyzeEx` to
  weight load × RPE for the projected 1RM (Mike Tuchscherer's RPE chart
  is public-domain).

### 1.3 Exercise substitution & "swap this lift"
When a user can't do their planned exercise (equipment, soreness, time),
let them swap it for one targeting the same primary muscle group. The
data is already there: `Exercise.primary_muscles` + `EM`.

- **Frontend**: a "swap" button in `WizardBuild` and `ActiveWorkout`
  that surfaces same-primary-muscle alternatives, sorted by similarity
  (shared secondary muscles).
- **Backend**: no change needed; pure frontend lookup against `EM`.

### 1.4 Progress-photo timeline
You already have `BodyMetric` for time-series data. Add a photo-attached
metric type so the user can log progress photos against weight / waist /
date. Visual progress is a major retention driver.

- **Backend**: new `ProgressPhoto` table (`user_id`, `taken_at`,
  `storage_key`, optional `body_metric_id` link). Store images in a
  local volume in dev and S3-compatible object storage (Hetzner Object
  Storage — already on Hetzner) in prod.
- **Privacy**: encrypt-at-rest, never expose URLs publicly, signed-URL
  fetch only.
- **Frontend**: new sub-section in `HealthTab` with a swipeable
  before/after slider.

### 1.5 Workout templates / saved routines
Today the only "saved plan" is the recurring weekly plan. Letting users
save *ad-hoc* templates ("Push A", "Vacation hotel-gym", "Deload week")
would massively reduce wizard friction.

- **Backend**: new `WorkoutTemplate` (id, user_id, name, exercises JSONB,
  is_shared bool). Optional sharing to buddies / trainers feeds the
  social side.
- **Frontend**: "Save as template" button on `WorkoutComplete`; new
  picker in `WizardMode`.

### 1.6 Apple Health / Google Fit / Garmin import
For users coming from another tracker the import barrier is the #1
churn cause. Even a CSV importer with a documented schema (one row per
set) closes most of it. Native HealthKit / Health Connect bridges need
the iOS/Android wrappers (see §4.2).

- **Backend**: a `/api/import/csv` endpoint accepting a small set of
  column layouts (Strong, Hevy, JEFIT exports are all CSV).
- **Frontend**: a drag-and-drop importer on the profile tab with a
  preview / dry-run step.

### 1.7 Plate calculator & barbell loadout overlay
Tiny but high-value: when a working weight is set, render the actual
plate combo (e.g. `45 + 25 + 10` per side for 205 lb) using the user's
gym's plate inventory. Gym profile (kg vs lb, available plates) lives in
user prefs.

- **Frontend-only**, ~150 lines.

### 1.8 1RM testing protocol & e1RM history chart
You already compute `orm1` (Epley) per set. Surface the e1RM trend over
time per exercise as a line chart on the PRs tab, with an optional
guided test-day protocol (warm-up ramp, 3-2-1 attempt picker).

### 1.9 Streaks, badges, and seasonal challenges
Buddy scoreboard is great competitive social pressure; layer in
intrinsic motivation:
- "N-day streak" with a forgiveness window (rest days don't break it).
- Milestone badges (first 100 sessions, first PR after 30 days, etc.).
- Monthly or quarterly challenges (e.g. "May Squat 10×Bodyweight").

Wire into `Notification` so badges trigger an in-app + push event.

### 1.10 Programmable mesocycles (block periodization)
The `Regime` system is a static 7-day plan. A natural next step is
multi-week mesocycles with progressive overload rules (e.g. "+2.5 kg /
week", "RPE cap +1 / week, deload week 5"). This makes the trainer
product genuinely differentiated.

- **Backend**: new `Mesocycle` (weeks JSONB, rules), `MesocycleWeek`
  (regimes per day), and an `Assignment.mesocycle_id` extension.
- **Frontend**: a new `MesocycleEditor` admin/trainer tool.

---

## 2. UX polish and PWA improvements

### 2.1 True offline-first workout logging
Workbox currently caches `/api/*` `NetworkFirst`, which means a flaky
network silently breaks logging. Move workout writes to a background-
sync queue:
- Persist new sets to IndexedDB immediately.
- Background-sync flushes to `POST /api/workouts` when online.
- Reconcile by client-generated UUID (the model already supports this).

### 2.2 Skeleton states and optimistic updates
Most tabs do a fetch on mount before showing anything. Pre-render
skeleton rows from cached lookups (already in `useContentLibrary`) and
do an optimistic update for set logging, then reconcile on the fetch.

### 2.3 Keyboard / gamepad shortcuts in `ActiveWorkout`
Power users on a tablet at the gym love this:
- `Space` to log set, `← / →` to nudge weight, `↑ / ↓` for reps.
- Gamepad API support unlocks dirt-cheap Bluetooth remotes (one-button
  set logging).

### 2.4 Dark mode parity audit + AMOLED black variant
The theming system is centred on `--primary`. Audit the background
tokens for true-black contrast on OLED phones (Android battery + visual
polish). One extra theme variant, ~50 lines.

### 2.5 Splash screen + iOS install nag
You already gate `SplashScreen` on a `sessionStorage` flag. iOS Safari
silently swallows the PWA install prompt unless you nudge — add a
dismissible banner pointing at "Share → Add to Home Screen" on iOS, and
the standard `beforeinstallprompt` flow on Android.

### 2.6 Accessibility pass
- Color-only state (e.g. `STATUS` chips) needs an icon / label backup
  for color-blind users.
- `aria-live="polite"` on PR-detection toasts.
- Focus traps in the wizard modals.
- Run `@axe-core/playwright` in CI on key flows.

### 2.7 i18n scaffolding
All UI strings are inline English. Even before translating, extracting
to `react-intl` (or `@lingui/core`) future-proofs the app and the
voice-switching `ToneContext` already shows the pattern.

---

## 3. Data, analytics, and coaching depth

### 3.1 Volume / intensity / frequency dashboards
The `CoachTab` is a great surface for charts you don't have yet:
- Weekly volume per muscle group (use `EM` + set count × weight).
- Intensity distribution (% of e1RM histogram).
- Frequency heatmap (which days you actually train each muscle).

Use `recharts` (or `visx`) — both bundle small and render well in a PWA.

### 3.2 Auto-deload suggestions
When the analyzer flags ≥ N exercises as `STALLED` simultaneously, raise
a banner on the workout tab suggesting a deload week (50–60 % volume,
80 % intensity). This is the kind of cognitive offload coaches charge
real money for.

### 3.3 Soreness / readiness check-in
A daily 10-second check-in (sleep 1–5, soreness per muscle 0–3,
stress 1–5) feeds the analyzer's readiness score and produces lovely
charts. Stash in `BodyMetric` with new `metric_type`s — no schema work.

### 3.4 Body-map heatmap (volume-weighted)
The body map currently shows *coverage*. Switch it to a **heatmap**
weighted by recent set volume per muscle, with a 7/14/30-day toggle.
This makes the imbalance story visible at a glance.

The bodymap skill exists in this repo — use it.

### 3.5 Trainer client dashboard
`TraineesTab` is functional but flat. A trainer with 10+ clients needs:
- Sortable client list with last-session date, adherence %, flagged
  stalls.
- Bulk-message a tag (e.g. "all clients on Strength-12 program").
- Templated weekly check-in (5 questions, auto-sent Mondays).

### 3.6 Export & data portability
A "Download all my data" button — JSON + CSV bundle of sessions, PRs,
metrics, chat. GDPR-aligned and trust-building. Implement as a
streaming response so we don't materialize the whole bundle in memory.

---

## 4. Platform and infrastructure

### 4.1 Multi-worker realtime: Redis pub/sub
`events.py` and `chat_ws.py` are in-process. The moment Gamgee runs
multiple uvicorn workers (or scales horizontally), realtime breaks
silently. Swap the in-process pubsub for Redis (`aioredis`) before this
bites — the abstraction is already there (`publish`, `subscribe`), so
it's a 1-file change.

### 4.2 Native wrappers (Capacitor)
The app is a PWA. Wrapping it in Capacitor unlocks:
- HealthKit / Health Connect bridges.
- Real native push (APNs / FCM) — Safari Web Push is iOS 16.4+ and
  flaky for some users.
- App Store / Play Store distribution (some users won't trust a web
  app).

The frontend is largely Capacitor-ready; the main effort is
authentication storage and deep-link routing.

### 4.3 OAuth / SSO providers
"Sign in with Apple/Google" reduces signup friction and unlocks Apple
Store policy compliance (required if you also offer email signup).
Backend already has the auth surface; add a `/api/auth/oauth/{provider}`
exchange.

### 4.4 Real migrations with Alembic
CLAUDE.md notes the project does in-place migrations in `main.py` via
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`, with Alembic listed as a dep
but unused. This is fine for additive changes but already fragile for
anything else (renames, type changes, backfills, constraints). Adopt
Alembic before the first non-additive migration is needed — the
existing `ALTER` blocks become the autogenerated baseline.

### 4.5 Observability: Sentry + Prometheus
- Sentry on both backend (FastAPI middleware) and frontend (PWA build
  has source maps).
- `prometheus-fastapi-instrumentator` exposes `/metrics`; Caddy can
  scrape it. Track p95 latency on hot endpoints (`/workouts`, `/prs`,
  `/events/stream`).
- Log request IDs end-to-end so SSE/WebSocket events are correlatable.

### 4.6 Backups and restore drills
`docker-compose.prod.yml` should run a nightly `pg_dump` to encrypted
object storage with retention. Then *actually* do a restore drill into
a staging compose stack quarterly — restores you've never tested don't
work.

### 4.7 Rate limiting + abuse prevention
- `auth/login`, `forgot-password`, `register` have no rate limit shown.
  `slowapi` adds per-IP throttling in ~20 lines.
- Buddy "motivate" pings need per-sender-per-recipient throttling
  (today a buddy can spam-fire them).
- Chat WebSocket: per-user msgs/min cap.

### 4.8 CI / dev-experience wins
- Cache pip + pnpm in `.github/workflows/test.yml` (10× speedup on
  cold runs).
- Add `ruff` (replaces flake8/isort/black) — the codebase reads
  ruff-friendly already.
- `mypy --strict` on `backend/app/` — Pydantic v2 makes this cheap.
- `pre-commit` hook config so contributors get the same lint/format on
  commit.
- Add `frontend` to `dependabot.yml` (or rely on Renovate) for security
  patch automation.
- Lighthouse CI assertion in PRs (PWA score ≥ 90, perf ≥ 80).

### 4.9 Browser test coverage breadth
Playwright runs the e2e suite — make sure it runs against WebKit (iOS
Safari) too, not just Chromium, since PWA + iOS is where most real
bugs hide.

---

## 5. Security & privacy

### 5.1 Refresh tokens + short-lived access tokens
JWT today is HS256 7-day. A compromised token can't be revoked. Move to
a 15-min access token + opaque refresh token stored server-side; the
refresh table doubles as a "log out all devices" surface.

### 5.2 2FA (TOTP)
Trainers especially want it (financial / liability angle). The
`PasswordResetToken` pattern transfers cleanly to TOTP secrets.

### 5.3 Content security policy + Trusted Types
PWA + SW makes CSP slightly fiddly but worth doing — start in
`report-only` mode and tighten.

### 5.4 Audit log for trainer/admin actions
Right now an admin flipping `is_trainer` or wiping a feedback row
leaves no trail. A simple `AuditEvent` table (`actor_id`, `action`,
`target`, `before`, `after`, `at`) avoids future "who deleted this" arguments.

### 5.5 GDPR account deletion
"Delete my account" needs to cascade through workouts, PRs, chat,
trainer links, push subs, photos, etc. Wire it now while the model is
small.

---

## 6. Smaller, fast wins (≈ ½-day each)

- **Auto-save active workout to localStorage** so a refresh / crash
  doesn't lose the in-progress session.
- **"Copy last session"** button: starts a new workout with the same
  exercises as the most recent matching focus.
- **Search in chat** — `Conversation`/`Message` tables make this easy.
- **Notification preferences UI** — there are 4 master switches plus
  per-buddy flags; the UI is currently buried.
- **PWA badge** (`navigator.setAppBadge`) for unread chat + notifications.
- **Share PR via OG-image** — pre-render an OG image on the backend
  (`Pillow` or HTML-to-image) for "I just hit 315 lb!" shares.
- **Bulk-edit sets**: today editing a logged session is one row at a
  time — a multi-select would help.
- **Calendar view** on `HistoryTab` (month grid coloured by session
  intensity).
- **Exercise notes**: free-text per exercise that surfaces on the next
  log of that lift ("knees caved on last set 3 — film it next time").
- **Quick-add weight chips** (e.g. last 5 weights used) under each set
  input.
- **Bodyweight-progressive PRs**: PR comparator that uses
  weight × reps × bodyweight for bodyweight lifts (pull-ups, dips).

---

## 7. Stretch / longer-horizon ideas

### 7.1 AI workout coach (Claude API)
Use the Claude API (this repo's `claude-api` skill applies) to power:
- "Explain my plateau" — feed the last 8 weeks of an exercise's data,
  return a structured analysis + next-step plan.
- Natural-language workout logging ("3 sets of bench, 185 for 8 8 6,
  felt good") → parsed sets.
- Trainer-side draft replies in chat with prompt caching on the
  trainee's profile.

Pin to `claude-sonnet-4-6` for cost; cache the user-profile system
prompt aggressively (it changes rarely).

### 7.2 Real-time form-check via video
A "record this rep" widget that captures 5-10 s of video, runs
on-device pose estimation (MediaPipe / TF.js), and flags bar-path or
knee-cave issues. On-device only — never upload — so privacy is a
selling point.

### 7.3 Wearable integration
- Apple Watch / Wear OS companion: live HR overlay on `ActiveWorkout`,
  one-tap set logging.
- Whoop / Oura API → readiness score feeds the deload recommender.

### 7.4 Marketplace for trainers
Once mesocycles (§1.10) exist, trainers can sell programs as one-off
purchases or subscriptions. Stripe Connect, revenue share. This turns
Gamgee from "self-hosted hobby tracker" into a real product.

### 7.5 Group challenges & gym leaderboards
Beyond buddy scoreboard: opt-in public leaderboards filtered by
weight class / age bracket. Anti-cheat is the hard part (require photo
proof, trainer verification, etc.).

---

## Suggested sequencing

If I had to pick a 4-sprint plan, I would do roughly:

1. **Sprint 1 (foundations):** Rest timer (§1.1), RPE/RIR (§1.2),
   workout templates (§1.5), auto-save active workout (§6), Redis
   pub/sub (§4.1), rate limits (§4.7).
2. **Sprint 2 (visible polish):** Body-map heatmap (§3.4), volume
   dashboards (§3.1), e1RM history chart (§1.8), plate calculator
   (§1.7), accessibility pass (§2.6).
3. **Sprint 3 (data depth):** Soreness check-in (§3.3), auto-deload
   (§3.2), CSV import (§1.6), data export (§3.6), Alembic migrations
   (§4.4), audit log (§5.4).
4. **Sprint 4 (platform):** Capacitor wrapper (§4.2), refresh tokens
   (§5.1), Sentry + metrics (§4.5), progress photos (§1.4), AI coach
   MVP (§7.1).
