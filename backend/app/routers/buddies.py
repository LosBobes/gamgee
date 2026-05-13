from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..notifications import create_notification, notify_buddies, now_ms, publish_buddy_change

router = APIRouter(prefix="/buddies", tags=["buddies"])


# ── User search ───────────────────────────────────────────────────────────────

@router.get("/search", response_model=List[schemas.UserSearchOut])
def search_users(
    q: str = Query(min_length=1, max_length=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    needle = f"%{q.strip().lower()}%"
    matches = (
        db.query(models.User)
        .filter(
            or_(
                func.lower(models.User.username).like(needle),
                func.lower(models.User.name).like(needle),
            )
        )
        .order_by(models.User.username.asc())
        .limit(20)
        .all()
    )

    # Map of other_user_id -> relationship status from this user's perspective
    rels = {
        r.buddy_user_id: r.status
        for r in db.query(models.Buddy).filter(models.Buddy.user_id == current_user.id).all()
    }

    out: list[schemas.UserSearchOut] = []
    for u in matches:
        if u.id == current_user.id:
            rel = "self"
        else:
            rel = rels.get(u.id, "none")
        out.append(schemas.UserSearchOut(
            id=u.id, username=u.username, name=u.name,
            primary_color=u.primary_color, relationship=rel,
        ))
    return out


# ── Buddy list ────────────────────────────────────────────────────────────────

def _row_to_out(row: models.Buddy, other: models.User) -> schemas.BuddyOut:
    return schemas.BuddyOut(
        id=row.id,
        user_id=other.id,
        username=other.username,
        name=other.name,
        primary_color=other.primary_color,
        status=row.status,
        notify_workout=row.notify_workout,
        notify_pr=row.notify_pr,
        notify_motivate=row.notify_motivate,
        notify_live=row.notify_live,
    )


@router.get("", response_model=List[schemas.BuddyOut])
def list_buddies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Buddy, models.User)
        .join(models.User, models.User.id == models.Buddy.buddy_user_id)
        .filter(models.Buddy.user_id == current_user.id)
        .order_by(models.Buddy.created_at.desc())
        .all()
    )
    return [_row_to_out(b, u) for b, u in rows]


@router.post("/requests", response_model=schemas.BuddyOut, status_code=201)
def send_request(
    body: schemas.BuddyRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = (
        db.query(models.User)
        .filter(func.lower(models.User.username) == body.username.strip().lower())
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't buddy yourself")

    existing = (
        db.query(models.Buddy)
        .filter(
            models.Buddy.user_id == current_user.id,
            models.Buddy.buddy_user_id == target.id,
        )
        .first()
    )
    if existing:
        if existing.status == "pending_in":
            # The other side already invited us — accept instead of duplicating.
            return _accept(db, current_user, existing)
        raise HTTPException(status_code=409, detail=f"Already {existing.status.replace('_', ' ')}")

    ts = now_ms()
    out_row = models.Buddy(
        user_id=current_user.id, buddy_user_id=target.id,
        status="pending_out", created_at=ts,
    )
    in_row = models.Buddy(
        user_id=target.id, buddy_user_id=current_user.id,
        status="pending_in", created_at=ts,
    )
    db.add_all([out_row, in_row])

    create_notification(
        db, user_id=target.id, kind="buddy_request",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username} wants to be your buddy",
        payload={"username": current_user.username},
    )
    publish_buddy_change(db, [current_user.id, target.id])
    db.commit()
    db.refresh(out_row)
    return _row_to_out(out_row, target)


def _accept(db: Session, current_user: models.User, in_row: models.Buddy) -> schemas.BuddyOut:
    out_row = (
        db.query(models.Buddy)
        .filter(
            models.Buddy.user_id == in_row.buddy_user_id,
            models.Buddy.buddy_user_id == in_row.user_id,
        )
        .first()
    )
    in_row.status = "accepted"
    if out_row:
        out_row.status = "accepted"
    other = db.query(models.User).filter(models.User.id == in_row.buddy_user_id).first()
    create_notification(
        db, user_id=in_row.buddy_user_id, kind="buddy_accepted",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username} accepted your buddy request",
    )
    publish_buddy_change(db, [current_user.id, in_row.buddy_user_id])
    db.commit()
    db.refresh(in_row)
    return _row_to_out(in_row, other)


