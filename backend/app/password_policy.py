"""Password strength validation aligned with OWASP / NIST 800-63B guidance.

Rules:
- Length: 12-128 chars (bcrypt truncates beyond 72 bytes; cap protects against DoS).
- Must contain lowercase, uppercase, digit, and a symbol.
- Must not contain whitespace at the start/end.
- Must not be a well-known weak password.
- Must not equal (case-insensitively) the username or email local-part.
"""

from __future__ import annotations

import re

MIN_LENGTH = 12
MAX_LENGTH = 128

# Small curated blocklist — the most-leaked credentials. A production deployment
# would back this with a HIBP-style list, but this covers the long tail of
# obvious weak choices without shipping a multi-MB file.
COMMON_PASSWORDS: frozenset[str] = frozenset(
    {
        "password", "password1", "password123", "passw0rd", "p@ssw0rd",
        "qwerty", "qwerty123", "qwertyuiop", "asdfghjkl", "zxcvbnm",
        "123456", "1234567", "12345678", "123456789", "1234567890",
        "111111", "000000", "abc123", "iloveyou", "admin", "administrator",
        "welcome", "welcome1", "letmein", "monkey", "dragon", "master",
        "sunshine", "princess", "football", "baseball", "shadow",
        "gamgee", "gamgee123", "fitness", "workout", "trustno1",
    }
)

_LOWER = re.compile(r"[a-z]")
_UPPER = re.compile(r"[A-Z]")
_DIGIT = re.compile(r"\d")
_SYMBOL = re.compile(r"[^A-Za-z0-9]")


def validate_password(
    password: str,
    *,
    username: str | None = None,
    email: str | None = None,
) -> str:
    """Return the password unchanged or raise ValueError listing every failure."""
    errors: list[str] = []

    if not isinstance(password, str):
        raise ValueError("Password must be a string")

    if password != password.strip():
        errors.append("Password must not start or end with whitespace")

    if len(password) < MIN_LENGTH:
        errors.append(f"Password must be at least {MIN_LENGTH} characters")
    if len(password) > MAX_LENGTH:
        errors.append(f"Password must be at most {MAX_LENGTH} characters")
    if not _LOWER.search(password):
        errors.append("Password must contain a lowercase letter")
    if not _UPPER.search(password):
        errors.append("Password must contain an uppercase letter")
    if not _DIGIT.search(password):
        errors.append("Password must contain a digit")
    if not _SYMBOL.search(password):
        errors.append("Password must contain a symbol")

    lowered = password.lower()
    if lowered in COMMON_PASSWORDS:
        errors.append("Password is too common — pick something less guessable")

    if username and username.lower() in lowered and len(username) >= 3:
        errors.append("Password must not contain your username")

    if email:
        local = email.split("@", 1)[0].lower()
        if local and len(local) >= 3 and local in lowered:
            errors.append("Password must not contain your email address")

    if errors:
        raise ValueError("; ".join(errors))

    return password
