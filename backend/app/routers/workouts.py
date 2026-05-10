from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/workouts", tags=["workouts"])



@router.get("", response_model=List[schemas.WorkoutSession])
def list_workouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == current_user.id)
        .order_by(models.WorkoutSession.date.desc())
        .all()
    )


@router.post("", response_model=schemas.WorkoutSession, status_code=201)
def create_workout(
    session: schemas.WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = db.query(models.WorkoutSession).filter(models.WorkoutSession.id == session.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Workout session already exists")
    db_session = models.WorkoutSession(**session.model_dump(), user_id=current_user.id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.put("/{session_id}", response_model=schemas.WorkoutSession)
def update_workout(
    session_id: str,
    session_update: schemas.WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.WorkoutSession).filter(
        models.WorkoutSession.id == session_id,
        models.WorkoutSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")
    session.date = session_update.date
    session.duration = session_update.duration
    session.focus = session_update.focus
    session.exercises = session_update.exercises
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_workout(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.WorkoutSession).filter(
        models.WorkoutSession.id == session_id,
        models.WorkoutSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")
    db.delete(session)
    db.commit()
