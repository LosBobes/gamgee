"""Workout-template CRUD.

Templates are reusable named workouts. The `exercises` field uses the same
shape as `WorkoutSession.exercises` so applying a template is a 1:1 copy
into the active workout.
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/templates", tags=["templates"])


def _now_ms() -> int:
    return int(time.time() * 1000)


@router.get("", response_model=list[schemas.TemplateOut])
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.user_id == current_user.id)
        .order_by(models.WorkoutTemplate.last_used_at.desc().nulls_last(), models.WorkoutTemplate.created_at.desc())
        .all()
    )
    return rows


@router.post("", response_model=schemas.TemplateOut, status_code=201)
def create_template(
    body: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = models.WorkoutTemplate(
        user_id=current_user.id,
        name=body.name,
        focus=body.focus,
        description=body.description,
        exercises=body.exercises,
        is_shared=body.is_shared,
        created_at=_now_ms(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{template_id}", response_model=schemas.TemplateOut)
def update_template(
    template_id: int,
    body: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.id == template_id, models.WorkoutTemplate.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Template not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.post("/{template_id}/use", response_model=schemas.TemplateOut)
def mark_template_used(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.id == template_id, models.WorkoutTemplate.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Template not found")
    row.last_used_at = _now_ms()
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.id == template_id, models.WorkoutTemplate.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Template not found")
    db.delete(row)
    db.commit()
