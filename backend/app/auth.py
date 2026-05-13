import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db

SECRET_KEY = os.environ.get("JWT_SECRET", "change-me-in-production-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Server-side secret combined with each password before bcrypt hashing.
# Stored separately from the database so a DB leak alone cannot be used to
# crack passwords. bcrypt already generates a unique per-password salt.
PEPPER = os.environ.get("PASSWORD_PEPPER", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _apply_pepper(password: str) -> str:
    # HMAC-SHA256 keeps the bcrypt input at a fixed 44-byte size, sidestepping
    # bcrypt's 72-byte truncation when long passwords are combined with a pepper.
    if not PEPPER:
        return password
    digest = hmac.new(PEPPER.encode("utf-8"), password.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")


def hash_password(password: str) -> str:
    return pwd_context.hash(_apply_pepper(password))


def verify_password(plain: str, hashed: str) -> bool:
    if pwd_context.verify(_apply_pepper(plain), hashed):
        return True
    if PEPPER and pwd_context.verify(plain, hashed):
        return True
    return False


def password_needs_rehash(plain: str, hashed: str) -> bool:
    """True when verify_password succeeded only via the un-peppered fallback —
    the stored hash predates the pepper and should be upgraded on next login."""
    if not PEPPER:
        return False
    return not pwd_context.verify(_apply_pepper(plain), hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exc
    return user


def get_admin_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    user = get_current_user(token=token, db=db)
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
