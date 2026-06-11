from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import fcm, models, push, schemas
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


# ── Native push (FCM) device tokens ───────────────────────────────────────────

@router.get("/devices/status", response_model=schemas.FcmStatusOut)
def native_push_status():
    """Whether the server can deliver native (FCM) pushes. The mobile app uses
    this to decide whether to bother registering its device token."""
    return schemas.FcmStatusOut(enabled=fcm.is_configured())


@router.post("/devices/register", status_code=204)
def register_device(
    payload: schemas.DeviceTokenIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Register (or refresh) the native FCM token for this user/device. Idempotent
    on ``(user_id, token)`` — the mobile app re-posts whenever the token rotates,
    so we upsert instead of duplicating. Unlike Web Push subscribe, this does not
    503 when FCM is unconfigured: the app can register optimistically and the
    token simply sits unused until the operator provisions Firebase."""
    now = int(time.time() * 1000)
    existing = (
        db.query(models.DeviceToken)
        .filter(
            models.DeviceToken.user_id == current_user.id,
            models.DeviceToken.token == payload.token,
        )
        .first()
    )
    if existing is not None:
        existing.last_seen_at = now
        if payload.platform:
            existing.platform = payload.platform
        if payload.device_info:
            existing.device_info = payload.device_info
    else:
        db.add(models.DeviceToken(
            user_id=current_user.id,
            token=payload.token,
            platform=payload.platform,
            device_info=payload.device_info,
            created_at=now,
            last_seen_at=now,
        ))
    db.commit()


@router.post("/devices/unregister", status_code=204)
def unregister_device(
    payload: schemas.DeviceTokenUnregisterIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Drop a native token (logout / disable on this device)."""
    (
        db.query(models.DeviceToken)
        .filter(
            models.DeviceToken.user_id == current_user.id,
            models.DeviceToken.token == payload.token,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
