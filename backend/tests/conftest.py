"""Shared pytest fixtures.

We run the backend against a SQLite in-memory database so tests don't need a
running Postgres. The models use ``JSONB`` (Postgres-only) for a couple of
columns, so we register a tiny compile rule that maps it to ``JSON`` on SQLite.
"""

from __future__ import annotations

import os
import uuid
from typing import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):  # pragma: no cover - trivial
    return "JSON"


# Point the app at a throwaway DB URL before any app modules are imported.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("JWT_SECRET", "test-secret")
# Disable in-process rate limiting in tests — many fixtures hammer
# register/login from the same loopback IP.
os.environ["RATE_LIMIT_ENABLED"] = "false"

from app import database  # noqa: E402  (intentional late import)
from app.main import app  # noqa: E402


@pytest.fixture()
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    database.Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    TestingSession = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine) -> Iterator[TestClient]:
    TestingSession = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[database.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _register_and_login(client: TestClient, username: str, password: str = "Str0ng-Test-Pass!") -> str:
    client.post(
        "/api/auth/register",
        json={
            "username": username,
            "password": password,
            "name": "Test User",
            "email": f"{username}@example.com",
            "gender": "prefer_not_to_say",
        },
    )
    res = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return res.json()["access_token"]


@pytest.fixture()
def auth_token(client: TestClient) -> str:
    return _register_and_login(client, f"user_{uuid.uuid4().hex[:8]}")


@pytest.fixture()
def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture()
def make_user(client: TestClient):
    """Factory that creates a fresh user and returns auth headers."""

    def _make(username: str | None = None, password: str = "Str0ng-Test-Pass!") -> dict[str, str]:
        name = username or f"user_{uuid.uuid4().hex[:8]}"
        token = _register_and_login(client, name, password)
        return {"Authorization": f"Bearer {token}"}

    return _make
