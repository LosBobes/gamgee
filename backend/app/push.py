"""Web Push (VAPID) helpers.

Sends browser push notifications to subscriptions stored in
``push_subscriptions``. Configuration is via three env vars:

  VAPID_PUBLIC_KEY   url-safe base64 of the uncompressed P-256 public point
  VAPID_PRIVATE_KEY  url-safe base64 of the raw 32-byte private scalar
  VAPID_SUBJECT      mailto: or https: URI for the push service (RFC 8292)

If any of these is unset the module degrades gracefully: subscribe/unsubscribe
endpoints still work, but :func:`send_to_user` is a no-op. This lets the
existing in-app notification flow keep functioning during local dev without
forcing every contributor to generate keys.

The keys are also *validated* at every :func:`is_configured` call: malformed
values (wrong length, stray whitespace, mismatched public/private pair) cause
``is_configured`` to return ``False`` rather than letting the bad key reach the
browser, where it surfaces as the cryptic ``Invalid raw ECDSA P-256 public
key`` error from ``pushManager.subscribe``.

Generate a fresh keypair with::

    python -m app.gen_vapid
"""
from __future__ import annotations

import base64
import binascii
import json
import logging
import os
import re
import threading
from typing import Iterable

from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy.orm import Session

from . import models

log = logging.getLogger(__name__)

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com").strip()


def _b64url_decode(s: str) -> bytes:
    """Decode an unpadded URL-safe base64 string."""
    return base64.urlsafe_b64decode(s.encode("ascii") + b"=" * (-len(s) % 4))


def _validate_vapid_keys(pub: str, priv: str) -> str | None:
    """Return ``None`` if the pair is usable, else a human-readable error.

    Catches the common reasons a browser rejects ``applicationServerKey`` with
    ``Invalid raw ECDSA P-256 public key``: stray whitespace, the standard
    (non-URL-safe) base64 alphabet, wrong decoded length, missing 0x04
    uncompressed-point prefix, and a public/private pair that don't match
    (e.g. a half-applied rotation)."""
    if re.search(r"\s", pub) or re.search(r"\s", priv):
        return "VAPID key contains whitespace; check for stray newlines or spaces in .env."
    if any(c in pub for c in "+/=") or any(c in priv for c in "+/="):
        return "VAPID key uses standard base64; expected URL-safe (- and _, no = padding)."
    try:
        raw_pub = _b64url_decode(pub)
    except (ValueError, binascii.Error) as exc:
        return f"VAPID_PUBLIC_KEY is not valid base64url ({exc})."
    try:
        raw_priv = _b64url_decode(priv)
    except (ValueError, binascii.Error) as exc:
        return f"VAPID_PRIVATE_KEY is not valid base64url ({exc})."
    if len(raw_pub) != 65 or raw_pub[0] != 0x04:
        return (
            f"VAPID_PUBLIC_KEY must decode to 65 bytes starting with 0x04 "
            f"(uncompressed P-256 point); got {len(raw_pub)} bytes "
            f"prefixed with 0x{raw_pub[0]:02x} (if non-empty). Regenerate "
            f"with `python -m app.gen_vapid`."
        )
    if len(raw_priv) != 32:
        return (
            f"VAPID_PRIVATE_KEY must decode to a 32-byte raw scalar; got "
            f"{len(raw_priv)} bytes. Regenerate with `python -m app.gen_vapid`."
        )
    try:
        configured_pub = ec.EllipticCurvePublicKey.from_encoded_point(
            ec.SECP256R1(), raw_pub
        )
    except (ValueError, Exception) as exc:  # noqa: BLE001
        return f"VAPID_PUBLIC_KEY is not a valid P-256 point ({exc})."
    try:
        derived_priv = ec.derive_private_key(
            int.from_bytes(raw_priv, "big"), ec.SECP256R1()
        )
    except (ValueError, Exception) as exc:  # noqa: BLE001
        return f"VAPID_PRIVATE_KEY is not a valid P-256 scalar ({exc})."
    if derived_priv.public_key().public_numbers() != configured_pub.public_numbers():
        return (
            "VAPID_PUBLIC_KEY does not match VAPID_PRIVATE_KEY. The pair was "
            "likely rotated only partially. Regenerate both with "
            "`python -m app.gen_vapid` and replace both values in .env."
        )
    return None


def is_configured() -> bool:
    """True when the server has a valid VAPID keypair available."""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        return False
    return _validate_vapid_keys(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) is None


# Warn loudly at import time if the operator pasted in keys that won't work —
# without this, the only visible symptom is the browser-side "Invalid raw
# ECDSA P-256 public key" with no hint at the server.
if VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY:
    _vapid_err = _validate_vapid_keys(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    if _vapid_err:
        log.warning("Web Push disabled: %s", _vapid_err)
    del _vapid_err


def _send_one(sub: models.PushSubscription, payload: dict) -> tuple[bool, int | None]:
    """Send one push. Returns (ok, http_status). Status 404/410 means the
    subscription is dead and should be removed from the DB."""
    try:
        from pywebpush import webpush, WebPushException  # local import — optional dep
    except ImportError:
        log.warning("pywebpush is not installed; skipping push send")
        return (False, None)

    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            timeout=8,
        )
        return (True, 201)
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None) if exc.response is not None else None
        if status not in (404, 410):
            log.warning("Web push failed (status=%s): %s", status, exc)
        return (False, status)
    except Exception:  # noqa: BLE001 — log and swallow so a flaky push doesn't crash dispatch
        log.exception("Unexpected error sending web push")
        return (False, None)


def send_to_user(
    db: Session,
    *,
    user_id: int,
    title: str,
    body: str,
    kind: str,
    notification_id: int | None = None,
    url: str | None = None,
) -> int:
    """Push to every subscription for ``user_id``. Returns the number of
    successful sends. Subscriptions that come back 404/410 are deleted.

    ``url`` is the click-through target; defaults to the in-app
    notifications tab when not supplied."""
    if not is_configured():
        return 0

    subs = (
        db.query(models.PushSubscription)
        .filter(models.PushSubscription.user_id == user_id)
        .all()
    )
    if not subs:
        return 0

    payload = {
        "title": title,
        "body": body,
        "kind": kind,
        "notification_id": notification_id,
        "url": url or "/?tab=notifications",
    }

    ok = 0
    dead_ids: list[int] = []
    for sub in subs:
        success, status = _send_one(sub, payload)
        if success:
            ok += 1
        elif status in (404, 410):
            dead_ids.append(sub.id)

    if dead_ids:
        (
            db.query(models.PushSubscription)
            .filter(models.PushSubscription.id.in_(dead_ids))
            .delete(synchronize_session=False)
        )
        db.commit()

    return ok


def dispatch_batch_async(items: Iterable[dict]) -> None:
    """Fire-and-forget push dispatch from a daemon thread so we don't block the
    request that triggered the notification. Each item is a dict of kwargs for
    :func:`send_to_user` (without ``db``)."""
    if not is_configured():
        return
    batch = list(items)
    if not batch:
        return

    def _run() -> None:
        from .database import SessionLocal  # local import to avoid cycles
        db = SessionLocal()
        try:
            for item in batch:
                try:
                    send_to_user(db, **item)
                except Exception:  # noqa: BLE001
                    log.exception("push dispatch failed for %r", item)
        finally:
            db.close()

    threading.Thread(target=_run, daemon=True).start()
