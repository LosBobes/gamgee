from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, push, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _serialize(db: Session, n: models.Notification) -> schemas.NotificationOut:
    sender = None
    if n.sender_user_id:
        sender = db.query(models.User).filter(models.User.id == n.sender_user_id).first()
    return schemas.NotificationOut(
        id=n.id, kind=n.kind, sender_user_id=n.sender_user_id,
        sender_username=sender.username if sender else None,
        sender_name=sender.name if sender else None,
        message=n.message, payload=n.payload, read=n.read,
        created_at=n.created_at,
    )


@router.get("", response_model=list[schemas.NotificationOut])
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(models.Notification.read.is_(False))
    rows = q.order_by(models.Notification.created_at.desc()).limit(limit).all()
    return [_serialize(db, n) for n in rows]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id, models.Notification.read.is_(False))
        .count()
    )
    return {"count": n}


@router.post("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = (
        db.query(models.Notification)
        .filter(models.Notification.id == notif_id, models.Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    db.refresh(n)
    return _serialize(db, n)


@router.post("/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id, models.Notification.read.is_(False))
        .update({models.Notification.read: True}, synchronize_session=False)
    )
    db.commit()


@router.delete("/{notif_id}", status_code=204)
def delete_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = (
        db.query(models.Notification)
        .filter(models.Notification.id == notif_id, models.Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()


# ── Web Push subscriptions ────────────────────────────────────────────────────

@router.get("/push/public-key", response_model=schemas.PushPublicKeyOut)
def get_push_public_key():
    """Return the server's VAPID public key so the browser can subscribe.
    ``enabled`` is false when the server has no keys configured *or* the
    configured pair fails validation — the frontend uses this to hide the
    opt-in toggle entirely instead of feeding a bad key to ``subscribe``."""
    enabled = push.is_configured()
    return schemas.PushPublicKeyOut(
        public_key=push.VAPID_PUBLIC_KEY if enabled else None,
        enabled=enabled,
    )


@router.post("/push/subscribe", status_code=204)
def subscribe_push(
    payload: schemas.PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not push.is_configured():
        raise HTTPException(status_code=503, detail="Web push is not configured on the server")

    existing = (
        db.query(models.PushSubscription)
        .filter(
            models.PushSubscription.user_id == current_user.id,
            models.PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )
    if existing is not None:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        if payload.user_agent:
            existing.user_agent = payload.user_agent
    else:
        db.add(models.PushSubscription(
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=payload.user_agent,
            created_at=int(time.time() * 1000),
        ))
    db.commit()


@router.post("/push/unsubscribe", status_code=204)
def unsubscribe_push(
    payload: schemas.PushUnsubscribeIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    (
        db.query(models.PushSubscription)
        .filter(
            models.PushSubscription.user_id == current_user.id,
            models.PushSubscription.endpoint == payload.endpoint,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
