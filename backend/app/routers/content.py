"""Editable content endpoints.

Public GETs serve every client. All writes require an admin user (re-uses
`get_admin_user` from `..auth`). Mirrors the data files under
`frontend/src/data/*.ts` so the frontend can read everything live.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_admin_user
from ..database import get_db

router = APIRouter(prefix="/content", tags=["content"])


# ── Quotes ───────────────────────────────────────────────────────────────────

@router.get("/quotes", response_model=List[schemas.QuoteOut])
def list_quotes(bucket: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Quote)
    if bucket:
        q = q.filter(models.Quote.bucket == bucket)
    return q.order_by(models.Quote.bucket, models.Quote.sort, models.Quote.id).all()


@router.post("/quotes", response_model=schemas.QuoteOut, status_code=201)
def create_quote(body: schemas.QuoteIn, db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    row = models.Quote(**body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.put("/quotes/{quote_id}", response_model=schemas.QuoteOut)
def update_quote(quote_id: int, body: schemas.QuoteIn, db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    row = db.get(models.Quote, quote_id)
    if not row: raise HTTPException(404, "Quote not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/quotes/{quote_id}", status_code=204)
def delete_quote(quote_id: int, db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    row = db.get(models.Quote, quote_id)
    if not row: raise HTTPException(404, "Quote not found")
    db.delete(row); db.commit()


# ── Tips ─────────────────────────────────────────────────────────────────────

@router.get("/tips", response_model=List[schemas.TipOut])
def list_tips(db: Session = Depends(get_db)):
    return db.query(models.Tip).order_by(models.Tip.sort, models.Tip.id).all()


@router.post("/tips", response_model=schemas.TipOut, status_code=201)
def create_tip(body: schemas.TipIn, db: Session = Depends(get_db),
               _: models.User = Depends(get_admin_user)):
    if db.get(models.Tip, body.id):
        raise HTTPException(409, "Tip id already exists")
    row = models.Tip(**body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.patch("/tips/{tip_id}", response_model=schemas.TipOut)
def update_tip(tip_id: str, body: schemas.TipUpdate, db: Session = Depends(get_db),
               _: models.User = Depends(get_admin_user)):
    row = db.get(models.Tip, tip_id)
    if not row: raise HTTPException(404, "Tip not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/tips/{tip_id}", status_code=204)
def delete_tip(tip_id: str, db: Session = Depends(get_db),
               _: models.User = Depends(get_admin_user)):
    row = db.get(models.Tip, tip_id)
    if not row: raise HTTPException(404, "Tip not found")
    db.delete(row); db.commit()


# ── Focuses ──────────────────────────────────────────────────────────────────

@router.get("/focuses", response_model=List[schemas.FocusOut])
def list_focuses(db: Session = Depends(get_db)):
    return db.query(models.Focus).order_by(models.Focus.sort, models.Focus.id).all()


@router.post("/focuses", response_model=schemas.FocusOut, status_code=201)
def create_focus(body: schemas.FocusIn, db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    if db.get(models.Focus, body.id):
        raise HTTPException(409, "Focus id already exists")
    row = models.Focus(**body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.patch("/focuses/{focus_id}", response_model=schemas.FocusOut)
def update_focus(focus_id: str, body: schemas.FocusUpdate, db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    row = db.get(models.Focus, focus_id)
    if not row: raise HTTPException(404, "Focus not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/focuses/{focus_id}", status_code=204)
def delete_focus(focus_id: str, db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    row = db.get(models.Focus, focus_id)
    if not row: raise HTTPException(404, "Focus not found")
    db.delete(row); db.commit()


# ── Muscles ──────────────────────────────────────────────────────────────────

@router.get("/muscles", response_model=List[schemas.MuscleOut])
def list_muscles(db: Session = Depends(get_db)):
    return db.query(models.Muscle).order_by(models.Muscle.sort, models.Muscle.id).all()


@router.post("/muscles", response_model=schemas.MuscleOut, status_code=201)
def create_muscle(body: schemas.MuscleIn, db: Session = Depends(get_db),
                  _: models.User = Depends(get_admin_user)):
    if db.get(models.Muscle, body.id):
        raise HTTPException(409, "Muscle id already exists")
    row = models.Muscle(**body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.patch("/muscles/{muscle_id}", response_model=schemas.MuscleOut)
def update_muscle(muscle_id: str, body: schemas.MuscleUpdate, db: Session = Depends(get_db),
                  _: models.User = Depends(get_admin_user)):
    row = db.get(models.Muscle, muscle_id)
    if not row: raise HTTPException(404, "Muscle not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/muscles/{muscle_id}", status_code=204)
def delete_muscle(muscle_id: str, db: Session = Depends(get_db),
                  _: models.User = Depends(get_admin_user)):
    row = db.get(models.Muscle, muscle_id)
    if not row: raise HTTPException(404, "Muscle not found")
    db.delete(row); db.commit()


# ── Stretches ────────────────────────────────────────────────────────────────

@router.get("/stretches", response_model=List[schemas.StretchOut])
def list_stretches(db: Session = Depends(get_db)):
    return (
        db.query(models.Stretch)
        .order_by(models.Stretch.muscle_group, models.Stretch.sort, models.Stretch.id)
        .all()
    )


@router.post("/stretches", response_model=schemas.StretchOut, status_code=201)
def create_stretch(body: schemas.StretchIn, db: Session = Depends(get_db),
                   _: models.User = Depends(get_admin_user)):
    row = models.Stretch(**body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.put("/stretches/{stretch_id}", response_model=schemas.StretchOut)
def update_stretch(stretch_id: int, body: schemas.StretchIn, db: Session = Depends(get_db),
                   _: models.User = Depends(get_admin_user)):
    row = db.get(models.Stretch, stretch_id)
    if not row: raise HTTPException(404, "Stretch not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/stretches/{stretch_id}", status_code=204)
def delete_stretch(stretch_id: int, db: Session = Depends(get_db),
                   _: models.User = Depends(get_admin_user)):
    row = db.get(models.Stretch, stretch_id)
    if not row: raise HTTPException(404, "Stretch not found")
    db.delete(row); db.commit()


# ── Exercise info ────────────────────────────────────────────────────────────

@router.get("/exercise-info", response_model=List[schemas.ExerciseInfoOut])
def list_exercise_info(db: Session = Depends(get_db)):
    return db.query(models.ExerciseInfo).order_by(models.ExerciseInfo.exercise_id).all()


@router.put("/exercise-info/{exercise_id}", response_model=schemas.ExerciseInfoOut)
def upsert_exercise_info(exercise_id: str, body: schemas.ExerciseInfoIn,
                         db: Session = Depends(get_db),
                         _: models.User = Depends(get_admin_user)):
    if body.exercise_id != exercise_id:
        raise HTTPException(400, "exercise_id mismatch")
    row = db.get(models.ExerciseInfo, exercise_id)
    if row is None:
        row = models.ExerciseInfo(**body.model_dump())
        db.add(row)
    else:
        for k, v in body.model_dump().items():
            setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/exercise-info/{exercise_id}", status_code=204)
def delete_exercise_info(exercise_id: str, db: Session = Depends(get_db),
                         _: models.User = Depends(get_admin_user)):
    row = db.get(models.ExerciseInfo, exercise_id)
    if not row: raise HTTPException(404, "Info not found")
    db.delete(row); db.commit()


# ── Metric defs ──────────────────────────────────────────────────────────────

@router.get("/metrics", response_model=List[schemas.MetricDefOut])
def list_metric_defs(db: Session = Depends(get_db)):
    return db.query(models.MetricDef).order_by(models.MetricDef.sort, models.MetricDef.id).all()


@router.post("/metrics", response_model=schemas.MetricDefOut, status_code=201)
def create_metric_def(body: schemas.MetricDefIn, db: Session = Depends(get_db),
                      _: models.User = Depends(get_admin_user)):
    if db.get(models.MetricDef, body.id):
        raise HTTPException(409, "Metric id already exists")
    row = models.MetricDef(**body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.patch("/metrics/{metric_id}", response_model=schemas.MetricDefOut)
def update_metric_def(metric_id: str, body: schemas.MetricDefUpdate,
                      db: Session = Depends(get_db),
                      _: models.User = Depends(get_admin_user)):
    row = db.get(models.MetricDef, metric_id)
    if not row: raise HTTPException(404, "Metric not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/metrics/{metric_id}", status_code=204)
def delete_metric_def(metric_id: str, db: Session = Depends(get_db),
                      _: models.User = Depends(get_admin_user)):
    row = db.get(models.MetricDef, metric_id)
    if not row: raise HTTPException(404, "Metric not found")
    db.delete(row); db.commit()


# ── Body-map shapes ──────────────────────────────────────────────────────────

@router.get("/bodymap", response_model=List[schemas.BodyMapShapeOut])
def list_bodymap_shapes(db: Session = Depends(get_db)):
    return db.query(models.BodyMapShape).order_by(models.BodyMapShape.id).all()


@router.put("/bodymap/{shape_id}", response_model=schemas.BodyMapShapeOut)
def upsert_bodymap_shape(shape_id: str, body: schemas.BodyMapShapeIn,
                         db: Session = Depends(get_db),
                         _: models.User = Depends(get_admin_user)):
    if body.id != shape_id:
        raise HTTPException(400, "shape id mismatch")
    row = db.get(models.BodyMapShape, shape_id)
    if row is None:
        row = models.BodyMapShape(**body.model_dump())
        db.add(row)
    else:
        row.data = body.data
    db.commit(); db.refresh(row)
    return row


@router.delete("/bodymap/{shape_id}", status_code=204)
def delete_bodymap_shape(shape_id: str, db: Session = Depends(get_db),
                         _: models.User = Depends(get_admin_user)):
    row = db.get(models.BodyMapShape, shape_id)
    if not row: raise HTTPException(404, "Shape not found")
    db.delete(row); db.commit()


# ── Week days ────────────────────────────────────────────────────────────────

@router.get("/week-days", response_model=List[schemas.WeekDayOut])
def list_week_days(db: Session = Depends(get_db)):
    return db.query(models.WeekDay).order_by(models.WeekDay.sort).all()


@router.put("/week-days/{key}", response_model=schemas.WeekDayOut)
def upsert_week_day(key: str, body: schemas.WeekDayIn, db: Session = Depends(get_db),
                    _: models.User = Depends(get_admin_user)):
    if body.key != key:
        raise HTTPException(400, "key mismatch")
    row = db.get(models.WeekDay, key)
    if row is None:
        row = models.WeekDay(**body.model_dump())
        db.add(row)
    else:
        for k, v in body.model_dump().items():
            setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


# ── Exercise motions (stick-figure animations) ───────────────────────────────

@router.get("/motions", response_model=List[schemas.ExerciseMotionOut])
def list_motions(db: Session = Depends(get_db)):
    return db.query(models.ExerciseMotion).order_by(models.ExerciseMotion.exercise_id).all()


@router.get("/motions/{exercise_id}", response_model=schemas.ExerciseMotionOut)
def get_motion(exercise_id: str, db: Session = Depends(get_db)):
    row = db.get(models.ExerciseMotion, exercise_id)
    if not row: raise HTTPException(404, "Motion not found")
    return row


@router.put("/motions/{exercise_id}", response_model=schemas.ExerciseMotionOut)
def upsert_motion(exercise_id: str, body: schemas.ExerciseMotionIn,
                  db: Session = Depends(get_db),
                  _: models.User = Depends(get_admin_user)):
    if body.exercise_id != exercise_id:
        raise HTTPException(400, "exercise_id mismatch")
    row = db.get(models.ExerciseMotion, exercise_id)
    if row is None:
        row = models.ExerciseMotion(**body.model_dump())
        db.add(row)
    else:
        for k, v in body.model_dump().items():
            setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.patch("/motions/{exercise_id}", response_model=schemas.ExerciseMotionOut)
def patch_motion(exercise_id: str, body: schemas.ExerciseMotionUpdate,
                 db: Session = Depends(get_db),
                 _: models.User = Depends(get_admin_user)):
    row = db.get(models.ExerciseMotion, exercise_id)
    if not row: raise HTTPException(404, "Motion not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@router.delete("/motions/{exercise_id}", status_code=204)
def delete_motion(exercise_id: str, db: Session = Depends(get_db),
                  _: models.User = Depends(get_admin_user)):
    row = db.get(models.ExerciseMotion, exercise_id)
    if not row: raise HTTPException(404, "Motion not found")
    db.delete(row); db.commit()
