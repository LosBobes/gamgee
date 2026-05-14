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

from . import models, push
from .events import publish_one


def now_ms() -> int:
    return int(time.time() * 1000)


_PUSH_TITLE = {
    "buddy_request":  "New buddy request",
    "buddy_accepted": "Buddy accepted",
    "workout_done":   "Workout logged",
    "pr_set":         "New PR!",
    "motivate":       "Motivation",
    "live_started":   "Live workout started",
    "live_joined":    "Joined live workout",
    "live_ended":     "Live workout ended",
    "chat_message":   "New message",
    "trainer_link_request":  "Coaching request",
    "trainer_link_accepted": "Coaching accepted",
    "regime_assigned":       "New plan assigned",
}


def _queue_event(db: Session, user_id: int, event_type: str, data: dict | None = None) -> None:
    pending: list = db.info.setdefault("_pending_realtime_events", [])
    pending.append((user_id, event_type, data or {}))


def _queue_push(
    db: Session,
    *,
    user_id: int,
    kind: str,
    message: str,
    notification_id_thunk,
    url: str | None = None,
) -> None:
    """Queue a web push to fire after commit. ``notification_id_thunk`` is a
    zero-arg callable that returns the notification id once SQLAlchemy assigns
    it (after flush). ``url`` overrides the default deep-link target so kinds
    like ``chat_message`` can open the relevant conversation directly."""
    pending: list = db.info.setdefault("_pending_push", [])
    pending.append({
        "user_id": user_id,
        "kind": kind,
        "message": message,
        "id_thunk": notification_id_thunk,
        "url": url,
    })


@sa_event.listens_for(Session, "after_commit")
def _drain_after_commit(session: Session) -> None:
    realtime = session.info.pop("_pending_realtime_events", None)
    if realtime:
        for user_id, event_type, data in realtime:
            publish_one(user_id, event_type, data)

    push_items = session.info.pop("_pending_push", None)
    if push_items:
        dispatch = []
        for item in push_items:
            try:
                nid = item["id_thunk"]()
            except Exception:
                nid = None
            dispatch.append({
                "user_id":         item["user_id"],
                "title":           _PUSH_TITLE.get(item["kind"], "Gamgee"),
                "body":            item["message"],
                "kind":            item["kind"],
                "notification_id": nid,
                "url":             item.get("url"),
            })
        push.dispatch_batch_async(dispatch)


@sa_event.listens_for(Session, "after_rollback")
def _discard_after_rollback(session: Session) -> None:
    session.info.pop("_pending_realtime_events", None)
    session.info.pop("_pending_push", None)


def create_notification(
    db: Session,
    *,
    user_id: int,
    kind: str,
    message: str,
    sender_user_id: int | None = None,
    payload: dict | None = None,
    push_url: str | None = None,
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
    db.flush()  # assign n.id so the push payload can reference it
    _queue_event(db, user_id, "notification", {"kind": kind})
    _queue_push(
        db,
        user_id=user_id,
        kind=kind,
        message=message,
        notification_id_thunk=lambda: n.id,
        url=push_url,
    )
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
    is enabled. Both the recipient's global ``User.notify_*`` switch and their
    per-buddy ``Buddy.notify_*`` flag must be on. Returns the number of
    notifications created."""
    field = _PREF_FIELD.get(kind)
    rows = (
        db.query(models.Buddy, models.User)
        .join(models.User, models.User.id == models.Buddy.user_id)
        .filter(models.Buddy.user_id != sender_user_id)
        .filter(models.Buddy.buddy_user_id == sender_user_id)
        .filter(models.Buddy.status == "accepted")
        .all()
    )
    if only_user_ids is not None:
        allow = set(only_user_ids)
        rows = [(b, u) for (b, u) in rows if b.user_id in allow]

    count = 0
    for row, recipient in rows:
        if field is not None:
            if not getattr(row, field, True):
                continue
            if not getattr(recipient, field, True):
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


def publish_chat_change(db: Session, user_ids: Iterable[int], *, conversation_id: int | None = None) -> None:
    """Tell each listed user that the chat conversation list / message thread
    has new content."""
    data = {"conversation_id": conversation_id} if conversation_id else {}
    for uid in set(user_ids):
        _queue_event(db, uid, "chat", data)


def publish_notification_refresh(db: Session, user_id: int, *, kind: str | None = None) -> None:
    """Tell ``user_id`` that their notification list has changed (a new item
    arrived, or one was marked read / deleted on the server). The frontend
    refetches /api/notifications when this fires."""
    data = {"kind": kind} if kind else {}
    _queue_event(db, user_id, "notification", data)


def publish_trainer_change(db: Session, user_ids: Iterable[int]) -> None:
    """Tell each listed user that trainer/trainee links or assignments changed."""
    for uid in set(user_ids):
        _queue_event(db, uid, "trainer", {})
