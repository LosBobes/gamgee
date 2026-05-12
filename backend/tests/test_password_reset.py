"""Password reset, email verification, and admin password-reset flows.

Email sending in dev/tests falls back to a logger (no SendGrid configured),
so we patch the email helpers to capture the raw tokens they would have
mailed and use them directly.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app import models
from app.routers import auth as auth_router

STRONG_PW = "Str0ng-Test-Pass!"
NEW_PW    = "An0ther-Strong-Pass!"


def _register(client: TestClient, username: str, password: str = STRONG_PW) -> dict:
    return {
        "username": username,
        "password": password,
        "name":     "Test User",
        "email":    f"{username}@example.com",
        "gender":   "prefer_not_to_say",
    }


def _capture_emails(monkeypatch):
    """Replace email senders with capture lists; returns (verify_sent, reset_sent)."""
    verify: list[tuple[str, str]] = []
    reset:  list[tuple[str, str]] = []

    def fake_verify(to, name, token):
        verify.append((to, token))
        return True

    def fake_reset(to, name, token):
        reset.append((to, token))
        return True

    monkeypatch.setattr(auth_router, "send_verification_email", fake_verify)
    monkeypatch.setattr(auth_router, "send_password_reset_email", fake_reset)
    return verify, reset


def test_register_starts_unverified_and_emits_verification(client: TestClient, monkeypatch):
    verify, _ = _capture_emails(monkeypatch)
    res = client.post("/api/auth/register", json=_register(client, "alice"))
    assert res.status_code == 201
    assert res.json()["is_verified"] is False
    assert len(verify) == 1
    assert verify[0][0] == "alice@example.com"


def test_verify_email_marks_user_verified(client: TestClient, monkeypatch):
    verify, _ = _capture_emails(monkeypatch)
    client.post("/api/auth/register", json=_register(client, "bob"))
    token = verify[-1][1]

    res = client.post("/api/auth/verify-email", json={"token": token})
    assert res.status_code == 204

    login = client.post("/api/auth/login", data={"username": "bob", "password": STRONG_PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    me = client.get("/api/auth/me", headers=headers).json()
    assert me["is_verified"] is True


def test_verify_email_rejects_garbage(client: TestClient, monkeypatch):
    _capture_emails(monkeypatch)
    client.post("/api/auth/register", json=_register(client, "carol"))
    res = client.post("/api/auth/verify-email", json={"token": "not-a-real-token-xxxxxxx"})
    assert res.status_code == 400


def test_verify_email_single_use(client: TestClient, monkeypatch):
    verify, _ = _capture_emails(monkeypatch)
    client.post("/api/auth/register", json=_register(client, "dave"))
    token = verify[-1][1]
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 204
    # Second use should fail.
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400


def test_forgot_password_does_not_leak_existence(client: TestClient, monkeypatch):
    _, reset = _capture_emails(monkeypatch)
    res = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert res.status_code == 202
    assert reset == []


def test_forgot_password_emits_reset_link_and_allows_reset(client: TestClient, monkeypatch):
    _, reset = _capture_emails(monkeypatch)
    client.post("/api/auth/register", json=_register(client, "erin"))
    res = client.post("/api/auth/forgot-password", json={"email": "erin@example.com"})
    assert res.status_code == 202
    assert len(reset) == 1
    token = reset[-1][1]

    bad = client.post("/api/auth/reset-password", json={"token": token, "new_password": "short"})
    assert bad.status_code == 422

    ok = client.post("/api/auth/reset-password", json={"token": token, "new_password": NEW_PW})
    assert ok.status_code == 204

    # New password works, old does not.
    assert client.post("/api/auth/login", data={"username": "erin", "password": NEW_PW}).status_code == 200
    assert client.post("/api/auth/login", data={"username": "erin", "password": STRONG_PW}).status_code == 401

    # Token is single-use.
    again = client.post("/api/auth/reset-password", json={"token": token, "new_password": NEW_PW})
    assert again.status_code == 400


def test_resend_verification_authenticated(client: TestClient, monkeypatch):
    verify, _ = _capture_emails(monkeypatch)
    client.post("/api/auth/register", json=_register(client, "fred"))
    initial_count = len(verify)

    login = client.post("/api/auth/login", data={"username": "fred", "password": STRONG_PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    res = client.post("/api/auth/resend-verification-me", headers=headers)
    assert res.status_code == 202
    assert len(verify) == initial_count + 1


def _make_admin(client: TestClient, db_session) -> tuple[str, dict]:
    """Register a user and flip their is_admin flag directly in the DB."""
    payload = _register(client, "rootadmin")
    client.post("/api/auth/register", json=payload)
    user = db_session.query(models.User).filter(models.User.username == "rootadmin").first()
    user.is_admin = True
    db_session.commit()
    login = client.post("/api/auth/login", data={"username": "rootadmin", "password": STRONG_PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    return user.username, headers


def test_admin_can_set_user_password_directly(client: TestClient, db_session, monkeypatch):
    monkeypatch.setattr("app.routers.admin.send_admin_password_reset_notice", lambda *a, **k: True)
    _capture_emails(monkeypatch)
    _, admin_headers = _make_admin(client, db_session)
    client.post("/api/auth/register", json=_register(client, "victim"))

    victim = db_session.query(models.User).filter(models.User.username == "victim").first()
    res = client.post(
        f"/api/admin/users/{victim.id}/reset-password",
        headers=admin_headers,
        json={"new_password": NEW_PW, "send_email": False},
    )
    assert res.status_code == 200, res.text
    assert res.json()["mode"] == "password_set"
    # Old password no longer works, admin-set one does.
    assert client.post("/api/auth/login", data={"username": "victim", "password": STRONG_PW}).status_code == 401
    assert client.post("/api/auth/login", data={"username": "victim", "password": NEW_PW}).status_code == 200


def test_admin_can_send_reset_link(client: TestClient, db_session, monkeypatch):
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "app.routers.admin.send_password_reset_email",
        lambda to, name, token: sent.append((to, token)) or True,
    )
    _, admin_headers = _make_admin(client, db_session)
    client.post("/api/auth/register", json=_register(client, "wendy"))

    wendy = db_session.query(models.User).filter(models.User.username == "wendy").first()
    res = client.post(
        f"/api/admin/users/{wendy.id}/reset-password",
        headers=admin_headers,
        json={"send_email": True},
    )
    assert res.status_code == 200, res.text
    assert res.json()["mode"] == "reset_link_sent"
    assert res.json()["reset_link"].startswith("http")
    assert len(sent) == 1


def test_non_admin_cannot_reset_other_user(client: TestClient, db_session):
    client.post("/api/auth/register", json=_register(client, "regular"))
    client.post("/api/auth/register", json=_register(client, "target"))
    login = client.post("/api/auth/login", data={"username": "regular", "password": STRONG_PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    target = db_session.query(models.User).filter(models.User.username == "target").first()
    res = client.post(
        f"/api/admin/users/{target.id}/reset-password",
        headers=headers,
        json={"new_password": NEW_PW},
    )
    assert res.status_code == 403


def test_admin_can_toggle_is_verified(client: TestClient, db_session, monkeypatch):
    _capture_emails(monkeypatch)
    _, admin_headers = _make_admin(client, db_session)
    client.post("/api/auth/register", json=_register(client, "xavier"))
    xavier = db_session.query(models.User).filter(models.User.username == "xavier").first()
    assert xavier.is_verified is False

    res = client.patch(
        f"/api/admin/users/{xavier.id}",
        headers=admin_headers,
        json={"is_verified": True},
    )
    assert res.status_code == 200, res.text
    assert res.json()["is_verified"] is True
