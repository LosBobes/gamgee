from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from ..database import get_db
from ..email_service import send_password_reset_email, send_verification_email
from ..tokens import RESET_TOKEN_TTL, VERIFY_TOKEN_TTL, hash_token, new_token, now_utc

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_verification_email(db: Session, user: models.User) -> None:
    """Generate a fresh verification token and email it to the user.

    Existing un-used tokens for this user are invalidated so an email always
    contains the most recent link.
    """
    if not user.email:
        return
    db.query(models.EmailVerificationToken).filter(
        models.EmailVerificationToken.user_id == user.id,
        models.EmailVerificationToken.consumed_at.is_(None),
    ).delete(synchronize_session=False)
    raw, hashed = new_token()
    db.add(models.EmailVerificationToken(
        user_id=user.id,
        token_hash=hashed,
        expires_at=now_utc() + VERIFY_TOKEN_TTL,
    ))
    db.commit()
    send_verification_email(user.email, user.name, raw)


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(func.lower(models.User.username) == user_in.username.lower()).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(func.lower(models.User.email) == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        name=user_in.name,
        email=user_in.email,
        gender=user_in.gender,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _issue_verification_email(db, user)
    return user


@router.post("/register-trainer", response_model=schemas.UserOut, status_code=201)
def register_trainer(payload: schemas.TrainerCreate, db: Session = Depends(get_db)):
    """Trainer sign-up flow. Identical to /register but additionally captures
    the public coaching profile and flips ``is_trainer`` on the new account."""
    if db.query(models.User).filter(func.lower(models.User.username) == payload.username.lower()).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(func.lower(models.User.email) == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        email=payload.email,
        gender=payload.gender,
        is_verified=False,
        is_trainer=True,
        trainer_bio=payload.bio,
        trainer_specialties=payload.specialties,
        trainer_certifications=payload.certifications or None,
        trainer_years_experience=payload.years_experience,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _issue_verification_email(db, user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Accept "username or email", case-insensitive, with surrounding whitespace
    # stripped — autofill and password managers commonly add either.
    identifier = (form.username or "").strip().lower()
    if "@" in identifier:
        user = db.query(models.User).filter(func.lower(models.User.email) == identifier).first()
    else:
        user = db.query(models.User).filter(func.lower(models.User.username) == identifier).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if password_needs_rehash(form.password, user.hashed_password):
        user.hashed_password = hash_password(form.password)
        db.commit()
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    body: schemas.ChangePassword,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()


@router.patch("/preferences", response_model=schemas.UserOut)
def update_preferences(
    body: schemas.UserPreferences,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.primary_color is not None:
        current_user.primary_color = body.primary_color
    if body.progression_speed is not None:
        current_user.progression_speed = body.progression_speed
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/notification-preferences", response_model=schemas.UserOut)
def update_notification_preferences(
    body: schemas.NotificationPreferences,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    for key in ("notify_workout", "notify_pr", "notify_motivate", "notify_live"):
        if key in data and data[key] is not None:
            setattr(current_user, key, data[key])
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/profile", response_model=schemas.UserOut)
def update_profile(
    body: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.name = body.name
    if body.email is not None:
        existing = db.query(models.User).filter(
            func.lower(models.User.email) == body.email,
            models.User.id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
    email_changed = body.email != current_user.email
    current_user.email = body.email
    if email_changed:
        current_user.is_verified = False
    # gender omitted in the payload means "no change" — only update when the
    # client explicitly sends a value so name/email saves don't clobber it.
    if body.gender is not None:
        current_user.gender = body.gender
    db.commit()
    db.refresh(current_user)
    if email_changed and current_user.email:
        _issue_verification_email(db, current_user)
    return current_user


# ── Password reset ───────────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=202)
def forgot_password(body: schemas.ForgotPassword, db: Session = Depends(get_db)):
    """Email a password reset link.

    Always returns 202 — we don't reveal whether an email is registered, so
    an attacker can't probe for valid accounts.
    """
    user = db.query(models.User).filter(func.lower(models.User.email) == body.email).first()
    if user:
        # Invalidate previous unused reset tokens for this user.
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.used_at.is_(None),
        ).delete(synchronize_session=False)
        raw, hashed = new_token()
        db.add(models.PasswordResetToken(
            user_id=user.id,
            token_hash=hashed,
            expires_at=now_utc() + RESET_TOKEN_TTL,
        ))
        db.commit()
        send_password_reset_email(user.email, user.name, raw)
    return {"detail": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=204)
def reset_password(body: schemas.ResetPassword, db: Session = Depends(get_db)):
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == hash_token(body.token),
    ).first()
    if not record or record.used_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    expires = record.expires_at
    if expires.tzinfo is None:
        from datetime import timezone
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now_utc():
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    # Re-validate password against the user's identifiers (already format-validated
    # by the schema, but we want the policy's username/email similarity check).
    from ..password_policy import validate_password
    try:
        validate_password(body.new_password, username=user.username, email=user.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    user.hashed_password = hash_password(body.new_password)
    record.used_at = now_utc()
    db.commit()


# ── Email verification ───────────────────────────────────────────────────────

@router.post("/verify-email", status_code=204)
def verify_email(body: schemas.VerifyEmail, db: Session = Depends(get_db)):
    record = db.query(models.EmailVerificationToken).filter(
        models.EmailVerificationToken.token_hash == hash_token(body.token),
    ).first()
    if not record or record.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    expires = record.expires_at
    if expires.tzinfo is None:
        from datetime import timezone
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now_utc():
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user.is_verified = True
    record.consumed_at = now_utc()
    db.commit()


@router.post("/resend-verification", status_code=202)
def resend_verification(body: schemas.ResendVerification, db: Session = Depends(get_db)):
    """Unauthenticated resend — caller supplies the email.

    Always returns 202 so an attacker can't probe whether an email is
    registered or already verified.
    """
    if body.email:
        target = db.query(models.User).filter(func.lower(models.User.email) == body.email).first()
        if target and not target.is_verified:
            _issue_verification_email(db, target)
    return {"detail": "If the email needs verification, a fresh link has been sent."}


@router.post("/resend-verification-me", status_code=202)
def resend_verification_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_verified or not current_user.email:
        return {"detail": "Nothing to send"}
    _issue_verification_email(db, current_user)
    return {"detail": "Verification email sent"}
