"""Tests for refresh-token rotation + TOTP enrollment."""
from app.security_ext import (
    generate_totp_secret,
    verify_totp,
    totp_provisioning_uri,
    _totp_at,
)


def test_totp_self_consistency():
    secret = generate_totp_secret()
    import time
    counter = int(time.time() // 30)
    code = _totp_at(secret, counter)
    assert verify_totp(secret, code) is True
    assert verify_totp(secret, "000000") is False


def test_otpauth_url_shape():
    uri = totp_provisioning_uri("JBSWY3DPEHPK3PXP", "alice")
    assert uri.startswith("otpauth://totp/")
    assert "secret=JBSWY3DPEHPK3PXP" in uri
    assert "issuer=Gamgee" in uri


def test_refresh_token_round_trip(client, make_user):
    # Use the 2FA-login path to get a refresh token without enrolling.
    import uuid
    uname = f"u_{uuid.uuid4().hex[:8]}"
    res = client.post(
        "/api/auth/register",
        json={
            "username": uname,
            "password": "Str0ng-Test-Pass!",
            "name": "T",
            "email": f"{uname}@example.com",
            "gender": "prefer_not_to_say",
        },
    )
    assert res.status_code in (200, 201)
    res = client.post(
        "/api/auth/2fa/login",
        json={"username": uname, "password": "Str0ng-Test-Pass!", "code": "000000"},
    )
    # No 2FA enrolled — code is ignored, login succeeds.
    assert res.status_code == 200, res.text
    body = res.json()
    refresh = body["refresh_token"]

    res = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 200
    new_refresh = res.json()["refresh_token"]
    assert new_refresh != refresh

    # Old refresh token is now revoked.
    res = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 401


def test_2fa_status_unenrolled(client, auth_headers):
    res = client.get("/api/auth/2fa/status", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == {"enrolled": False, "enabled": False, "recovery_codes_left": 0}


def test_2fa_enroll_returns_otpauth_and_recovery(client, auth_headers):
    res = client.post("/api/auth/2fa/enroll", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["secret"]
    assert body["otpauth_url"].startswith("otpauth://totp/")
    assert len(body["recovery_codes"]) == 8

    res = client.get("/api/auth/2fa/status", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["enrolled"] is True
    assert res.json()["enabled"] is False
