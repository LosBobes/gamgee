"""Account-management endpoints: GDPR export + delete.

Export is a streaming JSON bundle to avoid materializing everything in RAM
for a long-history user. Delete is a hard cascade — every row owned by the
user is removed, including buddy / trainer / chat relationships.
"""
from __future__ import annotations

import json
import time
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, verify_password
from ..database import get_db

router = APIRouter(prefix="/account", tags=["account"])


def _stream_export(user: models.User, db: Session) -> Iterator[bytes]:
    """Yield a JSON object bytes one section at a time."""
    yield b"{\n"
    yield b'  "exported_at": ' + json.dumps(int(time.time() * 1000)).encode() + b",\n"
    yield b'  "user": ' + json.dumps({
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "gender": user.gender,
        "is_admin": user.is_admin,
        "is_verified": user.is_verified,
        "is_trainer": user.is_trainer,
    }).encode() + b",\n"

    def _section(label: str, rows: list[dict], trailing_comma: bool = True) -> bytes:
        suffix = b",\n" if trailing_comma else b"\n"
        return f'  "{label}": '.encode() + json.dumps(rows, default=str).encode() + suffix

    workouts = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == user.id)
        .order_by(models.WorkoutSession.date.desc())
        .all()
    )
    yield _section("workouts", [
        {
            "id": w.id, "date": w.date, "duration": w.duration,
            "focus": w.focus, "exercises": w.exercises,
        }
        for w in workouts
    ])

    prs = (
        db.query(models.PersonalRecord)
        .filter(models.PersonalRecord.user_id == user.id)
        .all()
    )
    yield _section("personal_records", [
        {
            "exercise_id": p.exercise_id, "name": p.name,
            "weight": p.weight, "reps": p.reps, "date": p.date,
            "is_cardio": p.is_cardio,
        } for p in prs
    ])

    metrics = (
        db.query(models.BodyMetric)
        .filter(models.BodyMetric.user_id == user.id)
        .order_by(models.BodyMetric.date.desc())
        .all()
    )
    yield _section("body_metrics", [
        {
            "metric_type": m.metric_type, "value": m.value, "unit": m.unit,
            "date": m.date, "note": m.note,
        } for m in metrics
    ])

    soreness = (
        db.query(models.SorenessLog)
        .filter(models.SorenessLog.user_id == user.id)
        .all()
    )
    yield _section("soreness_logs", [
        {
            "date": s.date, "sleep": s.sleep, "stress": s.stress,
            "motivation": s.motivation, "soreness_map": s.soreness_map,
            "note": s.note,
        } for s in soreness
    ])

    notes = (
        db.query(models.ExerciseNote)
        .filter(models.ExerciseNote.user_id == user.id)
        .all()
    )
    yield _section("exercise_notes", [
        {"exercise_id": n.exercise_id, "body": n.body, "updated_at": n.updated_at}
        for n in notes
    ])

    templates = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.user_id == user.id)
        .all()
    )
    yield _section("templates", [
        {
            "name": t.name, "focus": t.focus, "description": t.description,
            "exercises": t.exercises, "created_at": t.created_at,
        }
        for t in templates
    ])

    badges = (
        db.query(models.EarnedBadge)
        .filter(models.EarnedBadge.user_id == user.id)
        .all()
    )
    yield _section("earned_badges", [
        {"badge_id": b.badge_id, "earned_at": b.earned_at, "meta": b.meta}
        for b in badges
    ])

    convs = (
        db.query(models.Conversation)
        .filter(or_(models.Conversation.user_low == user.id, models.Conversation.user_high == user.id))
        .all()
    )
    conv_ids = [c.id for c in convs]
    messages = []
    if conv_ids:
        messages = (
            db.query(models.Message)
            .filter(models.Message.conversation_id.in_(conv_ids))
            .all()
        )
    yield _section("chat_messages", [
        {
            "conversation_id": m.conversation_id, "sender_id": m.sender_id,
            "body": m.body, "created_at": m.created_at,
        } for m in messages
    ], trailing_comma=False)
    yield b"}\n"


@router.get("/export")
def export_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    filename = f"gamgee-{current_user.username}-{int(time.time())}.json"
    return StreamingResponse(
        _stream_export(current_user, db),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    body: schemas.AccountDelete,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(403, "Password does not match")
    if body.confirm != "DELETE":
        raise HTTPException(400, 'Type "DELETE" to confirm')

    user_id = current_user.id

    # Cascade-delete owned and relational rows. Order matters where FKs point
    # at the user — clear leaves first, then trunk.
    db.query(models.Message).filter(models.Message.sender_id == user_id).delete(synchronize_session=False)
    db.query(models.MessageRead).filter(models.MessageRead.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Conversation).filter(
        or_(models.Conversation.user_low == user_id, models.Conversation.user_high == user_id)
    ).delete(synchronize_session=False)
    db.query(models.WorkoutSession).filter(models.WorkoutSession.user_id == user_id).delete(synchronize_session=False)
    db.query(models.PersonalRecord).filter(models.PersonalRecord.user_id == user_id).delete(synchronize_session=False)
    db.query(models.BodyMetric).filter(models.BodyMetric.user_id == user_id).delete(synchronize_session=False)
    db.query(models.WorkoutTemplate).filter(models.WorkoutTemplate.user_id == user_id).delete(synchronize_session=False)
    db.query(models.ExerciseNote).filter(models.ExerciseNote.user_id == user_id).delete(synchronize_session=False)
    db.query(models.EarnedBadge).filter(models.EarnedBadge.user_id == user_id).delete(synchronize_session=False)
    db.query(models.SorenessLog).filter(models.SorenessLog.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Buddy).filter(
        or_(models.Buddy.user_id == user_id, models.Buddy.buddy_user_id == user_id)
    ).delete(synchronize_session=False)
    db.query(models.TrainerLink).filter(
        or_(models.TrainerLink.trainer_id == user_id, models.TrainerLink.trainee_id == user_id)
    ).delete(synchronize_session=False)
    db.query(models.RegimeAssignment).filter(
        or_(models.RegimeAssignment.trainer_id == user_id, models.RegimeAssignment.trainee_id == user_id)
    ).delete(synchronize_session=False)
    db.query(models.Regime).filter(models.Regime.owner_id == user_id).delete(synchronize_session=False)
    db.query(models.Mesocycle).filter(models.Mesocycle.owner_id == user_id).delete(synchronize_session=False)
    db.query(models.Notification).filter(
        or_(models.Notification.user_id == user_id, models.Notification.sender_user_id == user_id)
    ).delete(synchronize_session=False)
    db.query(models.LiveParticipant).filter(models.LiveParticipant.user_id == user_id).delete(synchronize_session=False)
    db.query(models.LiveSession).filter(models.LiveSession.owner_id == user_id).delete(synchronize_session=False)
    db.query(models.PushSubscription).filter(models.PushSubscription.user_id == user_id).delete(synchronize_session=False)
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == user_id).delete(synchronize_session=False)
    db.query(models.EmailVerificationToken).filter(models.EmailVerificationToken.user_id == user_id).delete(synchronize_session=False)
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).delete(synchronize_session=False)
    db.query(models.TotpSecret).filter(models.TotpSecret.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Feedback).filter(models.Feedback.user_id == user_id).delete(synchronize_session=False)
    db.query(models.User).filter(models.User.id == user_id).delete(synchronize_session=False)
    db.commit()
