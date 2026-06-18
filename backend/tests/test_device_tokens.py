"""Tests for the native (FCM) device-token register/unregister endpoints.

We don't talk to real Firebase here — ``fcm.send_to_user`` is a no-op unless a
service-account credential is configured. These tests cover the token CRUD
contract and the graceful-degradation behaviour.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app import fcm, models


def test_status_disabled_without_credentials(client: TestClient, auth_headers):
    # No FCM_CREDENTIALS_* in the test env, so native push reports disabled.
    r = client.get("/api/notifications/devices/status", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == {"enabled": False}


def test_register_creates_and_upserts(client: TestClient, auth_headers, db_session):
    token = "fcm-token-" + "a" * 40
    body = {"token": token, "platform": "android", "device_info": "Pixel 8 / Android 15"}

    r = client.post("/api/notifications/devices/register", headers=auth_headers, json=body)
    assert r.status_code == 204
    assert db_session.query(models.DeviceToken).filter_by(token=token).count() == 1

    # Re-registering the same (user, token) upserts — no duplicate row, no 409.
    body["device_info"] = "Pixel 8 / Android 16"
    r = client.post("/api/notifications/devices/register", headers=auth_headers, json=body)
    assert r.status_code == 204
    rows = db_session.query(models.DeviceToken).filter_by(token=token).all()
    assert len(rows) == 1
    assert rows[0].device_info == "Pixel 8 / Android 16"


def test_register_does_not_require_fcm_configured(client: TestClient, auth_headers):
    # Unlike Web Push subscribe (which 503s), the app can register optimistically.
    assert fcm.is_configured() is False
    r = client.post(
        "/api/notifications/devices/register",
        headers=auth_headers,
        json={"token": "x" * 50, "platform": "ios"},
    )
    assert r.status_code == 204


def test_unregister_is_idempotent(client: TestClient, auth_headers):
    token = "fcm-token-" + "b" * 40
    client.post("/api/notifications/devices/register", headers=auth_headers,
                json={"token": token, "platform": "android"})

    r = client.post("/api/notifications/devices/unregister", headers=auth_headers,
                    json={"token": token})
    assert r.status_code == 204
    # Unregistering again still 204s.
    r = client.post("/api/notifications/devices/unregister", headers=auth_headers,
                    json={"token": token})
    assert r.status_code == 204


def test_register_requires_auth(client: TestClient):
    r = client.post("/api/notifications/devices/register",
                    json={"token": "x" * 50, "platform": "android"})
    assert r.status_code == 401


def test_tokens_are_scoped_per_user(client: TestClient, make_user, db_session):
    alice = make_user("alice_dev")
    bob = make_user("bob_dev")
    shared = "same-token-" + "c" * 40

    # Same physical token string registered under two users → two distinct rows.
    client.post("/api/notifications/devices/register", headers=alice,
                json={"token": shared, "platform": "android"})
    client.post("/api/notifications/devices/register", headers=bob,
                json={"token": shared, "platform": "android"})
    assert db_session.query(models.DeviceToken).filter_by(token=shared).count() == 2

    # Alice unregistering doesn't touch Bob's row.
    client.post("/api/notifications/devices/unregister", headers=alice,
                json={"token": shared})
    assert db_session.query(models.DeviceToken).filter_by(token=shared).count() == 1


def test_send_to_user_returns_zero_when_unconfigured(db_session):
    sent = fcm.send_to_user(db_session, user_id=1, title="hi", body="b", kind="motivate")
    assert sent == 0
