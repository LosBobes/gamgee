import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import items, workouts, prs, auth, health, admin, buddies, notifications, live, feedback, events

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
        _conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
        # push_subscriptions: ensure the unique (user_id, endpoint) constraint
        # exists for existing dev DBs that pre-date Web Push support.
        _conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_push_user_endpoint "
            "ON push_subscriptions (user_id, endpoint)"
        ))

app = FastAPI(title="Gamgee API", version="0.1.0", redirect_slashes=False)

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


@app.get("/health")
def health():
    return {"status": "ok"}
