"""Admin-only audit log inspection."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_admin_user
from ..database import get_db

router = APIRouter(prefix="/admin/audit", tags=["admin"])


@router.get("", response_model=list[schemas.AuditEventOut])
def list_audit(
    actor_id: int | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_admin_user),
):
    q = db.query(models.AuditEvent)
    if actor_id is not None:
        q = q.filter(models.AuditEvent.actor_id == actor_id)
    if action:
        q = q.filter(models.AuditEvent.action == action)
    return q.order_by(models.AuditEvent.created_at.desc()).limit(limit).all()
