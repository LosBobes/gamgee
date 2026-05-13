"""Single-use URL-safe tokens for password reset and email verification.

We store only a SHA-256 hash of the token in the database, so a leaked DB
snapshot can't be used to take over accounts. The raw token is only ever
known to the recipient via email.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

# 32 random bytes → 43-char URL-safe base64, plenty of entropy.
_TOKEN_BYTES = 32

RESET_TOKEN_TTL  = timedelta(minutes=60)
VERIFY_TOKEN_TTL = timedelta(hours=48)


def new_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hex_hash). Email the raw token, store the hash."""
    raw = secrets.token_urlsafe(_TOKEN_BYTES)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
