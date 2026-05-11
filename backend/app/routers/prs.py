from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/prs", tags=["prs"])


def _to_schema(db_pr: models.PersonalRecord) -> schemas.PersonalRecord:
    return schemas.PersonalRecord(
        exercise_id=db_pr.exercise_id,
        name=db_pr.name,
        weight=db_pr.weight,
        reps=db_pr.reps,
        date=db_pr.date,
        isCardio=db_pr.is_cardio,
    )


@router.get("", response_model=List[schemas.PersonalRecord])
def list_prs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.PersonalRecord)
        .filter(models.PersonalRecord.user_id == current_user.id)
        .all()
    )
    return [_to_schema(pr) for pr in rows]


@router.delete("/{exercise_id}", status_code=204)
def delete_pr(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_pr = (
        db.query(models.PersonalRecord)
        .filter(
            models.PersonalRecord.user_id == current_user.id,
            models.PersonalRecord.exercise_id == exercise_id,
        )
        .first()
    )
    if db_pr is None:
        raise HTTPException(status_code=404, detail="PR not found")
    db.delete(db_pr)
    db.commit()


@router.put("/{exercise_id}", response_model=schemas.PersonalRecord, status_code=200)
def upsert_pr(
    exercise_id: str,
    pr: schemas.PersonalRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if pr.exercise_id != exercise_id:
        raise HTTPException(status_code=422, detail="exercise_id mismatch")
    db_pr = (
        db.query(models.PersonalRecord)
        .filter(
            models.PersonalRecord.user_id == current_user.id,
            models.PersonalRecord.exercise_id == exercise_id,
        )
        .first()
    )
    if db_pr is None:
        db_pr = models.PersonalRecord(
            user_id=current_user.id,
            exercise_id=pr.exercise_id,
            name=pr.name,
            weight=pr.weight,
            reps=pr.reps,
            date=pr.date,
            is_cardio=pr.isCardio,
        )
        db.add(db_pr)
    else:
        db_pr.name = pr.name
        db_pr.weight = pr.weight
        db_pr.reps = pr.reps
        db_pr.date = pr.date
        db_pr.is_cardio = pr.isCardio
    db.commit()
    db.refresh(db_pr)
    return _to_schema(db_pr)
