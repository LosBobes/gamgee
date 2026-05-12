from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import items, workouts, prs, auth, health, admin, buddies, notifications, live

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
        _conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))

app = FastAPI(title="Gamgee API", version="0.1.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/health")
def health():
    return {"status": "ok"}
