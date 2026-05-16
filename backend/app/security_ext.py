"""Refresh-token + TOTP helpers shared by the auth-extension router."""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
import struct

from sqlalchemy.orm import Session

from . import models


REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
TOTP_STEP = 30
TOTP_DIGITS = 6
TOTP_WINDOW = 1  # ±1 step (±30s) drift tolerance


# ── Refresh tokens ────────────────────────────────────────────────────────────

def issue_refresh_token(db: Session, user_id: int, user_agent: str | None = None) -> str:
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    now = int(time.time() * 1000)
    db.add(models.RefreshToken(
        user_id=user_id,
        token_hash=hashed,
        user_agent=(user_agent or "")[:500] or None,
        created_at=now,
        expires_at=now + REFRESH_TTL_SECONDS * 1000,
    ))
    db.commit()
    return raw


def consume_refresh_token(db: Session, raw_token: str) -> models.User | None:
    """Rotate-on-use: the presented token is revoked and a fresh one issued
    in the caller. Returns the owning user or None on miss/expiry."""
    hashed = hashlib.sha256(raw_token.encode()).hexdigest()
    row = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == hashed,
        models.RefreshToken.revoked_at.is_(None),
    ).first()
    if not row:
        return None
    now_ms = int(time.time() * 1000)
    if row.expires_at and row.expires_at < now_ms:
        return None
    row.revoked_at = now_ms
    db.flush()
    user = db.query(models.User).filter(models.User.id == row.user_id).first()
    return user


def revoke_all_refresh_tokens(db: Session, user_id: int) -> int:
    now_ms = int(time.time() * 1000)
    affected = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.user_id == user_id,
            models.RefreshToken.revoked_at.is_(None),
        )
        .update({models.RefreshToken.revoked_at: now_ms}, synchronize_session=False)
    )
    db.commit()
    return affected


# ── TOTP (RFC 6238) ───────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _totp_at(secret_b32: str, counter: int) -> str:
    padding = "=" * ((8 - len(secret_b32) % 8) % 8)
    key = base64.b32decode(secret_b32 + padding, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (
        ((digest[offset] & 0x7F) << 24)
        | ((digest[offset + 1] & 0xFF) << 16)
        | ((digest[offset + 2] & 0xFF) << 8)
        | (digest[offset + 3] & 0xFF)
    )
    return str(code % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS)


def verify_totp(secret_b32: str, code: str) -> bool:
    code = (code or "").strip().replace(" ", "")
    if not code.isdigit() or len(code) != TOTP_DIGITS:
        return False
    counter = int(time.time() // TOTP_STEP)
    for offset in range(-TOTP_WINDOW, TOTP_WINDOW + 1):
        if hmac.compare_digest(_totp_at(secret_b32, counter + offset), code):
            return True
    return False


def totp_provisioning_uri(secret_b32: str, username: str, issuer: str = "Gamgee") -> str:
    from urllib.parse import quote
    label = quote(f"{issuer}:{username}", safe="")
    iss = quote(issuer, safe="")
    return (
        f"otpauth://totp/{label}?secret={secret_b32}&issuer={iss}"
        f"&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_STEP}"
    )


def generate_recovery_codes(count: int = 8) -> tuple[list[str], list[str]]:
    """Return (plaintext_codes_for_display, sha256_hashes_for_storage)."""
    plain = ["-".join(secrets.token_hex(2) for _ in range(2)) for _ in range(count)]
    hashed = [hashlib.sha256(c.encode()).hexdigest() for c in plain]
    return plain, hashed


def consume_recovery_code(stored_hashes: list[str], presented: str) -> tuple[bool, list[str]]:
    h = hashlib.sha256(presented.strip().encode()).hexdigest()
    if h not in stored_hashes:
        return False, stored_hashes
    remaining = [x for x in stored_hashes if x != h]
    return True, remaining


# ── Audit helper ──────────────────────────────────────────────────────────────

def audit(
    db: Session,
    *,
    actor: models.User | None,
    action: str,
    target_type: str | None = None,
    target_id: str | int | None = None,
    before: object = None,
    after: object = None,
    note: str | None = None,
    ip: str | None = None,
) -> None:
    """Fire-and-forget audit row. Caller must commit (or rollback) afterwards."""
    db.add(models.AuditEvent(
        actor_id=actor.id if actor else None,
        actor_username=actor.username if actor else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        before=before if before is not None else None,
        after=after if after is not None else None,
        note=note,
        ip=ip,
        created_at=int(time.time() * 1000),
    ))
