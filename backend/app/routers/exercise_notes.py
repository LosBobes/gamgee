"""Per-exercise free-text notes attached to a user. Keyed on (user, exercise_id).

UX: surfaced on the next time the exercise is logged ("knees caved on set 3 —
film it next time"). Returned as a list of dicts so the frontend can build a
map and never has to know the row id.
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/exercise-notes", tags=["exercise-notes"])


@router.get("", response_model=list[schemas.ExerciseNoteOut])
def list_notes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.ExerciseNote)
        .filter(models.ExerciseNote.user_id == current_user.id)
        .all()
    )
    return [
        schemas.ExerciseNoteOut(exercise_id=r.exercise_id, body=r.body, updated_at=r.updated_at)
        for r in rows
    ]


@router.put("/{exercise_id}", response_model=schemas.ExerciseNoteOut)
def upsert_note(
    exercise_id: str,
    body: schemas.ExerciseNoteIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not exercise_id or len(exercise_id) > 80:
        raise HTTPException(400, "Invalid exercise id")
    row = (
        db.query(models.ExerciseNote)
        .filter(
            models.ExerciseNote.user_id == current_user.id,
            models.ExerciseNote.exercise_id == exercise_id,
        )
        .first()
    )
    now = int(time.time() * 1000)
    if row is None:
        row = models.ExerciseNote(
            user_id=current_user.id,
            exercise_id=exercise_id,
            body=body.body,
            updated_at=now,
        )
        db.add(row)
    else:
        row.body = body.body
        row.updated_at = now
    db.commit()
    db.refresh(row)
    return schemas.ExerciseNoteOut(exercise_id=row.exercise_id, body=row.body, updated_at=row.updated_at)


@router.delete("/{exercise_id}", status_code=204)
def delete_note(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.ExerciseNote)
        .filter(
            models.ExerciseNote.user_id == current_user.id,
            models.ExerciseNote.exercise_id == exercise_id,
        )
        .first()
    )
    if row is None:
        return
    db.delete(row)
    db.commit()
