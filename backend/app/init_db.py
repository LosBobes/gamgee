"""
Drop all tables, recreate them from models, then seed exercises.
Run with:  python -m app.init_db  (from the backend/ directory)
"""

from .database import Base, engine, SessionLocal
from . import models  # noqa: F401  — import models so metadata is populated
from .seed import seed


def init():
    print("Dropping all tables…")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables…")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    print("Done.")


if __name__ == "__main__":
    init()
