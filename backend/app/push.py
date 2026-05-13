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

Generate a fresh keypair with::

    python -m app.gen_vapid
"""
from __future__ import annotations

import json
import logging
import os
import threading
from typing import Iterable

from sqlalchemy.orm import Session

from . import models

log = logging.getLogger(__name__)

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com").strip()


def is_configured() -> bool:
    return bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)


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
) -> int:
    """Push to every subscription for ``user_id``. Returns the number of
    successful sends. Subscriptions that come back 404/410 are deleted."""
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
        "url": "/?tab=notifications",
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
