from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..notifications import create_notification, notify_buddies, now_ms, publish_live_change

router = APIRouter(prefix="/live-sessions", tags=["live"])


def _trainer_ids_of(db: Session, user_id: int) -> set[int]:
    """Accepted trainers of this user (used for live-session visibility)."""
    return {
        r.trainer_id for r in
        db.query(models.TrainerLink.trainer_id)
        .filter(models.TrainerLink.trainee_id == user_id, models.TrainerLink.status == "accepted")
        .all()
    }


def _serialize(db: Session, ls: models.LiveSession, viewer_id: int | None = None) -> schemas.LiveSessionOut:
    owner = db.query(models.User).filter(models.User.id == ls.owner_id).first()
    parts = (
        db.query(models.LiveParticipant, models.User)
        .join(models.User, models.User.id == models.LiveParticipant.user_id)
        .filter(models.LiveParticipant.session_id == ls.id)
        .all()
    )
    # Set-by-set timeline is visible to the owner and to any trainer of the owner.
    can_timeline = False
    if viewer_id is not None:
        if viewer_id == ls.owner_id:
            can_timeline = True
        else:
            can_timeline = viewer_id in _trainer_ids_of(db, ls.owner_id)
    return schemas.LiveSessionOut(
        id=ls.id, owner_id=ls.owner_id,
        owner_username=owner.username if owner else "",
        owner_name=owner.name if owner else None,
        owner_primary_color=owner.primary_color if owner else None,
        focus=ls.focus, note=ls.note, status=ls.status,
        started_at=ls.started_at, ended_at=ls.ended_at,
        owner_sets_done=ls.owner_sets_done,
        current_exercise_id=ls.current_exercise_id,
        current_exercise_name=ls.current_exercise_name,
        current_set_index=ls.current_set_index,
        last_weight=ls.last_weight,
        last_reps=ls.last_reps,
        total_sets_planned=ls.total_sets_planned,
        total_exercises_planned=ls.total_exercises_planned,
        can_see_set_timeline=can_timeline,
        participants=[
            schemas.LiveParticipantOut(
                user_id=u.id, username=u.username, name=u.name,
                primary_color=u.primary_color,
                sets_done=p.sets_done, joined_at=p.joined_at, last_seen=p.last_seen,
            )
            for p, u in parts
        ],
    )


def _session_audience(db: Session, ls: models.LiveSession) -> set[int]:
    """User ids who should see real-time changes for this live session: the
    owner, the owner's accepted buddies, any trainer of the owner, and anyone
    who has joined."""
    buddy_ids = {
        row.user_id for row in
        db.query(models.Buddy.user_id)
        .filter(models.Buddy.buddy_user_id == ls.owner_id, models.Buddy.status == "accepted")
        .all()
    }
    participant_ids = {
        p.user_id for p in
        db.query(models.LiveParticipant.user_id)
        .filter(models.LiveParticipant.session_id == ls.id)
        .all()
    }
    trainer_ids = _trainer_ids_of(db, ls.owner_id)
    return {ls.owner_id, *buddy_ids, *participant_ids, *trainer_ids}


def _accessible_session_ids(db: Session, user_id: int) -> set[str]:
    """Sessions the user can see: owned by them, owned by an accepted buddy
    or a trainee of theirs, or joined by them."""
    buddy_ids = [
        row.buddy_user_id for row in
        db.query(models.Buddy.buddy_user_id)
        .filter(models.Buddy.user_id == user_id, models.Buddy.status == "accepted")
        .all()
    ]
    trainee_ids = [
        row.trainee_id for row in
        db.query(models.TrainerLink.trainee_id)
        .filter(models.TrainerLink.trainer_id == user_id, models.TrainerLink.status == "accepted")
        .all()
    ]
    owners = [user_id, *buddy_ids, *trainee_ids]
    owned = {s.id for s in db.query(models.LiveSession.id).filter(models.LiveSession.owner_id.in_(owners)).all()}
    joined = {p.session_id for p in db.query(models.LiveParticipant.session_id).filter(models.LiveParticipant.user_id == user_id).all()}
    return owned | joined