@router.post("/requests/{buddy_id}/accept", response_model=schemas.BuddyOut)
def accept_request(
    buddy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Buddy)
        .filter(models.Buddy.id == buddy_id, models.Buddy.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Buddy request not found")
    if row.status != "pending_in":
        raise HTTPException(status_code=400, detail="Request is not pending")
    return _accept(db, current_user, row)


@router.delete("/{buddy_id}", status_code=204)
def remove_or_decline(
    buddy_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Buddy)
        .filter(models.Buddy.id == buddy_id, models.Buddy.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Buddy not found")
    affected = [row.user_id, row.buddy_user_id]
    # Delete both sides of the pair so it's gone for the other user too.
    db.query(models.Buddy).filter(
        or_(
            (models.Buddy.user_id == row.user_id) & (models.Buddy.buddy_user_id == row.buddy_user_id),
            (models.Buddy.user_id == row.buddy_user_id) & (models.Buddy.buddy_user_id == row.user_id),
        )
    ).delete(synchronize_session=False)
    publish_buddy_change(db, affected)
    db.commit()


@router.patch("/{buddy_id}/preferences", response_model=schemas.BuddyOut)
def update_prefs(
    buddy_id: int,
    body: schemas.BuddyPrefsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Buddy)
        .filter(models.Buddy.id == buddy_id, models.Buddy.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Buddy not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    publish_buddy_change(db, [current_user.id])
    db.commit()
    db.refresh(row)
    other = db.query(models.User).filter(models.User.id == row.buddy_user_id).first()
    return _row_to_out(row, other)


# ── Motivate ──────────────────────────────────────────────────────────────────

PRESET_MESSAGES = {
    "push":    "Push through it — you've got this!",
    "crush":   "Crush that workout!",
    "proud":   "So proud of your consistency.",
    "showup":  "Showing up is half the battle. Keep going.",
    "lock_in": "Lock in. One rep at a time.",
    "beast":   "Absolute beast. Keep climbing.",
    "shine":   "Go shine — they'll remember this set forever.",
}


@router.post("/{buddy_id}/motivate", status_code=201)
def motivate(
    buddy_id: int,
    body: schemas.MotivateBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Buddy)
        .filter(models.Buddy.id == buddy_id, models.Buddy.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Buddy not found")
    if row.status != "accepted":
        raise HTTPException(status_code=400, detail="You can only motivate accepted buddies")

    # Check the recipient's preference for motivate from us specifically
    recipient_row = (
        db.query(models.Buddy)
        .filter(
            models.Buddy.user_id == row.buddy_user_id,
            models.Buddy.buddy_user_id == current_user.id,
            models.Buddy.status == "accepted",
        )
        .first()
    )
    if recipient_row and not recipient_row.notify_motivate:
        raise HTTPException(status_code=403, detail="Recipient has disabled motivate notifications")

    message = body.message
    if body.preset and body.preset in PRESET_MESSAGES and message == PRESET_MESSAGES[body.preset]:
        # OK — preset used as-is
        pass
    create_notification(
        db, user_id=row.buddy_user_id, kind="motivate",
        sender_user_id=current_user.id,
        message=message,
        payload={"preset": body.preset},
    )
    db.commit()
    return {"status": "sent"}


@router.get("/motivate/presets")
def list_presets():
    return [{"id": k, "message": v} for k, v in PRESET_MESSAGES.items()]


# ── Scoreboard ────────────────────────────────────────────────────────────────

def _streak(dates: list[str]) -> int:
    """Consecutive days ending today (or yesterday). ``dates`` are ISO strings."""
    if not dates:
        return 0
    day_set = {d[:10] for d in dates if d}
    today = datetime.now(timezone.utc).date()
    cursor = today
    if cursor.isoformat() not in day_set:
        cursor = today - timedelta(days=1)
        if cursor.isoformat() not in day_set:
            return 0
    streak = 0
    while cursor.isoformat() in day_set:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


@router.get("/scoreboard", response_model=List[schemas.ScoreboardRow])
def scoreboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    buddy_ids = [
        b.buddy_user_id for b in
        db.query(models.Buddy.buddy_user_id)
        .filter(models.Buddy.user_id == current_user.id, models.Buddy.status == "accepted")
        .all()
    ]
    user_ids = [current_user.id, *buddy_ids]
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}

    week_start = (datetime.now(timezone.utc).date() - timedelta(days=7)).isoformat()
    month_start = (datetime.now(timezone.utc).date() - timedelta(days=30)).isoformat()

    rows: list[schemas.ScoreboardRow] = []
    for uid in user_ids:
        u = users.get(uid)
        if not u:
            continue
        sessions = (
            db.query(models.WorkoutSession)
            .filter(models.WorkoutSession.user_id == uid)
            .all()
        )
        workouts_total = len(sessions)
        workouts_week = sum(1 for s in sessions if s.date and s.date[:10] >= week_start)
        workouts_month = sum(1 for s in sessions if s.date and s.date[:10] >= month_start)

        sets_week = 0
        volume_week = 0.0
        for s in sessions:
            if not s.date or s.date[:10] < week_start:
                continue
            for ex in (s.exercises or []):
                sets = ex.get("sets") or []
                sets_week += len(sets)
                if ex.get("type") == "strength":
                    for st in sets:
                        try:
                            volume_week += float(st.get("weight") or 0) * float(st.get("reps") or 0)
                        except (TypeError, ValueError):
                            pass

        pr_count = (
            db.query(models.PersonalRecord)
            .filter(models.PersonalRecord.user_id == uid)
            .count()
        )
        last = max((s.date for s in sessions if s.date), default=None)
        streak = _streak([s.date for s in sessions])

        rows.append(schemas.ScoreboardRow(
            user_id=uid, username=u.username, name=u.name,
            primary_color=u.primary_color, is_self=(uid == current_user.id),
            workouts_week=workouts_week, workouts_month=workouts_month,
            workouts_total=workouts_total, sets_week=sets_week,
            volume_week=round(volume_week, 1), pr_count=pr_count,
            last_workout=last, current_streak=streak,
        ))

    rows.sort(key=lambda r: (-r.workouts_week, -r.volume_week, -r.workouts_total))
    return rows


# ── Helper exposed for other routers ──────────────────────────────────────────

def notify_buddy_workout(db: Session, user: models.User, session: models.WorkoutSession) -> None:
    name = user.name or user.username
    focus = session.focus or "workout"
    set_count = sum(len(ex.get("sets") or []) for ex in (session.exercises or []))
    notify_buddies(
        db, sender_user_id=user.id, kind="workout_done",
        message=f"{name} finished a {focus} session ({set_count} sets)",
        payload={"session_id": session.id, "focus": session.focus, "sets": set_count},
    )


def notify_buddy_pr(db: Session, user: models.User, pr: models.PersonalRecord) -> None:
    name = user.name or user.username
    if pr.is_cardio:
        msg = f"{name} set a new {pr.name} PR"
    else:
        msg = f"{name} hit a new {pr.name} PR — {pr.weight}kg × {pr.reps}"
    notify_buddies(
        db, sender_user_id=user.id, kind="pr_set",
        message=msg,
        payload={"exercise_id": pr.exercise_id, "weight": pr.weight, "reps": pr.reps},
    )
