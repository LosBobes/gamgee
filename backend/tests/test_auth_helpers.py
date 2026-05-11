"""Direct unit tests for the auth helper module (no HTTP)."""

from datetime import timedelta

from jose import jwt

from app import auth as auth_mod


def test_hash_and_verify_password_roundtrip():
    h = auth_mod.hash_password("hunter22")
    assert h != "hunter22"
    assert auth_mod.verify_password("hunter22", h) is True
    assert auth_mod.verify_password("wrong", h) is False


def test_create_access_token_encodes_claims():
    token = auth_mod.create_access_token({"sub": "alice"}, expires_delta=timedelta(minutes=5))
    payload = jwt.decode(token, auth_mod.SECRET_KEY, algorithms=[auth_mod.ALGORITHM])
    assert payload["sub"] == "alice"
    assert "exp" in payload
