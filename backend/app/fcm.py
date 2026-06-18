"""Native push (Firebase Cloud Messaging) helpers.

Sends notifications to the React Native mobile app's device tokens stored in
``device_tokens``. Android receives them via FCM directly; iOS via FCM-wrapped
APNs. This is the native-app counterpart to :mod:`app.push` (browser Web Push).

Configuration is via a Firebase service-account credential. Provide *one* of:

  FCM_CREDENTIALS_JSON   the full service-account JSON as a single env string
  FCM_CREDENTIALS_FILE   path to the service-account JSON file
  GOOGLE_APPLICATION_CREDENTIALS  (standard Google var) path to the JSON file

If none is set (or ``firebase-admin`` isn't installed) the module degrades
gracefully: the register/unregister endpoints still work, but
:func:`send_to_user` is a no-op — so local dev and the existing web-push flow
keep working without anyone having to provision Firebase.

Generate the service-account JSON in the Firebase console:
  Project settings → Service accounts → Generate new private key.
See ``docs/fcm-setup.md``.
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

FCM_CREDENTIALS_JSON = os.environ.get("FCM_CREDENTIALS_JSON", "").strip()
FCM_CREDENTIALS_FILE = os.environ.get("FCM_CREDENTIALS_FILE", "").strip()

# Initialised lazily on first send so import never fails when firebase-admin is
# absent or credentials are missing. Guarded by ``_init_lock``.
_app = None
_init_lock = threading.Lock()
_init_failed = False


def _load_credentials():
    """Return a ``firebase_admin.credentials.Certificate`` or ``None``."""
    from firebase_admin import credentials  # local import — optional dep

    if FCM_CREDENTIALS_JSON:
        try:
            return credentials.Certificate(json.loads(FCM_CREDENTIALS_JSON))
        except (ValueError, json.JSONDecodeError) as exc:
            log.warning("FCM_CREDENTIALS_JSON is not valid service-account JSON: %s", exc)
            return None

    path = FCM_CREDENTIALS_FILE or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if path:
        if not os.path.exists(path):
            log.warning("FCM credentials file not found: %s", path)
            return None
        return credentials.Certificate(path)

    return None


def _get_app():
    """Initialise (once) and return the firebase_admin app, or ``None``."""
    global _app, _init_failed
    if _app is not None:
        return _app
    if _init_failed:
        return None

    with _init_lock:
        if _app is not None:
            return _app
        if _init_failed:
            return None
        try:
            import firebase_admin  # local import — optional dep
        except ImportError:
            log.info("firebase-admin not installed; native push disabled")
            _init_failed = True
            return None

        cred = _load_credentials()
        if cred is None:
            _init_failed = True
            return None
        try:
            # Use a named app so we never collide with other firebase_admin users.
            _app = firebase_admin.initialize_app(cred, name="gamgee-fcm")
        except Exception:  # noqa: BLE001
            log.exception("Failed to initialise Firebase app for FCM")
            _init_failed = True
            return None
        return _app


def is_configured() -> bool:
    """True when a Firebase credential is available and firebase-admin imports."""
    return _get_app() is not None


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
    """Push to every device token for ``user_id``. Returns successful sends.

    Tokens FCM reports as unregistered/invalid are deleted from the DB, mirroring
    the 404/410 pruning in :mod:`app.push`. ``data`` values must be strings (FCM
    requirement), so non-string fields are stringified / dropped."""
    app = _get_app()
    if app is None:
        return 0

    from firebase_admin import messaging  # local import — optional dep

    rows = (
        db.query(models.DeviceToken)
        .filter(models.DeviceToken.user_id == user_id)
        .all()
    )
    if not rows:
        return 0

    # ``url`` mirrors the web-push deep link (e.g. "/?tab=chat&peer=7"); the
    # mobile app parses the ?tab= query to route, so both channels share one
    # source of truth for click-through targets.
    data = {
        "kind": kind,
        "url": url or "/?tab=notifications",
    }
    if notification_id is not None:
        data["notification_id"] = str(notification_id)

    ok = 0
    dead_ids: list[int] = []
    for row in rows:
        msg = messaging.Message(
            token=row.token,
            notification=messaging.Notification(title=title, body=body),
            data=data,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="gamgee-default",
                    default_sound=True,
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1),
                ),
            ),
        )
        try:
            messaging.send(msg, app=app)
            ok += 1
        except (messaging.UnregisteredError, ValueError):
            # UnregisteredError → token is dead; ValueError → malformed token.
            dead_ids.append(row.id)
        except Exception:  # noqa: BLE001 — a flaky send shouldn't abort the batch
            log.exception("FCM send failed for user=%s", user_id)

    if dead_ids:
        (
            db.query(models.DeviceToken)
            .filter(models.DeviceToken.id.in_(dead_ids))
            .delete(synchronize_session=False)
        )
        db.commit()

    return ok


def dispatch_batch_async(items: Iterable[dict]) -> None:
    """Fire-and-forget FCM dispatch from a daemon thread so we never block the
    request that triggered the notification. Each item is a dict of kwargs for
    :func:`send_to_user` (without ``db``). No-op when FCM isn't configured."""
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
                    log.exception("FCM dispatch failed for %r", item)
        finally:
            db.close()

    threading.Thread(target=_run, daemon=True).start()
