"""Extended-auth router: refresh-token rotation + TOTP 2FA + logout-all.

Coexists with the existing `/api/auth` router. New endpoints live under
`/api/auth/` but with distinct paths so we don't break the OAuth2-password
login flow that the Swagger docs link to.
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..database import get_db
from ..security_ext import (
    audit,
    consume_recovery_code,
    consume_refresh_token,
    generate_recovery_codes,
    generate_totp_secret,
    issue_refresh_token,
    revoke_all_refresh_tokens,
    totp_provisioning_uri,
    verify_totp,
)

router = APIRouter(prefix="/auth", tags=["auth-ext"])


@router.post("/refresh", response_model=schemas.RefreshOut)
def refresh(body: schemas.RefreshRequest, db: Session = Depends(get_db)):
    user = consume_refresh_token(db, body.refresh_token)
    if not user:
        db.rollback()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    new_refresh = issue_refresh_token(db, user.id)
    access = create_access_token({"sub": user.username})
    return schemas.RefreshOut(access_token=access, refresh_token=new_refresh)


@router.post("/logout-all", status_code=204)
def logout_all(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    revoke_all_refresh_tokens(db, current_user.id)
    audit(db, actor=current_user, action="auth.logout_all")
    db.commit()


# ── 2FA ──────────────────────────────────────────────────────────────────────

@router.post("/2fa/enroll", response_model=schemas.TotpEnrollOut)
def enroll_2fa(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = (
        db.query(models.TotpSecret)
        .filter(models.TotpSecret.user_id == current_user.id)
        .first()
    )
    if existing and existing.enabled_at:
        raise HTTPException(409, "2FA already enabled — disable it first to rotate")

    secret = generate_totp_secret()
    plain, hashed = generate_recovery_codes()
    now = int(time.time() * 1000)
    if existing:
        existing.secret = secret
        existing.recovery_hashes = hashed
        existing.enabled_at = None
    else:
        db.add(models.TotpSecret(
            user_id=current_user.id,
            secret=secret,
            recovery_hashes=hashed,
            created_at=now,
        ))
    audit(db, actor=current_user, action="auth.2fa_enroll")
    db.commit()

    uri = totp_provisioning_uri(secret, current_user.username)
    return schemas.TotpEnrollOut(secret=secret, otpauth_url=uri, recovery_codes=plain)


@router.post("/2fa/verify", status_code=204)
def verify_2fa(
    body: schemas.TotpVerifyIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.TotpSecret)
        .filter(models.TotpSecret.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Start enrollment first")
    if not verify_totp(row.secret, body.code):
        raise HTTPException(400, "Invalid code — check the time on your phone")
    if not row.enabled_at:
        row.enabled_at = int(time.time() * 1000)
        audit(db, actor=current_user, action="auth.2fa_enabled")
    db.commit()


@router.post("/2fa/disable", status_code=204)
def disable_2fa(
    body: schemas.TotpDisableIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(403, "Password does not match")
    row = (
        db.query(models.TotpSecret)
        .filter(models.TotpSecret.user_id == current_user.id)
        .first()
    )
    if not row:
        return
    if row.enabled_at and body.code:
        if not verify_totp(row.secret, body.code):
            raise HTTPException(400, "Invalid code")
    db.delete(row)
    audit(db, actor=current_user, action="auth.2fa_disabled")
    db.commit()


@router.get("/2fa/status")
def status_2fa(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.TotpSecret)
        .filter(models.TotpSecret.user_id == current_user.id)
        .first()
    )
    if not row:
        return {"enrolled": False, "enabled": False, "recovery_codes_left": 0}
    return {
        "enrolled": True,
        "enabled": bool(row.enabled_at),
        "recovery_codes_left": len(row.recovery_hashes or []),
    }


@router.post("/2fa/login", response_model=schemas.RefreshOut)
def login_with_2fa(
    body: schemas.LoginTwoFactor,
    request: Request,
    db: Session = Depends(get_db),
    user_agent: str | None = Header(default=None, alias="User-Agent"),
):
    """Login that explicitly carries a TOTP code. Returns both an access and
    a refresh token. The base /auth/login route stays unchanged; clients with
    2FA enabled should call this one instead."""
    uname = body.username.strip().lower()
    user = (
        db.query(models.User)
        .filter((models.User.username.ilike(uname)) | (models.User.email == uname))
        .first()
    )
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    row = (
        db.query(models.TotpSecret)
        .filter(models.TotpSecret.user_id == user.id, models.TotpSecret.enabled_at.is_not(None))
        .first()
    )
    if row:
        valid = verify_totp(row.secret, body.code)
        if not valid:
            ok, remaining = consume_recovery_code(row.recovery_hashes or [], body.code)
            if not ok:
                raise HTTPException(401, "Invalid 2FA code")
            row.recovery_hashes = remaining

    refresh_tok = issue_refresh_token(db, user.id, user_agent=user_agent or request.headers.get("user-agent"))
    access = create_access_token({"sub": user.username})
    audit(db, actor=user, action="auth.login_2fa", ip=request.client.host if request.client else None)
    db.commit()
    return schemas.RefreshOut(access_token=access, refresh_token=refresh_tok)
