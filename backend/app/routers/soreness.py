"""Daily readiness / soreness check-in. Backs the auto-deload recommender."""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/soreness", tags=["soreness"])


@router.get("", response_model=list[schemas.SorenessOut])
def list_soreness(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 60,
):
    limit = max(1, min(limit, 365))
    return (
        db.query(models.SorenessLog)
        .filter(models.SorenessLog.user_id == current_user.id)
        .order_by(models.SorenessLog.date.desc())
        .limit(limit)
        .all()
    )


@router.put("", response_model=schemas.SorenessOut)
def upsert_soreness(
    body: schemas.SorenessIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not body.date or len(body.date) < 10:
        raise HTTPException(400, "Invalid date")
    row = (
        db.query(models.SorenessLog)
        .filter(
            models.SorenessLog.user_id == current_user.id,
            models.SorenessLog.date == body.date[:10],
        )
        .first()
    )
    now = int(time.time() * 1000)
    if row is None:
        row = models.SorenessLog(
            user_id=current_user.id,
            date=body.date[:10],
            sleep=body.sleep,
            stress=body.stress,
            motivation=body.motivation,
            soreness_map=body.soreness_map,
            note=body.note,
            created_at=now,
        )
        db.add(row)
    else:
        row.sleep = body.sleep
        row.stress = body.stress
        row.motivation = body.motivation
        row.soreness_map = body.soreness_map
        row.note = body.note
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{date_iso}", status_code=204)
def delete_soreness(
    date_iso: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.SorenessLog)
        .filter(
            models.SorenessLog.user_id == current_user.id,
            models.SorenessLog.date == date_iso[:10],
        )
        .first()
    )
    if row is None:
        return
    db.delete(row)
    db.commit()
