"""Personal workout regime CRUD + the rule-based questionnaire generator.

A *regime* is a 7-day plan: ``mon`` … ``sun`` each map to ``{focus, exerciseIds,
enabled}``. The user fills out a short questionnaire (goal, weekly availability,
focus / avoid muscle groups, equipment) and the generator returns a complete
plan keyed to those answers.  The user can save the result, edit it, or hand
it to a trainer to assign to a trainee.
"""
from __future__ import annotations

import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..notifications import now_ms

router = APIRouter(prefix="/regimes", tags=["regimes"])


WEEK_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


# ── Templates ────────────────────────────────────────────────────────────────
# Each tuple is (focus_id, target_muscle_groups). The generator picks
# exercises whose primary muscle groups overlap the target list.

_FULL_BODY = ("full_body", ["Chest", "Back", "Legs", "Shoulders", "Core"])
_UPPER = ("upper", ["Chest", "Back", "Shoulders", "Triceps", "Biceps"])
_LOWER = ("lower", ["Quads", "Hamstrings", "Glutes", "Calves", "Legs"])
_PUSH = ("push", ["Chest", "Shoulders", "Triceps"])
_PULL = ("pull", ["Back", "Biceps"])
_LEGS = ("legs", ["Quads", "Hamstrings", "Glutes", "Calves", "Legs"])
_ARMS = ("arms", ["Biceps", "Triceps"])
_CORE = ("core", ["Core"])

_TEMPLATES: dict[int, list[tuple]] = {
    1: [_FULL_BODY],
    2: [_UPPER, _LOWER],
    3: [_PUSH, _PULL, _LEGS],
    4: [_UPPER, _LOWER, _UPPER, _LOWER],
    5: [_PUSH, _PULL, _LEGS, _UPPER, _LOWER],
    6: [_PUSH, _PULL, _LEGS, _PUSH, _PULL, _LEGS],
    7: [_PUSH, _PULL, _LEGS, _UPPER, _LOWER, _ARMS, _CORE],
}

# Spread N training days across the week with rest days mixed in.
_DAY_SCHEDULES: dict[int, list[int]] = {
    1: [2],                           # Wed
    2: [0, 3],                        # Mon, Thu
    3: [0, 2, 4],                     # Mon, Wed, Fri
    4: [0, 1, 3, 4],                  # Mon, Tue, Thu, Fri
    5: [0, 1, 2, 4, 5],               # Mon, Tue, Wed, Fri, Sat
    6: [0, 1, 2, 3, 4, 5],            # Mon-Sat
    7: [0, 1, 2, 3, 4, 5, 6],
}

# Exercises per session by experience.
_EX_PER_DAY = {"beginner": 4, "intermediate": 5, "advanced": 6}

# Equipment hints — coarse match against exercise id keywords.
_EQUIPMENT_KEYWORDS = {
    "barbell": {"bb_", "bench", "squat", "dead", "ohp", "rdl", "tbar", "shrug", "good_morn", "front_sq", "hack_sq", "cgbench", "sdl"},
    "dumbbell": {"db_", "incline_db", "lunges", "hammer", "incline_curl", "preacher", "lat_raise", "front_raise", "rev_fly", "db_curl", "db_press"},
    "machine": {"leg_press", "leg_ext", "leg_curl", "pec_deck", "cable_", "tri_push", "cs_row", "cable_row", "face_pull", "pulldown", "lat_pd", "calf_", "smith"},
    "bodyweight": {"pullups", "dips", "plank", "ab_wheel", "hanging_lr", "pushup", "burpee", "mountain", "jumping"},
}


def _muscle_groups_for(db: Session) -> dict[str, str]:
    return {m.id: m.muscle_group for m in db.query(models.Muscle).all()}


def _exercise_match_score(
    ex: models.Exercise,
    target_groups: set[str],
    focus_areas: set[str],
    avoid_groups: set[str],
    equipment: list[str],
    mid_to_group: dict[str, str],
) -> float:
    """Higher = better fit for this day's focus. 0 / negative means skip."""
    primary_groups = {mid_to_group.get(m, "") for m in (ex.primary_muscles or [])}
    primary_groups.discard("")
    if not primary_groups:
        return 0
    # Skip if any primary group is in the avoid list
    if primary_groups & avoid_groups:
        return -1
    # Must hit at least one target group
    overlap = primary_groups & target_groups
    if not overlap:
        return 0
    score = float(len(overlap))
    # Bonus for hitting an explicit focus area
    score += 2.0 * len(primary_groups & focus_areas)
    # Equipment preference
    if equipment:
        ex_id = ex.id.lower()
        match = False
        for kw in equipment:
            if any(token in ex_id for token in _EQUIPMENT_KEYWORDS.get(kw, set())):
                match = True
                break
        if not match:
            score -= 0.5
    # Mild penalty for cardio / timed in strength templates
    if ex.type != "strength":
        score -= 1.0
    return score


