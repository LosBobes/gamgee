import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import (
    items, workouts, prs, auth, health, admin, buddies, notifications, live,
    feedback, events, content, trainers, regimes, assignments, chat,
)
from .version import __version__

Base.metadata.create_all(bind=engine)

# Lightweight in-place migration so existing dev databases pick up newer columns
# without a full `python -m app.init_db` reset. Postgres-only: a fresh SQLite
# (used by tests) gets these columns from create_all and doesn't support the
# `IF NOT EXISTS` ALTER syntax.
if engine.dialect.name == "postgresql":
    with engine.begin() as _conn:
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(254)"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7)"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS progression_speed VARCHAR(20)"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"))
        # is_verified: new column defaults to FALSE for fresh inserts, but
        # existing users (registered before email verification existed) are
        # grandfathered in as verified so they don't get locked out.
        _existing = _conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='is_verified'"
        )).first()
        if _existing is None:
            _conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE"))
            _conn.execute(text("UPDATE users SET is_verified = TRUE"))
        # Backfill any legacy mixed-case emails to lowercase so the (now case-
        # insensitive) lookups in /auth match historic rows. Skip rows that
        # would collide with an existing lowercase email — those duplicate
        # accounts have to be merged manually.
        _conn.execute(text(
            "UPDATE users SET email = LOWER(email) "
            "WHERE email IS NOT NULL "
            "  AND email <> LOWER(email) "
            "  AND NOT EXISTS ("
            "    SELECT 1 FROM users u2 "
            "    WHERE u2.id <> users.id AND LOWER(u2.email) = LOWER(users.email)"
            "  )"
        ))
        _conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
        # push_subscriptions: ensure the unique (user_id, endpoint) constraint
        # exists for existing dev DBs that pre-date Web Push support.
        _conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_push_user_endpoint "
            "ON push_subscriptions (user_id, endpoint)"
        ))
        # Trainer profile columns
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN NOT NULL DEFAULT FALSE"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_bio TEXT"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_specialties JSONB"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_certifications TEXT"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_years_experience INTEGER"))
        # Global notification preference columns — master switches surfaced in
        # the Settings tab. Default TRUE so existing accounts keep getting all
        # their buddy-driven pings.
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_workout BOOLEAN NOT NULL DEFAULT TRUE"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_pr BOOLEAN NOT NULL DEFAULT TRUE"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_motivate BOOLEAN NOT NULL DEFAULT TRUE"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_live BOOLEAN NOT NULL DEFAULT TRUE"))
        # Rest-timer presets (light / medium / long). Nullable so the client can
        # detect "unset" and fall back to its built-in defaults.
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rest_short_seconds INTEGER"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rest_medium_seconds INTEGER"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rest_long_seconds INTEGER"))
        # RPE→step-multiplier table and optional per-exercise overrides.
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rpe_multipliers JSONB"))
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rpe_multipliers_by_exercise JSONB"))
        # Per-user opt-out for the whole RPE feature; existing rows stay on.
        _conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rpe_enabled BOOLEAN NOT NULL DEFAULT TRUE"))
        # Post-session RPE on workout records (used to scale next session's jump).
        _conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS rpe INTEGER"))
        # Live session rich-broadcast columns
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS current_exercise_id VARCHAR"))
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS current_exercise_name VARCHAR"))
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS current_set_index INTEGER"))
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS last_weight DOUBLE PRECISION"))
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS last_reps INTEGER"))
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS total_sets_planned INTEGER"))
        _conn.execute(text("ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS total_exercises_planned INTEGER"))
        # Exercise description column — added so each exercise can carry a
        # short summary independent of the setup/execute/cue coaching script.
        _conn.execute(text("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT"))

app = FastAPI(title="Gamgee API", version=__version__, redirect_slashes=False)

_extra_origins = [o.strip() for o in os.environ.get("CORS_EXTRA_ORIGINS", "").split(",") if o.strip()]
_app_base = os.environ.get("APP_BASE_URL", "").strip()
_allowed_origins = ["http://localhost:5173"]
if _app_base and _app_base not in _allowed_origins:
    _allowed_origins.append(_app_base.rstrip("/"))
_allowed_origins.extend(o for o in _extra_origins if o not in _allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(workouts.router, prefix="/api")
app.include_router(prs.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(buddies.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(live.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(feedback.admin_router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(trainers.router, prefix="/api")
app.include_router(regimes.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


# Seed any empty content tables on startup so a fresh dev DB or upgrade is
# immediately usable. Existing rows are left alone (the seeder upserts by id
# only for missing rows), so admin edits survive container restarts.
try:
    from . import content_seed
    content_seed.seed_if_empty()
except Exception as _exc:
    # Don't take the API down if seeding hits an issue mid-rollout — log and
    # continue. The /api/content/* endpoints just return empty arrays until the
    # operator runs `python -m app.content_seed` manually.
    import logging
    logging.getLogger(__name__).warning("Content seed skipped: %s", _exc)

# Backfill exercise descriptions on existing rows so the description column
# isn't full of NULLs on a database that pre-dates the field. New exercises are
# only inserted if missing; existing rows keep their other columns untouched.
try:
    from . import seed as exercise_seed
    exercise_seed.seed()
except Exception as _exc:
    import logging
    logging.getLogger(__name__).warning("Exercise seed/backfill skipped: %s", _exc)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/version")
def version():
    return {"version": __version__}
