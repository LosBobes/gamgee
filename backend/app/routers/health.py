from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import BodyMetric
from ..schemas import BodyMetricCreate, BodyMetricOut
from ..auth import get_current_user

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=list[BodyMetricOut])
def list_metrics(
    metric_type: str | None = Query(None),
    from_: str | None = Query(None, alias="from"),
    to: str | None = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(BodyMetric).filter(BodyMetric.user_id == user.id)
    if metric_type:
        q = q.filter(BodyMetric.metric_type == metric_type)
    if from_:
        q = q.filter(BodyMetric.date >= from_)
    if to:
        q = q.filter(BodyMetric.date <= to)
    return q.order_by(BodyMetric.date.asc()).all()


@router.post("", response_model=BodyMetricOut, status_code=201)
def create_metric(
    body: BodyMetricCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    metric = BodyMetric(**body.model_dump(), user_id=user.id)
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.delete("/{metric_id}", status_code=204)
def delete_metric(
    metric_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    metric = (
        db.query(BodyMetric)
        .filter(BodyMetric.id == metric_id, BodyMetric.user_id == user.id)
        .first()
    )
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    db.delete(metric)
    db.commit()
