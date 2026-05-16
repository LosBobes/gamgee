"""AI coach proxy backed by the Anthropic SDK.

Configuration:
  ANTHROPIC_API_KEY      Required. Without it every call returns 503.
  CLAUDE_COACH_MODEL     Defaults to "claude-sonnet-4-6".
  COACH_AI_MAX_PER_DAY   Per-user daily cap, default 30. Counter is in-process
                         and resets when the server restarts (good enough
                         until we run multiple workers — see issue notes).

Prompt-caches the static system block. The dynamic user data (last 12 weeks
of an exercise's set history) is included separately so cache hits are common
between the user's repeat questions.
"""
from __future__ import annotations

import os
import threading
import time
from collections import defaultdict
from datetime import date as _date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/coach-ai", tags=["coach-ai"])

_SYSTEM_PROMPT = (
    "You are Gamgee, a friendly, evidence-based strength-training coach. "
    "Answer in 2–4 short paragraphs of plain text. Reference the user's data "
    "by date when relevant. Prefer practical next-action advice over theory. "
    "Never invent set data — only cite numbers shown to you in this turn."
)

_DAILY_CAP = int(os.environ.get("COACH_AI_MAX_PER_DAY", "30"))

_lock = threading.Lock()
_counters: dict[int, tuple[str, int]] = defaultdict(lambda: ("", 0))


def _check_cap(user_id: int) -> None:
    today = _date.today().isoformat()
    with _lock:
        day, count = _counters[user_id]
        if day != today:
            day, count = today, 0
        if count >= _DAILY_CAP:
            raise HTTPException(429, f"Daily coach-AI cap of {_DAILY_CAP} reached")
        _counters[user_id] = (today, count + 1)


def _exercise_history_snippet(db: Session, user_id: int, exercise_id: str, weeks: int = 12) -> str:
    """Compact text summary of the user's recent sets for an exercise."""
    sessions = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == user_id)
        .order_by(models.WorkoutSession.date.desc())
        .limit(60)
        .all()
    )
    lines: list[str] = []
    for s in sessions:
        for ex in (s.exercises or []):
            if not isinstance(ex, dict):
                continue
            if ex.get("id") != exercise_id:
                continue
            sets = ex.get("sets") or []
            done_sets = [x for x in sets if isinstance(x, dict) and x.get("done")]
            if not done_sets:
                continue
            rendered = ", ".join(
                f"{x.get('weight', '?')}×{x.get('reps', '?')}" for x in done_sets[:8]
            )
            lines.append(f"{s.date}: {rendered}")
            if len(lines) >= 14:
                break
        if len(lines) >= 14:
            break
    if not lines:
        return "(no recent sets for this exercise)"
    return "\n".join(lines)


@router.post("/ask", response_model=schemas.CoachAIResponse)
def ask_coach(
    body: schemas.CoachAIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(503, "AI coach not configured (ANTHROPIC_API_KEY missing)")

    try:
        from anthropic import Anthropic  # type: ignore
    except ImportError:
        raise HTTPException(503, "AI coach not installed (pip install anthropic)")

    _check_cap(current_user.id)

    model = os.environ.get("CLAUDE_COACH_MODEL", "claude-sonnet-4-6").strip() or "claude-sonnet-4-6"
    client = Anthropic(api_key=api_key)

    user_block: list[dict] = []
    if body.exercise_id:
        snippet = _exercise_history_snippet(db, current_user.id, body.exercise_id)
        user_block.append({
            "type": "text",
            "text": f"Recent {body.exercise_id} sets:\n{snippet}",
        })
    user_block.append({"type": "text", "text": body.question.strip()})

    try:
        msg = client.messages.create(
            model=model,
            max_tokens=600,
            system=[{
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": user_block}],
        )
    except Exception as exc:
        raise HTTPException(502, f"AI coach upstream error: {exc}")

    parts = []
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    answer = "\n".join(parts).strip() or "(no response)"
    return schemas.CoachAIResponse(
        answer=answer,
        model=model,
        cached=bool(getattr(msg.usage, "cache_read_input_tokens", 0)),
    )


@router.get("/health")
def coach_ai_health() -> dict:
    key_set = bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
    try:
        import anthropic  # noqa: F401
        sdk_installed = True
    except ImportError:
        sdk_installed = False
    return {
        "configured": key_set and sdk_installed,
        "key_set": key_set,
        "sdk_installed": sdk_installed,
        "model": os.environ.get("CLAUDE_COACH_MODEL", "claude-sonnet-4-6"),
        "daily_cap": _DAILY_CAP,
    }
