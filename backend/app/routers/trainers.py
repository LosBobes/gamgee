"""Trainer-trainee endpoints.

Covers two flows:
1.  A regular user opens a trainer's profile and asks the trainer to coach
    them (creates a ``pending_trainee`` link).
2.  A trainer invites a specific user to become their trainee (creates a
    ``pending_trainer`` link).

The same ``TrainerLink`` row covers both cases; the ``initiator_id`` and
``status`` columns capture which side is waiting on the other.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..notifications import create_notification, now_ms, publish_trainer_change

router = APIRouter(prefix="/trainers", tags=["trainers"])


def _link_to_out(link: models.TrainerLink, viewer_id: int, other: models.User) -> schemas.TrainerLinkOut:
    role = "trainer" if link.trainer_id == viewer_id else "trainee"
    return schemas.TrainerLinkOut(
        id=link.id, role=role,
        other_user_id=other.id, other_username=other.username, other_name=other.name,
        other_primary_color=other.primary_color, other_is_trainer=bool(other.is_trainer),
        status=link.status, initiator_id=link.initiator_id, note=link.note,
        created_at=link.created_at,
    )


# ── Trainer directory ────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.TrainerPublicOut])
def list_trainers(
    q: str | None = Query(default=None, max_length=80),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Public directory of trainers. Optional `q` filters by name/username/specialty."""
    query = db.query(models.User).filter(models.User.is_trainer.is_(True))
    if q:
        needle = f"%{q.strip().lower()}%"
        query = query.filter(or_(
            func.lower(models.User.username).like(needle),
            func.lower(models.User.name).like(needle),
            func.lower(models.User.trainer_bio).like(needle),
        ))
    trainers = query.order_by(models.User.username.asc()).limit(60).all()
    if not trainers:
        return []
    trainer_ids = [t.id for t in trainers]
    # Trainee counts per trainer
    counts = dict(
        db.query(models.TrainerLink.trainer_id, func.count(models.TrainerLink.id))
        .filter(
            models.TrainerLink.trainer_id.in_(trainer_ids),
            models.TrainerLink.status == "accepted",
        )
        .group_by(models.TrainerLink.trainer_id)
        .all()
    )
    # Link status from this viewer's perspective
    own_links = db.query(models.TrainerLink).filter(
        or_(
            (models.TrainerLink.trainer_id == current_user.id) & models.TrainerLink.trainee_id.in_(trainer_ids),
            (models.TrainerLink.trainee_id == current_user.id) & models.TrainerLink.trainer_id.in_(trainer_ids),
        )
    ).all()
    link_by_other: dict[int, models.TrainerLink] = {}
    for ln in own_links:
        other = ln.trainee_id if ln.trainer_id == current_user.id else ln.trainer_id
        link_by_other[other] = ln

    out: list[schemas.TrainerPublicOut] = []
    for t in trainers:
        status = "self" if t.id == current_user.id else "none"
        if t.id in link_by_other:
            status = link_by_other[t.id].status
        out.append(schemas.TrainerPublicOut(
            id=t.id, username=t.username, name=t.name, primary_color=t.primary_color,
            trainer_bio=t.trainer_bio, trainer_specialties=t.trainer_specialties or [],
            trainer_certifications=t.trainer_certifications,
            trainer_years_experience=t.trainer_years_experience,
            trainee_count=int(counts.get(t.id, 0)),
            link_status=status,
        ))
    return out


@router.get("/{username}", response_model=schemas.TrainerPublicOut)
def get_trainer(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = db.query(models.User).filter(
        func.lower(models.User.username) == username.strip().lower(),
        models.User.is_trainer.is_(True),
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trainer not found")
    trainee_count = (
        db.query(func.count(models.TrainerLink.id))
        .filter(models.TrainerLink.trainer_id == t.id, models.TrainerLink.status == "accepted")
        .scalar() or 0
    )
    status = "self" if t.id == current_user.id else "none"
    if t.id != current_user.id:
        link = (
            db.query(models.TrainerLink)
            .filter(
                or_(
                    (models.TrainerLink.trainer_id == t.id) & (models.TrainerLink.trainee_id == current_user.id),
                    (models.TrainerLink.trainee_id == t.id) & (models.TrainerLink.trainer_id == current_user.id),
                )
            )
            .first()
        )
        if link:
            status = link.status
    return schemas.TrainerPublicOut(
        id=t.id, username=t.username, name=t.name, primary_color=t.primary_color,
        trainer_bio=t.trainer_bio, trainer_specialties=t.trainer_specialties or [],
        trainer_certifications=t.trainer_certifications,
        trainer_years_experience=t.trainer_years_experience,
        trainee_count=int(trainee_count),
        link_status=status,
    )


# ── Link CRUD ────────────────────────────────────────────────────────────────

@router.get("/links/mine", response_model=List[schemas.TrainerLinkOut])
def list_my_links(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.TrainerLink)
        .filter(or_(
            models.TrainerLink.trainer_id == current_user.id,
            models.TrainerLink.trainee_id == current_user.id,
        ))
        .order_by(models.TrainerLink.created_at.desc())
        .all()
    )
    if not rows:
        return []
    other_ids = {r.trainer_id if r.trainee_id == current_user.id else r.trainee_id for r in rows}
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(other_ids)).all()}
    out: list[schemas.TrainerLinkOut] = []
    for ln in rows:
        other_id = ln.trainer_id if ln.trainee_id == current_user.id else ln.trainee_id
        other = users.get(other_id)
        if other:
            out.append(_link_to_out(ln, current_user.id, other))
    return out


