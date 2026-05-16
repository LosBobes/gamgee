"""Computed streak + badge endpoints.

Streaks tolerate up to 2 rest days between sessions so users don't lose a
streak from a planned rest day. Badge awards are computed lazily on each
fetch and persisted in `earned_badges` so they can be celebrated only once.
"""
from __future__ import annotations

import time
from datetime import date as _date, timedelta
from typing import Iterable

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/streaks", tags=["streaks"])

# Tolerance: number of consecutive rest days that don't break the streak.
REST_DAY_TOLERANCE = 2


BADGE_DEFS: dict[str, dict] = {
    "first_workout": {"label": "First Workout", "description": "You started.", "icon": "Flag"},
    "ten_workouts": {"label": "10 Workouts", "description": "Habit forming.", "icon": "Sparkles"},
    "fifty_workouts": {"label": "50 Workouts", "description": "Half a century.", "icon": "Award"},
    "hundred_workouts": {"label": "100 Workouts", "description": "Triple-digit consistency.", "icon": "Trophy"},
    "streak_7": {"label": "7-Day Streak", "description": "A whole week.", "icon": "Flame"},
    "streak_30": {"label": "30-Day Streak", "description": "A month in motion.", "icon": "Flame"},
    "streak_100": {"label": "100-Day Streak", "description": "Year-defining run.", "icon": "Flame"},
    "first_pr": {"label": "First PR", "description": "Beat your past self.", "icon": "TrendingUp"},
    "ten_prs": {"label": "10 PRs", "description": "Stacking gains.", "icon": "TrendingUp"},
}


def _parse_dates(rows: Iterable[models.WorkoutSession]) -> list[_date]:
    out: list[_date] = []
    for r in rows:
        if not r.date:
            continue
        try:
            out.append(_date.fromisoformat(r.date[:10]))
        except ValueError:
            continue
    return sorted(set(out))


def _streaks(dates: list[_date], today: _date) -> tuple[int, int]:
    """Return (current_streak_in_sessions, best_streak_in_sessions).

    A streak is a maximal run of session-dates whose gaps to the next session
    are <= REST_DAY_TOLERANCE + 1 days. The current streak counts the trailing
    run if its last session was within `REST_DAY_TOLERANCE + 1` of today.
    """
    if not dates:
        return 0, 0
    max_run = 1
    cur_run = 1
    for prev, nxt in zip(dates, dates[1:]):
        gap = (nxt - prev).days
        if gap <= REST_DAY_TOLERANCE + 1:
            cur_run += 1
        else:
            cur_run = 1
        max_run = max(max_run, cur_run)

    trailing_gap = (today - dates[-1]).days
    current = cur_run if trailing_gap <= REST_DAY_TOLERANCE + 1 else 0
    return current, max_run


def _award(db: Session, user_id: int, badge_id: str, meta: dict | None = None) -> models.EarnedBadge | None:
    existing = (
        db.query(models.EarnedBadge)
        .filter(models.EarnedBadge.user_id == user_id, models.EarnedBadge.badge_id == badge_id)
        .first()
    )
    if existing:
        return None
    row = models.EarnedBadge(
        user_id=user_id,
        badge_id=badge_id,
        earned_at=int(time.time() * 1000),
        meta=meta or {},
    )
    db.add(row)
    return row


@router.get("", response_model=schemas.StreakSummary)
def get_streak_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sessions = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == current_user.id)
        .all()
    )
    pr_count = (
        db.query(models.PersonalRecord)
        .filter(models.PersonalRecord.user_id == current_user.id)
        .count()
    )
    dates = _parse_dates(sessions)
    today = _date.today()
    current, best = _streaks(dates, today)

    if sessions:
        _award(db, current_user.id, "first_workout")
    if len(sessions) >= 10:
        _award(db, current_user.id, "ten_workouts")
    if len(sessions) >= 50:
        _award(db, current_user.id, "fifty_workouts")
    if len(sessions) >= 100:
        _award(db, current_user.id, "hundred_workouts")
    if current >= 7 or best >= 7:
        _award(db, current_user.id, "streak_7")
    if current >= 30 or best >= 30:
        _award(db, current_user.id, "streak_30")
    if current >= 100 or best >= 100:
        _award(db, current_user.id, "streak_100")
    if pr_count >= 1:
        _award(db, current_user.id, "first_pr")
    if pr_count >= 10:
        _award(db, current_user.id, "ten_prs")
    db.commit()

    earned_rows = (
        db.query(models.EarnedBadge)
        .filter(models.EarnedBadge.user_id == current_user.id)
        .order_by(models.EarnedBadge.earned_at.desc())
        .all()
    )
    badges = []
    for r in earned_rows:
        defn = BADGE_DEFS.get(r.badge_id)
        if not defn:
            continue
        badges.append(
            schemas.StreakBadge(
                badge_id=r.badge_id,
                earned_at=r.earned_at,
                label=defn["label"],
                description=defn["description"],
                icon=defn.get("icon"),
                meta=r.meta or None,
            )
        )

    cutoff = today - timedelta(days=30)
    days_30 = sum(1 for d in dates if d >= cutoff)

    return schemas.StreakSummary(
        current_streak=current,
        best_streak=best,
        sessions_total=len(sessions),
        days_active_30=days_30,
        last_workout_date=dates[-1].isoformat() if dates else None,
        earned_badges=badges,
    )
