"""Helpers for creating in-app notifications.

Centralised here so any router that fires an event (a finished workout, a new
PR, a buddy request, etc.) can call a single function instead of repeating the
boilerplate. Buddy preference flags (notify_workout, notify_pr, ...) are
honoured inside ``notify_buddies``.

Each helper also queues a real-time event on the SSE bus; the queue is drained
in a SQLAlchemy ``after_commit`` listener so we only push events for changes
that actually persisted.
"""
from __future__ import annotations

import time
from typing import Iterable

from sqlalchemy import event as sa_event
from sqlalchemy.orm import Session

from . import models
from .events import publish_one


def now_ms() -> int:
    return int(time.time() * 1000)


def _queue_event(db: Session, user_id: int, event_type: str, data: dict | None = None) -> None:
    pending: list = db.info.setdefault("_pending_realtime_events", [])
    pending.append((user_id, event_type, data or {}))


@sa_event.listens_for(Session, "after_commit")
def _drain_after_commit(session: Session) -> None:
    pending = session.info.pop("_pending_realtime_events", None)
    if not pending:
        return
    for user_id, event_type, data in pending:
        publish_one(user_id, event_type, data)


@sa_event.listens_for(Session, "after_rollback")
def _discard_after_rollback(session: Session) -> None:
    session.info.pop("_pending_realtime_events", None)


def create_notification(
    db: Session,
    *,
    user_id: int,
    kind: str,
    message: str,
    sender_user_id: int | None = None,
    payload: dict | None = None,
) -> models.Notification:
    n = models.Notification(
        user_id=user_id,
        kind=kind,
        sender_user_id=sender_user_id,
        message=message,
        payload=payload,
        read=False,
        created_at=now_ms(),
    )
    db.add(n)
    _queue_event(db, user_id, "notification", {"kind": kind})
    return n


_PREF_FIELD = {
    "workout_done": "notify_workout",
    "pr_set":       "notify_pr",
    "motivate":     "notify_motivate",
    "live_started": "notify_live",
    "live_joined":  "notify_live",
    "live_ended":   "notify_live",
}


def notify_buddies(
    db: Session,
    *,
    sender_user_id: int,
    kind: str,
    message: str,
    payload: dict | None = None,
    only_user_ids: Iterable[int] | None = None,
) -> int:
    """Create one notification per accepted buddy whose preference for ``kind``
    is enabled. Returns the number of notifications created."""
    field = _PREF_FIELD.get(kind)
    q = (
        db.query(models.Buddy)
        .filter(models.Buddy.user_id != sender_user_id)
        .filter(models.Buddy.buddy_user_id == sender_user_id)
        .filter(models.Buddy.status == "accepted")
    )
    rows = q.all()
    if only_user_ids is not None:
        allow = set(only_user_ids)
        rows = [r for r in rows if r.user_id in allow]

    count = 0
    for row in rows:
        if field is not None and not getattr(row, field, True):
            continue
        create_notification(
            db,
            user_id=row.user_id,
            kind=kind,
            message=message,
            sender_user_id=sender_user_id,
            payload=payload,
        )
        count += 1
    return count


def publish_buddy_change(db: Session, user_ids: Iterable[int]) -> None:
    """Tell each listed user that their buddy list / scoreboard should refresh."""
    for uid in set(user_ids):
        _queue_event(db, uid, "buddy", {})


def publish_live_change(db: Session, user_ids: Iterable[int], *, session_id: str | None = None) -> None:
    """Tell each listed user that the list of accessible live sessions changed."""
    data = {"session_id": session_id} if session_id else {}
    for uid in set(user_ids):
        _queue_event(db, uid, "live", data)
