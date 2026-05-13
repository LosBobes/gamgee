from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
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