@router.get("", response_model=list[schemas.LiveSessionOut])
def list_active(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ids = _accessible_session_ids(db, current_user.id)
    if not ids:
        return []
    rows = (
        db.query(models.LiveSession)
        .filter(models.LiveSession.id.in_(ids), models.LiveSession.status == "active")
        .order_by(models.LiveSession.started_at.desc())
        .all()
    )
    return [_serialize(db, r, viewer_id=current_user.id) for r in rows]


@router.post("", response_model=schemas.LiveSessionOut, status_code=201)
def start_live(
    body: schemas.LiveSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = db.query(models.LiveSession).filter(models.LiveSession.id == body.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Session already exists")
    # End any other active session this user owns (only one at a time).
    (
        db.query(models.LiveSession)
        .filter(
            models.LiveSession.owner_id == current_user.id,
            models.LiveSession.status == "active",
        )
        .update({models.LiveSession.status: "ended", models.LiveSession.ended_at: now_ms()},
                synchronize_session=False)
    )

    ls = models.LiveSession(
        id=body.id, owner_id=current_user.id, focus=body.focus, note=body.note,
        status="active", started_at=now_ms(), owner_sets_done=0,
    )
    db.add(ls)
    notify_buddies(
        db, sender_user_id=current_user.id, kind="live_started",
        message=f"{current_user.name or current_user.username} just started a live workout — join in!",
        payload={"session_id": body.id, "focus": body.focus},
    )
    publish_live_change(db, _session_audience(db, ls), session_id=ls.id)
    db.commit()
    db.refresh(ls)
    return _serialize(db, ls, viewer_id=current_user.id)


@router.post("/{session_id}/join", response_model=schemas.LiveSessionOut)
def join_live(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ls = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not ls or ls.status != "active":
        raise HTTPException(status_code=404, detail="Live session not found or ended")
    if ls.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You're the owner — already in")

    # Must be a buddy of the owner
    is_buddy = (
        db.query(models.Buddy)
        .filter(
            models.Buddy.user_id == current_user.id,
            models.Buddy.buddy_user_id == ls.owner_id,
            models.Buddy.status == "accepted",
        )
        .first()
    )
    if not is_buddy:
        raise HTTPException(status_code=403, detail="Only buddies of the owner can join")

    existing = (
        db.query(models.LiveParticipant)
        .filter(
            models.LiveParticipant.session_id == session_id,
            models.LiveParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not existing:
        p = models.LiveParticipant(
            session_id=session_id, user_id=current_user.id,
            sets_done=0, joined_at=now_ms(), last_seen=now_ms(),
        )
        db.add(p)
        create_notification(
            db, user_id=ls.owner_id, kind="live_joined",
            sender_user_id=current_user.id,
            message=f"{current_user.name or current_user.username} joined your live workout",
            payload={"session_id": session_id},
        )
    else:
        existing.last_seen = now_ms()
    publish_live_change(db, _session_audience(db, ls) | {current_user.id}, session_id=ls.id)
    db.commit()
    db.refresh(ls)
    return _serialize(db, ls, viewer_id=current_user.id)


@router.post("/{session_id}/progress", response_model=schemas.LiveSessionOut)
def update_progress(
    session_id: str,
    body: schemas.LiveProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ls = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not ls or ls.status != "active":
        raise HTTPException(status_code=404, detail="Live session not found or ended")

    if ls.owner_id == current_user.id:
        ls.owner_sets_done = body.sets_done
        # Owner-only rich fields — peers don't get to overwrite the broadcast.
        data = body.model_dump(exclude_unset=True)
        for fld in ("current_exercise_id", "current_exercise_name", "current_set_index",
                    "last_weight", "last_reps", "total_sets_planned", "total_exercises_planned"):
            if fld in data:
                setattr(ls, fld, data[fld])
    else:
        part = (
            db.query(models.LiveParticipant)
            .filter(
                models.LiveParticipant.session_id == session_id,
                models.LiveParticipant.user_id == current_user.id,
            )
            .first()
        )
        if not part:
            raise HTTPException(status_code=403, detail="Join the session first")
        part.sets_done = body.sets_done
        part.last_seen = now_ms()
    publish_live_change(db, _session_audience(db, ls), session_id=ls.id)
    db.commit()
    db.refresh(ls)
    return _serialize(db, ls, viewer_id=current_user.id)


# ── Set-by-set timeline (trainer audience) ───────────────────────────────────

@router.post("/{session_id}/set", response_model=schemas.LiveSetEventOut, status_code=201)
def log_set(
    session_id: str,
    body: schemas.LiveSetEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Log one completed set. Only the session owner can post.
    Trainers see the full timeline via `GET /set-events`; peers stay on the
    summary fields (current exercise + last set) carried on the session itself."""
    ls = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not ls:
        raise HTTPException(status_code=404, detail="Live session not found")
    if ls.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the session owner can log sets")
    ev = models.LiveSetEvent(
        session_id=session_id,
        exercise_id=body.exercise_id, exercise_name=body.exercise_name,
        set_index=body.set_index, weight=body.weight, reps=body.reps,
        ts=now_ms(),
    )
    db.add(ev)
    # Keep the summary fields on the session in sync — peers use these.
    ls.current_exercise_id = body.exercise_id
    ls.current_exercise_name = body.exercise_name
    ls.current_set_index = body.set_index
    ls.last_weight = body.weight
    ls.last_reps = body.reps
    publish_live_change(db, _session_audience(db, ls), session_id=ls.id)
    db.commit()
    db.refresh(ev)
    return schemas.LiveSetEventOut(
        id=ev.id, exercise_id=ev.exercise_id, exercise_name=ev.exercise_name,
        set_index=ev.set_index, weight=ev.weight, reps=ev.reps, ts=ev.ts,
    )


@router.get("/{session_id}/set-events", response_model=list[schemas.LiveSetEventOut])
def list_set_events(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ls = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not ls:
        raise HTTPException(status_code=404, detail="Live session not found")
    is_owner = ls.owner_id == current_user.id
    is_trainer = current_user.id in _trainer_ids_of(db, ls.owner_id)
    if not (is_owner or is_trainer):
        raise HTTPException(status_code=403, detail="Only the owner or their trainer can see the set timeline")
    events = (
        db.query(models.LiveSetEvent)
        .filter(models.LiveSetEvent.session_id == session_id)
        .order_by(models.LiveSetEvent.ts.asc(), models.LiveSetEvent.id.asc())
        .all()
    )
    return [
        schemas.LiveSetEventOut(
            id=ev.id, exercise_id=ev.exercise_id, exercise_name=ev.exercise_name,
            set_index=ev.set_index, weight=ev.weight, reps=ev.reps, ts=ev.ts,
        )
        for ev in events
    ]


@router.post("/{session_id}/end", response_model=schemas.LiveSessionOut)
def end_live(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ls = db.query(models.LiveSession).filter(models.LiveSession.id == session_id).first()
    if not ls:
        raise HTTPException(status_code=404, detail="Live session not found")
    if ls.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can end the session")
    if ls.status == "ended":
        return _serialize(db, ls)
    ls.status = "ended"
    ls.ended_at = now_ms()
    # Notify joined participants
    parts = (
        db.query(models.LiveParticipant)
        .filter(models.LiveParticipant.session_id == session_id)
        .all()
    )
    for p in parts:
        create_notification(
            db, user_id=p.user_id, kind="live_ended",
            sender_user_id=current_user.id,
            message=f"{current_user.name or current_user.username} ended the live workout",
            payload={"session_id": session_id},
        )
    publish_live_change(db, _session_audience(db, ls), session_id=ls.id)
    db.commit()
    db.refresh(ls)
    return _serialize(db, ls, viewer_id=current_user.id)
