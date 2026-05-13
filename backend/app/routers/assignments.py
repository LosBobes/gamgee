"""Trainer → Trainee regime assignments."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..notifications import create_notification, now_ms, publish_trainer_change
from .regimes import _to_out as regime_to_out
from .trainers import is_trainer_of

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _to_out(db: Session, a: models.RegimeAssignment) -> schemas.AssignmentOut:
    trainer = db.query(models.User).filter(models.User.id == a.trainer_id).first()
    trainee = db.query(models.User).filter(models.User.id == a.trainee_id).first()
    regime = db.query(models.Regime).filter(models.Regime.id == a.regime_id).first()
    if not (trainer and trainee and regime):
        raise HTTPException(status_code=410, detail="Assignment references deleted data")
    return schemas.AssignmentOut(
        id=a.id, trainer_id=a.trainer_id, trainer_username=trainer.username, trainer_name=trainer.name,
        trainee_id=a.trainee_id, trainee_username=trainee.username, trainee_name=trainee.name,
        regime_id=a.regime_id, regime=regime_to_out(regime),
        note=a.note, status=a.status, created_at=a.created_at,
    )


@router.get("/mine", response_model=List[schemas.AssignmentOut])
def list_my_assignments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Assignments visible to the current user — both as trainer (sent) and trainee (received)."""
    rows = (
        db.query(models.RegimeAssignment)
        .filter(
            (models.RegimeAssignment.trainer_id == current_user.id) |
            (models.RegimeAssignment.trainee_id == current_user.id),
        )
        .order_by(models.RegimeAssignment.created_at.desc())
        .all()
    )
    return [_to_out(db, a) for a in rows]


@router.post("", response_model=schemas.AssignmentOut, status_code=201)
def create_assignment(
    body: schemas.AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """A trainer assigns one of their own regimes to one of their trainees."""
    if not current_user.is_trainer:
        raise HTTPException(status_code=403, detail="Only trainers can assign regimes")
    if not is_trainer_of(db, current_user.id, body.trainee_id):
        raise HTTPException(status_code=403, detail="Not your trainee")
    regime = db.query(models.Regime).filter(models.Regime.id == body.regime_id).first()
    if not regime:
        raise HTTPException(status_code=404, detail="Regime not found")
    if regime.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only assign regimes you own")

    a = models.RegimeAssignment(
        trainer_id=current_user.id, trainee_id=body.trainee_id, regime_id=body.regime_id,
        note=body.note, status="active", created_at=now_ms(),
    )
    db.add(a)
    create_notification(
        db, user_id=body.trainee_id, kind="regime_assigned",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username} assigned you a workout plan: {regime.name}",
        payload={"regime_id": regime.id, "regime_name": regime.name},
    )
    publish_trainer_change(db, [current_user.id, body.trainee_id])
    db.commit()
    db.refresh(a)
    return _to_out(db, a)


@router.delete("/{assignment_id}", status_code=204)
def revoke_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    a = db.query(models.RegimeAssignment).filter(models.RegimeAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if current_user.id not in (a.trainer_id, a.trainee_id):
        raise HTTPException(status_code=403, detail="Not your assignment")
    affected = [a.trainer_id, a.trainee_id]
    db.delete(a)
    publish_trainer_change(db, affected)
    db.commit()