@router.post("/links/request-trainer", response_model=schemas.TrainerLinkOut, status_code=201)
def request_trainer(
    body: schemas.TrainerLinkRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Trainee-initiated: a user asks a trainer to coach them."""
    trainer = (
        db.query(models.User)
        .filter(
            func.lower(models.User.username) == body.username.strip().lower(),
            models.User.is_trainer.is_(True),
        )
        .first()
    )
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    if trainer.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't coach yourself")

    existing = (
        db.query(models.TrainerLink)
        .filter(
            models.TrainerLink.trainer_id == trainer.id,
            models.TrainerLink.trainee_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Link already {existing.status}")

    link = models.TrainerLink(
        trainer_id=trainer.id, trainee_id=current_user.id,
        status="pending_trainee", initiator_id=current_user.id,
        note=body.note, created_at=now_ms(),
    )
    db.add(link)
    create_notification(
        db, user_id=trainer.id, kind="trainer_link_request",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username} wants you to be their coach",
        payload={"username": current_user.username, "role": "trainee_requesting"},
    )
    publish_trainer_change(db, [current_user.id, trainer.id])
    db.commit()
    db.refresh(link)
    return _link_to_out(link, current_user.id, trainer)


@router.post("/links/invite-trainee", response_model=schemas.TrainerLinkOut, status_code=201)
def invite_trainee(
    body: schemas.TrainerLinkRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Trainer-initiated: a trainer invites a user to become their trainee."""
    if not current_user.is_trainer:
        raise HTTPException(status_code=403, detail="Only trainers can invite trainees")
    trainee = (
        db.query(models.User)
        .filter(func.lower(models.User.username) == body.username.strip().lower())
        .first()
    )
    if not trainee:
        raise HTTPException(status_code=404, detail="User not found")
    if trainee.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't coach yourself")

    existing = (
        db.query(models.TrainerLink)
        .filter(
            models.TrainerLink.trainer_id == current_user.id,
            models.TrainerLink.trainee_id == trainee.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Link already {existing.status}")

    link = models.TrainerLink(
        trainer_id=current_user.id, trainee_id=trainee.id,
        status="pending_trainer", initiator_id=current_user.id,
        note=body.note, created_at=now_ms(),
    )
    db.add(link)
    create_notification(
        db, user_id=trainee.id, kind="trainer_link_request",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username} (trainer) invited you to be their trainee",
        payload={"username": current_user.username, "role": "trainer_inviting"},
    )
    publish_trainer_change(db, [current_user.id, trainee.id])
    db.commit()
    db.refresh(link)
    return _link_to_out(link, current_user.id, trainee)


@router.post("/links/{link_id}/accept", response_model=schemas.TrainerLinkOut)
def accept_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    link = db.query(models.TrainerLink).filter(models.TrainerLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    # The non-initiator side accepts.
    if link.initiator_id == current_user.id:
        raise HTTPException(status_code=400, detail="You initiated this — wait for the other side")
    if current_user.id not in (link.trainer_id, link.trainee_id):
        raise HTTPException(status_code=403, detail="Not your link")
    if link.status == "accepted":
        other = db.query(models.User).filter(
            models.User.id == (link.trainer_id if link.trainee_id == current_user.id else link.trainee_id)
        ).first()
        return _link_to_out(link, current_user.id, other)

    link.status = "accepted"
    other_id = link.trainer_id if link.trainee_id == current_user.id else link.trainee_id
    create_notification(
        db, user_id=other_id, kind="trainer_link_accepted",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username} accepted your coaching invitation",
    )
    publish_trainer_change(db, [current_user.id, other_id])
    db.commit()
    db.refresh(link)
    other = db.query(models.User).filter(models.User.id == other_id).first()
    return _link_to_out(link, current_user.id, other)


@router.delete("/links/{link_id}", status_code=204)
def remove_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    link = db.query(models.TrainerLink).filter(models.TrainerLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if current_user.id not in (link.trainer_id, link.trainee_id):
        raise HTTPException(status_code=403, detail="Not your link")
    affected = [link.trainer_id, link.trainee_id]
    db.delete(link)
    publish_trainer_change(db, affected)
    db.commit()


# ── Trainer profile management ───────────────────────────────────────────────

@router.patch("/profile", response_model=schemas.UserOut)
def update_trainer_profile(
    body: schemas.TrainerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.is_trainer:
        raise HTTPException(status_code=403, detail="Only trainers can update trainer profiles")
    data = body.model_dump(exclude_unset=True)
    if "bio" in data:
        current_user.trainer_bio = data["bio"]
    if "specialties" in data:
        current_user.trainer_specialties = [s.strip() for s in (data["specialties"] or []) if s and s.strip()]
    if "certifications" in data:
        current_user.trainer_certifications = data["certifications"]
    if "years_experience" in data:
        current_user.trainer_years_experience = data["years_experience"]
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Helpers exposed to other routers ─────────────────────────────────────────

def is_trainer_of(db: Session, trainer_id: int, trainee_id: int) -> bool:
    return db.query(models.TrainerLink).filter(
        models.TrainerLink.trainer_id == trainer_id,
        models.TrainerLink.trainee_id == trainee_id,
        models.TrainerLink.status == "accepted",
    ).first() is not None


def accepted_trainer_ids_for(db: Session, trainee_id: int) -> list[int]:
    return [
        r.trainer_id for r in
        db.query(models.TrainerLink.trainer_id)
        .filter(models.TrainerLink.trainee_id == trainee_id, models.TrainerLink.status == "accepted")
        .all()
    ]


def accepted_trainee_ids_for(db: Session, trainer_id: int) -> list[int]:
    return [
        r.trainee_id for r in
        db.query(models.TrainerLink.trainee_id)
        .filter(models.TrainerLink.trainer_id == trainer_id, models.TrainerLink.status == "accepted")
        .all()
    ]
