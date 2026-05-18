"""Tests for the Web Push subscribe/unsubscribe endpoints.

We don't actually fire real push messages here (pywebpush is HTTP-bound and the
push services need real VAPID keys); we just verify the subscription CRUD and
the public-key endpoint contract.
"""
from __future__ import annotations

import base64
import importlib

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import push


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _make_vapid_pair() -> tuple[str, str]:
    """Generate a real VAPID keypair so the validator in ``push.is_configured``
    accepts it. The previous fixture used the literal string
    ``BTEST_PUBLIC_KEY_BASE64URL`` which is now (correctly) rejected."""
    pk = ec.generate_private_key(ec.SECP256R1())
    nums = pk.public_key().public_numbers()
    raw_pub = b"\x04" + nums.x.to_bytes(32, "big") + nums.y.to_bytes(32, "big")
    raw_priv = pk.private_numbers().private_value.to_bytes(32, "big")
    return _b64url(raw_pub), _b64url(raw_priv)


# A single pair shared across the module — generation is cheap but doing it
# per-test would noticeably slow the suite.
_TEST_PUB, _TEST_PRIV = _make_vapid_pair()


@pytest.fixture(autouse=True)
def _reset_vapid(monkeypatch):
    """Each test sets its own VAPID config; reset after."""
    yield
    importlib.reload(push)


def _set_vapid(monkeypatch, configured: bool):
    if configured:
        monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", _TEST_PUB)
        monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", _TEST_PRIV)
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
    assert body["public_key"] == _TEST_PUB


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


# ── VAPID key validation ──────────────────────────────────────────────────────
# These guard the operator-supplied env values: a malformed VAPID_PUBLIC_KEY
# would otherwise reach the browser and surface as the cryptic "Invalid raw
# ECDSA P-256 public key" from ``pushManager.subscribe``. With validation,
# ``is_configured`` returns False and the public-key endpoint hides the key
# so the toggle never appears.

def test_validation_rejects_malformed_public_key(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", "definitely-not-base64url-of-a-p256-point")
    monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", _TEST_PRIV)
    assert push.is_configured() is False
    r = client.get("/api/notifications/push/public-key", headers=auth_headers)
    body = r.json()
    assert body["enabled"] is False
    assert body["public_key"] is None


def test_validation_rejects_wrong_length_public_key(monkeypatch):
    # 64 bytes (missing the 0x04 uncompressed-point prefix) is a common
    # operator mistake — some tools output just X||Y.
    raw_pub_64 = b"\x01" * 64
    monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", _b64url(raw_pub_64))
    monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", _TEST_PRIV)
    assert push.is_configured() is False


def test_validation_rejects_whitespace(monkeypatch):
    # Trailing newline pasted in from `python -m app.gen_vapid` output.
    monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", _TEST_PUB + "\n")
    monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", _TEST_PRIV)
    assert push.is_configured() is False


def test_validation_rejects_mismatched_pair(monkeypatch):
    # Public from one key, private from another — half-applied rotation.
    other_pub, _ = _make_vapid_pair()
    monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", other_pub)
    monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", _TEST_PRIV)
    assert push.is_configured() is False


def test_validation_accepts_matching_pair(monkeypatch):
    monkeypatch.setattr(push, "VAPID_PUBLIC_KEY", _TEST_PUB)
    monkeypatch.setattr(push, "VAPID_PRIVATE_KEY", _TEST_PRIV)
    assert push.is_configured() is True


def test_validate_vapid_keys_returns_specific_errors():
    # Pinpoint message helps the operator find the bug quickly.
    err = push._validate_vapid_keys("AAAA", _TEST_PRIV)
    assert err is not None and "65 bytes" in err

    err = push._validate_vapid_keys(_TEST_PUB, "AAAA")
    assert err is not None and "32-byte" in err

    other_pub, _ = _make_vapid_pair()
    err = push._validate_vapid_keys(other_pub, _TEST_PRIV)
    assert err is not None and "does not match" in err

    assert push._validate_vapid_keys(_TEST_PUB, _TEST_PRIV) is None