def _pick_for_day(
    target_groups: list[str],
    target_count: int,
    focus_areas: set[str],
    avoid_groups: set[str],
    equipment: list[str],
    pool: list[models.Exercise],
    mid_to_group: dict[str, str],
    rng: random.Random,
) -> list[str]:
    target_set = set(target_groups)
    scored = []
    for ex in pool:
        s = _exercise_match_score(ex, target_set, focus_areas, avoid_groups, equipment, mid_to_group)
        if s > 0:
            scored.append((s, ex))
    if not scored:
        return []
    scored.sort(key=lambda t: -t[0])

    chosen: list[models.Exercise] = []
    covered: set[str] = set()
    # First pass: cover each target group with at least one exercise
    for group in target_groups:
        for s, ex in scored:
            if ex in chosen:
                continue
            primary = {mid_to_group.get(m, "") for m in (ex.primary_muscles or [])}
            if group in primary:
                chosen.append(ex)
                covered.update(primary & target_set)
                break
        if len(chosen) >= target_count:
            break
    # Second pass: fill up to target_count with the next highest-scoring exercises,
    # sprinkled with a little randomness so two generations of the same plan differ.
    pool_left = [ex for s, ex in scored if ex not in chosen]
    rng.shuffle(pool_left)
    # Stable ish: re-sort tier-1 (top 30%) ahead of tier-2 (rest) but within
    # each tier order is randomised, giving variety without picking junk.
    top_tier = pool_left[: max(1, len(pool_left) // 3)]
    rest = pool_left[len(top_tier):]
    for ex in [*top_tier, *rest]:
        if len(chosen) >= target_count:
            break
        chosen.append(ex)
    return [ex.id for ex in chosen[:target_count]]


def _generate_plan(
    db: Session,
    q: schemas.RegimeQuestionnaire,
) -> dict[str, dict]:
    mid_to_group = _muscle_groups_for(db)
    pool = db.query(models.Exercise).all()
    template = _TEMPLATES.get(q.days_per_week, _TEMPLATES[3])
    schedule = _DAY_SCHEDULES.get(q.days_per_week, _DAY_SCHEDULES[3])
    focus = set(q.focus_areas or [])
    avoid = set(q.avoid_muscles or [])
    # Seed RNG from the input so re-generating with the same answers is stable
    # (the user re-rolls explicitly by tweaking inputs or hitting "regenerate").
    rng = random.Random(hash((q.goal, q.experience, q.days_per_week,
                              tuple(sorted(focus)), tuple(sorted(avoid)),
                              tuple(sorted(q.equipment or [])))))
    per_day = _EX_PER_DAY.get(q.experience, 5)

    days: dict[str, dict] = {}
    for key in WEEK_KEYS:
        days[key] = {"focus": "Rest", "exerciseIds": [], "enabled": False}

    for slot, (focus_id, target_groups) in zip(schedule, template):
        key = WEEK_KEYS[slot]
        ex_ids = _pick_for_day(target_groups, per_day, focus, avoid, q.equipment or [], pool, mid_to_group, rng)
        # If the user wants cardio, sprinkle one cardio item into the last
        # working slot of the week so they get at least one conditioning day.
        days[key] = {"focus": focus_id, "exerciseIds": ex_ids, "enabled": True}

    if q.include_cardio:
        cardio_ids = [e.id for e in pool if e.type == "cardio"]
        if cardio_ids:
            # Pick a rest slot, or append to the last active day, for one cardio block
            for key in WEEK_KEYS:
                if not days[key]["enabled"]:
                    days[key] = {"focus": "cardio", "exerciseIds": [rng.choice(cardio_ids)], "enabled": True}
                    break
            else:
                last_key = WEEK_KEYS[schedule[-1]]
                days[last_key]["exerciseIds"].append(rng.choice(cardio_ids))

    return days


def _to_out(regime: models.Regime) -> schemas.RegimeOut:
    return schemas.RegimeOut(
        id=regime.id, owner_id=regime.owner_id, name=regime.name,
        description=regime.description, goal=regime.goal, experience=regime.experience,
        days_per_week=regime.days_per_week,
        focus_areas=list(regime.focus_areas or []),
        avoid_muscles=list(regime.avoid_muscles or []),
        equipment=list(regime.equipment or []),
        days={k: schemas.DayPlanIn(**v) for k, v in (regime.days or {}).items()},
        is_template=bool(regime.is_template), created_at=regime.created_at,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=schemas.RegimeCreate)
def generate(
    body: schemas.RegimeQuestionnaire,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Run the rule-based generator and return a draft regime. The caller
    decides whether to save it (POST /regimes) or tweak the answers first."""
    days = _generate_plan(db, body)
    name = body.name or _name_for(body)
    desc = _describe(body)
    return schemas.RegimeCreate(
        name=name, description=desc, goal=body.goal, experience=body.experience,
        days_per_week=body.days_per_week,
        focus_areas=body.focus_areas, avoid_muscles=body.avoid_muscles,
        equipment=body.equipment,
        days={k: schemas.DayPlanIn(**v) for k, v in days.items()},
    )


def _name_for(q: schemas.RegimeQuestionnaire) -> str:
    bits = []
    if q.goal == "strength":
        bits.append("Strength")
    elif q.goal == "hypertrophy":
        bits.append("Hypertrophy")
    elif q.goal == "endurance":
        bits.append("Endurance")
    elif q.goal == "weight_loss":
        bits.append("Fat Loss")
    else:
        bits.append("General Fitness")
    bits.append(f"{q.days_per_week}-Day Plan")
    return " ".join(bits)


def _describe(q: schemas.RegimeQuestionnaire) -> str:
    parts = [
        f"Goal: {q.goal.replace('_', ' ').title()}",
        f"Level: {q.experience.title()}",
        f"{q.days_per_week} sessions per week",
    ]
    if q.focus_areas:
        parts.append("Focus: " + ", ".join(q.focus_areas))
    if q.avoid_muscles:
        parts.append("Skipping: " + ", ".join(q.avoid_muscles))
    if q.equipment:
        parts.append("Equipment: " + ", ".join(q.equipment))
    if q.include_cardio:
        parts.append("Includes a cardio block")
    return " · ".join(parts)


@router.get("", response_model=List[schemas.RegimeOut])
def list_mine(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Regime)
        .filter(models.Regime.owner_id == current_user.id)
        .order_by(models.Regime.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("", response_model=schemas.RegimeOut, status_code=201)
def create_regime(
    body: schemas.RegimeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = models.Regime(
        owner_id=current_user.id, name=body.name, description=body.description,
        goal=body.goal, experience=body.experience, days_per_week=body.days_per_week,
        focus_areas=list(body.focus_areas), avoid_muscles=list(body.avoid_muscles),
        equipment=list(body.equipment),
        days={k: v.model_dump() for k, v in (body.days or {}).items()},
        is_template=False, created_at=now_ms(),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_out(r)


@router.get("/{regime_id}", response_model=schemas.RegimeOut)
def get_regime(
    regime_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = db.query(models.Regime).filter(models.Regime.id == regime_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Regime not found")
    # Only the owner can read the full regime by id. Trainer-assigned regimes
    # are fetched through the assignment endpoint instead.
    if r.owner_id != current_user.id:
        # Allow trainer↔trainee access where there is an active assignment
        ok = db.query(models.RegimeAssignment).filter(
            models.RegimeAssignment.regime_id == regime_id,
            ((models.RegimeAssignment.trainer_id == current_user.id) |
             (models.RegimeAssignment.trainee_id == current_user.id)),
            models.RegimeAssignment.status == "active",
        ).first()
        if not ok:
            raise HTTPException(status_code=403, detail="Not your regime")
    return _to_out(r)


@router.put("/{regime_id}", response_model=schemas.RegimeOut)
def update_regime(
    regime_id: int,
    body: schemas.RegimeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = db.query(models.Regime).filter(models.Regime.id == regime_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Regime not found")
    if r.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your regime")
    r.name = body.name
    r.description = body.description
    r.goal = body.goal
    r.experience = body.experience
    r.days_per_week = body.days_per_week
    r.focus_areas = list(body.focus_areas)
    r.avoid_muscles = list(body.avoid_muscles)
    r.equipment = list(body.equipment)
    r.days = {k: v.model_dump() for k, v in (body.days or {}).items()}
    db.commit()
    db.refresh(r)
    return _to_out(r)


@router.delete("/{regime_id}", status_code=204)
def delete_regime(
    regime_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = db.query(models.Regime).filter(models.Regime.id == regime_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Regime not found")
    if r.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your regime")
    # Wipe any assignments that reference this regime
    db.query(models.RegimeAssignment).filter(models.RegimeAssignment.regime_id == regime_id).delete()
    db.delete(r)
    db.commit()
