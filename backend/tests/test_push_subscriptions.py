"""Tests for the Web Push subscribe/unsubscribe endpoints.

We don't actually fire real push messages here (pywebpush is HTTP-bound and the
push services need real VAPID keys); we just verify the subscription CRUD and
the public-key endpoint contract.
"""
from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient

from app import push


@pytest.fixture(autouse=True)
def _reset_vapid(monkeypatch):
    """Each test sets its own VAPID config; reset after."""
    yield
    importlib.reload(push)


def _set_vapid(monkeypatch, configured: bool):
    if configured:
        monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", "BTEST_PUBLIC_KEY_BASE64URL")
        monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", "test_private_key")
        monkeypatch.setattr(push, "VAPID_SUBJECT", "mailto:test@example.com")
    else:
        monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", "")
        monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", "")


def test_public_key_disabled_when_unconfigured(client: TestClient, auth_headers, monkeypatch):
    _set_vapid(monkeypatch, configured=False)
    r = client.get("/api/notifications/push/public-key", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["enabled"] is False
    assert body["public_key"] is None


def test_public_key_enabled_when_configured(client: TestClient, auth_headers, monkeypatch):
    _set_vapid(monkeypatch, configured=True)
    r = client.get("/api/notifications/push/public-key", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["enabled"] is True
    assert body["public_key"] == "BTEST_PUBLIC_KEY_BASE64URL"


def test_subscribe_requires_vapid_configured(client: TestClient, auth_headers, monkeypatch):
    _set_vapid(monkeypatch, configured=False)
    r = client.post(
        "/api/notifications/push/subscribe",
        headers=auth_headers,
        json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/abc123",
            "keys": {"p256dh": "AAAA", "auth": "BBBB"},
        },
    )
    assert r.status_code == 503


def test_subscribe_creates_and_updates_subscription(client: TestClient, auth_headers, monkeypatch):
    _set_vapid(monkeypatch, configured=True)
    endpoint = "https://fcm.googleapis.com/fcm/send/abc123"
    body = {
        "endpoint": endpoint,
        "keys": {"p256dh": "PUB1", "auth": "AUTH1"},
        "user_agent": "TestBrowser/1.0",
    }
    r = client.post("/api/notifications/push/subscribe", headers=auth_headers, json=body)
    assert r.status_code == 204

    # Repeating the same endpoint with new keys should upsert, not 409.
    body["keys"] = {"p256dh": "PUB2", "auth": "AUTH2"}
    r = client.post("/api/notifications/push/subscribe", headers=auth_headers, json=body)
    assert r.status_code == 204


def test_unsubscribe_removes_subscription(client: TestClient, auth_headers, monkeypatch):
    _set_vapid(monkeypatch, configured=True)
    endpoint = "https://fcm.googleapis.com/fcm/send/xyz789"
    client.post(
        "/api/notifications/push/subscribe",
        headers=auth_headers,
        json={"endpoint": endpoint, "keys": {"p256dh": "P", "auth": "A"}},
    )

    r = client.post(
        "/api/notifications/push/unsubscribe",
        headers=auth_headers,
        json={"endpoint": endpoint},
    )
    assert r.status_code == 204

    # Idempotent — unsubscribing again still returns 204.
    r = client.post(
        "/api/notifications/push/unsubscribe",
        headers=auth_headers,
        json={"endpoint": endpoint},
    )
    assert r.status_code == 204


def test_subscribe_requires_auth(client: TestClient, monkeypatch):
    _set_vapid(monkeypatch, configured=True)
    r = client.post(
        "/api/notifications/push/subscribe",
        json={"endpoint": "https://example.com/x", "keys": {"p256dh": "P", "auth": "A"}},
    )
    assert r.status_code == 401


def test_send_to_user_returns_zero_when_unconfigured(db_session, monkeypatch):
    _set_vapid(monkeypatch, configured=False)
    sent = push.send_to_user(
        db_session, user_id=1, title="hi", body="b", kind="motivate",
    )
    assert sent == 0
