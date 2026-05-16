"""CSV importer for the most common third-party trackers (Strong, Hevy, JEFIT).

Approach: detect the column layout from the header row, then map to our
JSONB `WorkoutSession.exercises` shape. Unknown exercise names become a
`{"id": "imported_<slug>", "name": "<original>"}` placeholder so the user
can re-map them in the UI without losing data.
"""
from __future__ import annotations

import csv
import io
import re
import time
import uuid
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/import", tags=["import"])

MAX_BYTES = 5 * 1024 * 1024  # 5 MiB

# Header signatures by tracker. Keep the keys simple lower-case for matching.
_SIG = {
    "strong": {"date", "workout name", "exercise name", "set order", "weight", "reps"},
    "hevy":   {"date", "exercise_title", "set_index", "weight_kg", "reps"},
    "jefit":  {"date", "exercise", "weight", "reps"},
}


def _slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    return s[:60] or "exercise"


def _detect(headers: list[str]) -> str:
    hset = {h.strip().lower() for h in headers}
    for name, sig in _SIG.items():
        if sig.issubset(hset):
            return name
    raise HTTPException(400, "Could not detect CSV layout. Supported: Strong, Hevy, JEFIT.")


def _to_float(s: str) -> float:
    try:
        return float(s.strip()) if s and s.strip() else 0.0
    except ValueError:
        return 0.0


def _to_int(s: str) -> int:
    try:
        return int(float(s.strip())) if s and s.strip() else 0
    except ValueError:
        return 0


def _row_to_set(layout: str, row: dict[str, str]) -> tuple[str, str, dict]:
    """Return (date_iso, exercise_name, set_dict)."""
    def g(*keys: str) -> str:
        for k in keys:
            for hk, v in row.items():
                if hk.strip().lower() == k:
                    return v or ""
        return ""

    if layout == "strong":
        date = g("date")
        name = g("exercise name")
    elif layout == "hevy":
        date = g("date")
        name = g("exercise_title")
    else:
        date = g("date")
        name = g("exercise")

    weight = g("weight", "weight_kg", "weight (kg)")
    reps = g("reps")
    sd = {
        "weight": str(_to_float(weight)),
        "reps":   str(_to_int(reps)),
        "done": True,
    }
    return date[:10] if date else "", name.strip(), sd


@router.post("/csv")
async def import_csv(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty file")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 5 MiB)")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = raw.decode("latin-1")
        except Exception:
            raise HTTPException(400, "Could not decode file as UTF-8 or Latin-1")

    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    layout = _detect(headers)

    # Group rows into (date, exercise) -> sets list, preserving order.
    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    seen_dates: set[str] = set()
    for row in reader:
        date_iso, name, set_dict = _row_to_set(layout, row)
        if not date_iso or not name:
            continue
        grouped[(date_iso, name)].append(set_dict)
        seen_dates.add(date_iso)

    if not grouped:
        return {"imported": 0, "sessions": 0, "layout": layout}

    # One WorkoutSession per date. Exercises within a session retain insertion
    # order — `dict` is ordered in CPython since 3.7.
    by_date: dict[str, dict[str, dict]] = defaultdict(dict)
    for (date_iso, name), sets in grouped.items():
        ex_id = f"imported_{_slug(name)}"
        ex_record = by_date[date_iso].get(ex_id) or {
            "id": ex_id,
            "uid": uuid.uuid4().hex,
            "name": name,
            "type": "strength",
            "sets": [],
        }
        ex_record["sets"].extend(sets)
        by_date[date_iso][ex_id] = ex_record

    imported_count = 0
    for date_iso, ex_map in by_date.items():
        sid = str(uuid.uuid4())
        # Don't clobber an existing session on the same date — append exercises
        # if a session already exists, else create new.
        existing = (
            db.query(models.WorkoutSession)
            .filter(
                models.WorkoutSession.user_id == current_user.id,
                models.WorkoutSession.date == date_iso,
            )
            .first()
        )
        if existing:
            current_ex = list(existing.exercises or [])
            current_ex.extend(ex_map.values())
            existing.exercises = current_ex
        else:
            db.add(models.WorkoutSession(
                id=sid,
                user_id=current_user.id,
                date=date_iso,
                duration=0,
                focus=None,
                exercises=list(ex_map.values()),
            ))
        imported_count += 1
    db.commit()

    return {
        "imported_sessions": imported_count,
        "exercises": sum(len(v) for v in by_date.values()),
        "layout": layout,
    }
