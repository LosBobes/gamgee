"""Helpers for creating in-app notifications.

Centralised here so any router that fires an event (a finished workout, a new
PR, a buddy request, etc.) can call a single function instead of repeating the
boilerplate. Buddy preference flags (notify_workout, notify_pr, ...) are
honoured inside ``notify_buddies``.
"""
from __future__ import annotations

import time
from typing import Iterable

from sqlalchemy.orm import Session

from . import models


def now_ms() -> int:
    return int(time.time() * 1000)


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
