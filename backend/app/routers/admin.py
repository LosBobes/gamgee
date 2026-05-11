from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..auth import get_admin_user
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[schemas.UserAdminOut])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    return db.query(models.User).order_by(models.User.id).all()


@router.patch("/users/{user_id}", response_model=schemas.UserAdminOut)
def update_user(
    user_id: int,
    update: schemas.UserAdminUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if update.name is not None:
        user.name = update.name or None
    if update.email is not None:
        user.email = update.email or None
    if update.gender is not None:
        user.gender = update.gender or None
    if update.is_admin is not None:
        if user.id == current.id and not update.is_admin:
            raise HTTPException(status_code=400, detail="Cannot remove your own admin rights")
        user.is_admin = update.is_admin
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_admin_user),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Cascade-delete related data
    db.query(models.WorkoutSession).filter(models.WorkoutSession.user_id == user_id).delete()
    db.query(models.PersonalRecord).filter(models.PersonalRecord.user_id == user_id).delete()
    db.query(models.BodyMetric).filter(models.BodyMetric.user_id == user_id).delete()
    db.delete(user)
    db.commit()


# ── Workout Sessions ───────────────────────────────────────────────────────────

@router.get("/workouts", response_model=List[schemas.WorkoutAdminOut])
def list_all_workouts(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    rows = (
        db.query(models.WorkoutSession, models.User.username)
        .outerjoin(models.User, models.WorkoutSession.user_id == models.User.id)
        .order_by(models.WorkoutSession.date.desc())
        .all()
    )
    return [
        schemas.WorkoutAdminOut(
            id=s.id, user_id=s.user_id, username=username,
            date=s.date, duration=s.duration, focus=s.focus,
            exercise_count=len(s.exercises) if s.exercises else 0,
        )
        for s, username in rows
    ]


@router.delete("/workouts/{session_id}", status_code=204)
def delete_workout(
    session_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    session = db.query(models.WorkoutSession).filter(models.WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(session)
    db.commit()


# ── Personal Records ───────────────────────────────────────────────────────────

@router.get("/prs", response_model=List[schemas.PRAdminOut])
def list_all_prs(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    rows = (
        db.query(models.PersonalRecord, models.User.username)
        .outerjoin(models.User, models.PersonalRecord.user_id == models.User.id)
        .order_by(models.PersonalRecord.date.desc())
        .all()
    )
    return [
        schemas.PRAdminOut(
            id=pr.id, user_id=pr.user_id, username=username,
            exercise_id=pr.exercise_id, name=pr.name,
            weight=pr.weight, reps=pr.reps, date=pr.date, is_cardio=pr.is_cardio,
        )
        for pr, username in rows
    ]


@router.delete("/prs/{pr_id}", status_code=204)
def delete_pr(
    pr_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    pr = db.query(models.PersonalRecord).filter(models.PersonalRecord.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    db.delete(pr)
    db.commit()


# ── Exercises ──────────────────────────────────────────────────────────────────

@router.get("/exercises", response_model=List[schemas.ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    return db.query(models.Exercise).order_by(models.Exercise.name).all()


@router.post("/exercises", response_model=schemas.ExerciseOut, status_code=201)
def create_exercise(
    ex: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    if db.query(models.Exercise).filter(models.Exercise.id == ex.id).first():
        raise HTTPException(status_code=409, detail="Exercise ID already exists")
    db_ex = models.Exercise(**ex.model_dump())
    db.add(db_ex)
    db.commit()
    db.refresh(db_ex)
    return db_ex


@router.patch("/exercises/{ex_id}", response_model=schemas.ExerciseOut)
def update_exercise(
    ex_id: str,
    update: schemas.ExerciseUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    ex = db.query(models.Exercise).filter(models.Exercise.id == ex_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    for field, val in update.model_dump(exclude_none=True).items():
        setattr(ex, field, val)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/exercises/{ex_id}", status_code=204)
def delete_exercise(
    ex_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_admin_user),
):
    ex = db.query(models.Exercise).filter(models.Exercise.id == ex_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete(ex)
    db.commit()
