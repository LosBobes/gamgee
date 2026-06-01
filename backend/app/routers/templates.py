"""Workout template CRUD.

A *template* is a saved, reusable workout blueprint — a named focus plus an
ordered exercise list with optional per-exercise targets. It's lighter than a
regime (no weeks / goal / experience): one session's worth of training the user
can load into a fresh workout or drop onto a weekday in their weekly plan.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..notifications import now_ms

router = APIRouter(prefix="/templates", tags=["templates"])


def _config_json(body: schemas.WorkoutTemplateCreate) -> dict:
    """Drop unset fields per exercise so we don't persist a wall of nulls."""
    return {k: v.model_dump(exclude_none=True) for k, v in (body.exercise_config or {}).items()}


@router.get("", response_model=List[schemas.WorkoutTemplateOut])
def list_mine(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.owner_id == current_user.id)
        .order_by(models.WorkoutTemplate.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.WorkoutTemplateOut, status_code=201)
def create_template(
    body: schemas.WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tpl = models.WorkoutTemplate(
        owner_id=current_user.id,
        name=body.name.strip(),
        focus=body.focus,
        exercise_ids=list(body.exercise_ids),
        exercise_config=_config_json(body),
        created_at=now_ms(),
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.put("/{template_id}", response_model=schemas.WorkoutTemplateOut)
def update_template(
    template_id: int,
    body: schemas.WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tpl = db.query(models.WorkoutTemplate).filter(models.WorkoutTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if tpl.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your template")
    tpl.name = body.name.strip()
    tpl.focus = body.focus
    tpl.exercise_ids = list(body.exercise_ids)
    tpl.exercise_config = _config_json(body)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tpl = db.query(models.WorkoutTemplate).filter(models.WorkoutTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if tpl.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your template")
    db.delete(tpl)
    db.commit()
