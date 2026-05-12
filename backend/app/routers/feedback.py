import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..auth import get_current_user, get_admin_user
from ..database import get_db

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=schemas.FeedbackOut, status_code=201)
def submit_feedback(
    body: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    fb = models.Feedback(
        user_id=current.id,
        kind=body.kind,
        message=body.message,
        status="open",
        created_at=int(time.time() * 1000),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


admin_router = APIRouter(prefix="/admin/feedback", tags=["admin"])


@admin_router.get("", response_model=List[schemas.FeedbackAdminOut])
def list_feedback(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    q = (
        db.query(models.Feedback, models.User.username, models.User.name)
        .outerjoin(models.User, models.Feedback.user_id == models.User.id)
        .order_by(models.Feedback.created_at.desc())
    )
    if status:
        q = q.filter(models.Feedback.status == status)
    return [
        schemas.FeedbackAdminOut(
            id=fb.id, user_id=fb.user_id, username=username, name=name,
            kind=fb.kind, message=fb.message, status=fb.status,
            created_at=fb.created_at, resolved_at=fb.resolved_at,
        )
        for fb, username, name in q.all()
    ]


@admin_router.patch("/{fb_id}", response_model=schemas.FeedbackAdminOut)
def update_feedback_status(
    fb_id: int,
    body: schemas.FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    fb = db.query(models.Feedback).filter(models.Feedback.id == fb_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.status = body.status
    fb.resolved_at = int(time.time() * 1000) if body.status != "open" else None
    db.commit()
    db.refresh(fb)
    user = db.query(models.User).filter(models.User.id == fb.user_id).first() if fb.user_id else None
    return schemas.FeedbackAdminOut(
        id=fb.id, user_id=fb.user_id,
        username=user.username if user else None,
        name=user.name if user else None,
        kind=fb.kind, message=fb.message, status=fb.status,
        created_at=fb.created_at, resolved_at=fb.resolved_at,
    )


@admin_router.delete("/{fb_id}", status_code=204)
def delete_feedback(
    fb_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    fb = db.query(models.Feedback).filter(models.Feedback.id == fb_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    db.delete(fb)
    db.commit()
