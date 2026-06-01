import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .password_policy import validate_password

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]+$")
_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

Gender = Literal["female", "male", "non_binary", "other", "prefer_not_to_say"]


class ItemBase(BaseModel):
    title: str
    description: str | None = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class Item(ItemBase):
    id: int

    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=254)
    gender: Gender

    @field_validator("username")
    @classmethod
    def _username_format(cls, v: str) -> str:
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError("Username may only contain letters, digits, '.', '_' or '-'")
        return v

    @field_validator("name")
    @classmethod
    def _name_format(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("email")
    @classmethod
    def _email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v

    @model_validator(mode="after")
    def _check_password(self) -> "UserCreate":
        validate_password(self.password, username=self.username, email=self.email)
        return self


class UserOut(BaseModel):
    id: int
    username: str
    name: str | None = None
    email: str | None = None
    gender: str | None = None
    bodyweight_kg: float | None = None
    height_cm: float | None = None
    primary_color: str | None = None
    progression_speed: str | None = None
    is_admin: bool = False
    is_verified: bool = False
    is_trainer: bool = False
    trainer_bio: str | None = None
    trainer_specialties: list[str] | None = None
    trainer_certifications: str | None = None
    trainer_years_experience: int | None = None
    notify_workout: bool = True
    notify_pr: bool = True
    notify_motivate: bool = True
    notify_live: bool = True
    rest_short_seconds: int | None = None
    rest_medium_seconds: int | None = None
    rest_long_seconds: int | None = None
    # Post-session RPE → next-session step multiplier overrides. Keys are
    # string digits "1".."10"; values are non-negative floats that scale the
    # base weight jump (1.0 = neutral, 0.0 = hold, >1 = bigger jump). Null
    # means the client falls back to its baked-in default table.
    rpe_multipliers: dict[str, float] | None = None

    model_config = {"from_attributes": True}


class TrainerCreate(BaseModel):
    """Sign-up payload for the trainer-specific registration flow.

    Extends the regular UserCreate fields with public profile info (bio,
    specialties, certifications, years of experience) so a newly minted
    trainer has a real coaching page from day one."""
    username: str = Field(min_length=3, max_length=50)
    password: str
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=254)
    gender: Gender
    bio: str = Field(min_length=20, max_length=2000)
    specialties: list[str] = Field(min_length=1, max_length=10)
    certifications: str = Field(default="", max_length=2000)
    years_experience: int = Field(ge=0, le=80)

    @field_validator("username")
    @classmethod
    def _u_format(cls, v: str) -> str:
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError("Username may only contain letters, digits, '.', '_' or '-'")
        return v

    @field_validator("name")
    @classmethod
    def _n_format(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("email")
    @classmethod
    def _e_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v

    @field_validator("specialties")
    @classmethod
    def _strip_specialties(cls, v: list[str]) -> list[str]:
        out = [s.strip() for s in v if s and s.strip()]
        if not out:
            raise ValueError("Pick at least one specialty")
        return out

    @model_validator(mode="after")
    def _check_password(self) -> "TrainerCreate":
        validate_password(self.password, username=self.username, email=self.email)
        return self


class TrainerProfileUpdate(BaseModel):
    bio: str | None = Field(default=None, max_length=2000)
    specialties: list[str] | None = None
    certifications: str | None = Field(default=None, max_length=2000)
    years_experience: int | None = Field(default=None, ge=0, le=80)


class UserPreferences(BaseModel):
    primary_color: str | None = None
    progression_speed: Literal["slow", "moderate", "fast"] | None = None
    rest_short_seconds: int | None = Field(default=None, ge=5, le=3600)
    rest_medium_seconds: int | None = Field(default=None, ge=5, le=3600)
    rest_long_seconds: int | None = Field(default=None, ge=5, le=3600)
    # RPE→step multiplier overrides. Use {} to clear back to the client default
    # table; omit to leave the existing value untouched.
    rpe_multipliers: dict[str, float] | None = None

    @field_validator("primary_color")
    @classmethod
    def _valid_hex(cls, v: str | None) -> str | None:
        if v is not None and not _HEX_COLOR_RE.match(v):
            raise ValueError("primary_color must be a valid #RRGGBB hex color")
        return v

    @field_validator("rpe_multipliers")
    @classmethod
    def _valid_rpe_table(cls, v: dict[str, float] | None) -> dict[str, float] | None:
        if v is None:
            return None
        # Keys must be the strings "1".."10"; values are non-negative floats
        # bounded to a sane range (0 = hold the line; 5 = absurdly large jump).
        cleaned: dict[str, float] = {}
        for key, value in v.items():
            try:
                k = int(key)
            except (TypeError, ValueError):
                raise ValueError("rpe_multipliers keys must be integers 1..10")
            if k < 1 or k > 10:
                raise ValueError("rpe_multipliers keys must be integers 1..10")
            try:
                f = float(value)
            except (TypeError, ValueError):
                raise ValueError("rpe_multipliers values must be numbers")
            if not (f == f) or f < 0 or f > 5:
                raise ValueError("rpe_multipliers values must be between 0 and 5")
            cleaned[str(k)] = f
        return cleaned


class NotificationPreferences(BaseModel):
    notify_workout: bool | None = None
    notify_pr: bool | None = None
    notify_motivate: bool | None = None
    notify_live: bool | None = None


class UserProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str | None = None
    gender: Gender | None = None
    bodyweight_kg: float | None = Field(default=None, ge=20, le=400)
    height_cm: float | None = Field(default=None, ge=50, le=260)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("email")
    @classmethod
    def _fmt_email(cls, v: str | None) -> str | None:
        if not v:
            return None
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _strong(cls, v: str) -> str:
        validate_password(v)
        return v


# ── Password reset / email verification ──────────────────────────────────────

class ForgotPassword(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _fmt(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v


class ResetPassword(BaseModel):
    token: str = Field(min_length=8, max_length=512)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _strong(cls, v: str) -> str:
        validate_password(v)
        return v


class VerifyEmail(BaseModel):
    token: str = Field(min_length=8, max_length=512)


class ResendVerification(BaseModel):
    email: str | None = None

    @field_validator("email")
    @classmethod
    def _fmt(cls, v: str | None) -> str | None:
        if not v:
            return None
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v


class AdminResetPassword(BaseModel):
    """Admin-initiated password reset.

    If ``new_password`` is provided the password is set directly. Otherwise
    a reset link is emailed to the user (if they have an email on file).
    """
    new_password: str | None = None
    send_email: bool = True

    @field_validator("new_password")
    @classmethod
    def _strong(cls, v: str | None) -> str | None:
        if v is None:
            return None
        validate_password(v)
        return v


class AdminResetPasswordResult(BaseModel):
    mode: Literal["password_set", "reset_link_sent", "reset_link_generated"]
    temporary_password: str | None = None
    reset_link: str | None = None


# ── Workout sessions ──────────────────────────────────────────────────────────

class WorkoutSessionCreate(BaseModel):
    id: str
    date: str
    duration: int
    focus: str | None = None
    exercises: list[Any] = []
    rpe: int | None = Field(default=None, ge=1, le=10)


class WorkoutSession(WorkoutSessionCreate):
    model_config = {"from_attributes": True}


# ── Personal records ──────────────────────────────────────────────────────────

class PersonalRecordCreate(BaseModel):
    exercise_id: str
    name: str
    weight: float
    reps: int
    date: str
    isCardio: bool = False


class PersonalRecord(PersonalRecordCreate):
    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj: Any, **kwargs):
        # Map snake_case DB column back to camelCase expected by the frontend
        if hasattr(obj, "__dict__"):
            data = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
            data["isCardio"] = data.pop("is_cardio", False)
            return cls(**data)
        return super().model_validate(obj, **kwargs)


# ── Admin ─────────────────────────────────────────────────────────────────────

class UserAdminOut(BaseModel):
    id: int
    username: str
    name: str | None = None
    email: str | None = None
    gender: str | None = None
    primary_color: str | None = None
    is_admin: bool = False
    is_verified: bool = False

    model_config = {"from_attributes": True}


class UserAdminUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    gender: str | None = None
    is_admin: bool | None = None
    is_verified: bool | None = None


class ExerciseOut(BaseModel):
    id: str
    name: str
    category: str
    type: str
    description: str | None = None
    primary_muscles: list[str] = []
    secondary_muscles: list[str] = []
    is_assisted: bool = False

    model_config = {"from_attributes": True}


class ExerciseCreate(BaseModel):
    id: str
    name: str
    category: str
    type: str = "strength"
    description: str | None = None
    primary_muscles: list[str] = []
    secondary_muscles: list[str] = []
    is_assisted: bool = False


class ExerciseUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    type: str | None = None
    description: str | None = None
    primary_muscles: list[str] | None = None
    secondary_muscles: list[str] | None = None
    is_assisted: bool | None = None


class WorkoutAdminOut(BaseModel):
    id: str
    user_id: int | None = None
    username: str | None = None
    date: str
    duration: int
    focus: str | None = None
    exercise_count: int = 0


class PRAdminOut(BaseModel):
    id: int
    user_id: int | None = None
    username: str | None = None
    exercise_id: str
    name: str
    weight: float
    reps: int
    date: str
    is_cardio: bool = False


# ── Buddies ───────────────────────────────────────────────────────────────────

class BuddyRequestCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class BuddyOut(BaseModel):
    id: int                                 # buddy row id
    user_id: int                            # the other user's id
    username: str
    name: str | None = None
    primary_color: str | None = None
    status: str                             # pending_out | pending_in | accepted
    notify_workout: bool = True
    notify_pr: bool = True
    notify_motivate: bool = True
    notify_live: bool = True

    model_config = {"from_attributes": True}


class BuddyPrefsUpdate(BaseModel):
    notify_workout: bool | None = None
    notify_pr: bool | None = None
    notify_motivate: bool | None = None
    notify_live: bool | None = None


class UserSearchOut(BaseModel):
    id: int
    username: str
    name: str | None = None
    primary_color: str | None = None
    relationship: str = "none"              # none | accepted | pending_out | pending_in | self

    model_config = {"from_attributes": True}


class ScoreboardRow(BaseModel):
    user_id: int
    username: str
    name: str | None = None
    primary_color: str | None = None
    is_self: bool = False
    workouts_week: int = 0
    workouts_month: int = 0
    workouts_total: int = 0
    sets_week: int = 0
    volume_week: float = 0.0
    pr_count: int = 0
    last_workout: str | None = None
    current_streak: int = 0


class MotivateBody(BaseModel):
    message: str = Field(min_length=1, max_length=240)
    preset: str | None = None

    @field_validator("message")
    @classmethod
    def _strip_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class PublicProfileMemory(BaseModel):
    """One motivation message someone received — surfaced on their public
    profile as a 'board of memories'."""
    id: int
    sender_user_id: int | None = None
    sender_username: str | None = None
    sender_name: str | None = None
    sender_primary_color: str | None = None
    message: str
    created_at: int = 0


class PublicProfileOut(BaseModel):
    """Profile of another user, visible to accepted buddies (and self).

    The motivations board (`memories`) collects every `motivate` notification
    the user has received, with sender info attached."""
    user_id: int
    username: str
    name: str | None = None
    primary_color: str | None = None
    gender: str | None = None
    is_trainer: bool = False
    is_self: bool = False
    relationship: str = "none"               # self | accepted | none
    member_since: str | None = None          # ISO date of oldest workout
    workouts_total: int = 0
    pr_count: int = 0
    current_streak: int = 0
    last_workout: str | None = None
    top_focuses: list[str] = []              # most-used focus labels, up to 3
    memories: list[PublicProfileMemory] = []


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    kind: str
    sender_user_id: int | None = None
    sender_username: str | None = None
    sender_name: str | None = None
    message: str
    payload: Any | None = None
    read: bool = False
    created_at: int = 0

    model_config = {"from_attributes": True}


# ── Web Push subscriptions ────────────────────────────────────────────────────

class PushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=300)
    auth: str = Field(min_length=1, max_length=200)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2000)
    keys: PushKeys
    user_agent: str | None = Field(default=None, max_length=500)


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2000)


class PushPublicKeyOut(BaseModel):
    public_key: str | None = None
    enabled: bool = False


# ── Live (co-working-out) sessions ────────────────────────────────────────────

class LiveSessionCreate(BaseModel):
    id: str
    focus: str | None = None
    note: str | None = None


class LiveParticipantOut(BaseModel):
    user_id: int
    username: str
    name: str | None = None
    primary_color: str | None = None
    sets_done: int = 0
    joined_at: int = 0
    last_seen: int = 0


class LiveSessionOut(BaseModel):
    id: str
    owner_id: int
    owner_username: str
    owner_name: str | None = None
    owner_primary_color: str | None = None
    focus: str | None = None
    note: str | None = None
    status: str
    started_at: int = 0
    ended_at: int | None = None
    owner_sets_done: int = 0
    current_exercise_id: str | None = None
    current_exercise_name: str | None = None
    current_set_index: int | None = None
    last_weight: float | None = None
    last_reps: int | None = None
    total_sets_planned: int | None = None
    total_exercises_planned: int | None = None
    # Set whenever the requester is a trainer of the owner (or the owner
    # themselves). The set-by-set timeline is not visible to peers.
    can_see_set_timeline: bool = False
    participants: list[LiveParticipantOut] = []


class LiveProgressUpdate(BaseModel):
    sets_done: int = Field(ge=0, le=10000)
    current_exercise_id: str | None = Field(default=None, max_length=80)
    current_exercise_name: str | None = Field(default=None, max_length=120)
    current_set_index: int | None = Field(default=None, ge=0, le=10000)
    last_weight: float | None = Field(default=None, ge=0, le=10000)
    last_reps: int | None = Field(default=None, ge=0, le=10000)
    total_sets_planned: int | None = Field(default=None, ge=0, le=10000)
    total_exercises_planned: int | None = Field(default=None, ge=0, le=200)


class LiveSetEventCreate(BaseModel):
    """Logged after every completed set. Stored in `live_set_events` so a
    trainer can replay the workout one set at a time."""
    exercise_id: str = Field(min_length=1, max_length=80)
    exercise_name: str = Field(min_length=1, max_length=120)
    set_index: int = Field(ge=0, le=10000)
    weight: float | None = Field(default=None, ge=0, le=10000)
    reps: int | None = Field(default=None, ge=0, le=10000)


class LiveSetEventOut(BaseModel):
    id: int
    exercise_id: str
    exercise_name: str
    set_index: int
    weight: float | None = None
    reps: int | None = None
    ts: int = 0

    model_config = {"from_attributes": True}


# ── Body metrics ──────────────────────────────────────────────────────────────

class BodyMetricCreate(BaseModel):
    metric_type: str
    value: float
    unit: str
    date: str
    note: str | None = None


class BodyMetricOut(BodyMetricCreate):
    id: int

    model_config = {"from_attributes": True}


# ── Feedback ──────────────────────────────────────────────────────────────────

FeedbackKind   = Literal["bug", "feature", "general"]
FeedbackStatus = Literal["open", "resolved", "dismissed"]


class FeedbackCreate(BaseModel):
    kind: FeedbackKind = "general"
    message: str = Field(min_length=1, max_length=5000)

    @field_validator("message")
    @classmethod
    def _strip_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class FeedbackOut(BaseModel):
    id: int
    kind: str
    message: str
    status: str
    created_at: int = 0

    model_config = {"from_attributes": True}


class FeedbackAdminOut(BaseModel):
    id: int
    user_id: int | None = None
    username: str | None = None
    name: str | None = None
    kind: str
    message: str
    status: str
    created_at: int = 0
    resolved_at: int | None = None


class FeedbackStatusUpdate(BaseModel):
    status: FeedbackStatus



# ── Editable content (quotes, tips, motions, …) ──────────────────────────────

QuoteBucket = Literal["bro", "grl", "pro", "hero_bro", "hero_grl"]


class QuoteIn(BaseModel):
    bucket: QuoteBucket
    text: str = Field(min_length=1, max_length=2000)
    source: str | None = Field(default=None, max_length=120)
    line2: str | None = Field(default=None, max_length=120)
    sort: int = 0

    @field_validator("text")
    @classmethod
    def _strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Quote text cannot be empty")
        return v


class QuoteOut(QuoteIn):
    id: int
    model_config = {"from_attributes": True}


class TipIn(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    icon: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=4000)
    body_bro: str | None = Field(default=None, max_length=4000)
    body_grl: str | None = Field(default=None, max_length=4000)
    sort: int = 0


class TipUpdate(BaseModel):
    icon: str | None = Field(default=None, max_length=40)
    title: str | None = Field(default=None, max_length=120)
    body: str | None = Field(default=None, max_length=4000)
    body_bro: str | None = Field(default=None, max_length=4000)
    body_grl: str | None = Field(default=None, max_length=4000)
    sort: int | None = None


class TipOut(TipIn):
    model_config = {"from_attributes": True}


class FocusIn(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field(min_length=1, max_length=40)
    description: str = Field(default="", max_length=200)
    exercise_ids: list[str] = Field(default_factory=list)
    sort: int = 0


class FocusUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    icon: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=200)
    exercise_ids: list[str] | None = None
    sort: int | None = None


class FocusOut(FocusIn):
    model_config = {"from_attributes": True}


class MuscleIn(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    muscle_group: str = Field(min_length=1, max_length=60)
    sort: int = 0


class MuscleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    muscle_group: str | None = Field(default=None, max_length=60)
    sort: int | None = None


class MuscleOut(MuscleIn):
    model_config = {"from_attributes": True}


class StretchIn(BaseModel):
    muscle_group: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=120)
    duration: int = Field(ge=1, le=600)
    per_side: bool = False
    cue: str = Field(min_length=1, max_length=2000)
    sort: int = 0


class StretchOut(StretchIn):
    id: int
    model_config = {"from_attributes": True}


class ExerciseInfoIn(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=40)
    setup: str = Field(min_length=1, max_length=2000)
    execute: str = Field(min_length=1, max_length=2000)
    cue: str = Field(min_length=1, max_length=2000)


class ExerciseInfoUpdate(BaseModel):
    setup: str | None = Field(default=None, max_length=2000)
    execute: str | None = Field(default=None, max_length=2000)
    cue: str | None = Field(default=None, max_length=2000)


class ExerciseInfoOut(ExerciseInfoIn):
    model_config = {"from_attributes": True}


class MetricDefIn(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=80)
    unit: str = Field(min_length=1, max_length=20)
    color: str = Field(min_length=1, max_length=20)
    step: float = 1.0
    min_value: float = 0
    max_value: float = 999
    sort: int = 0


class MetricDefUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=80)
    unit: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=20)
    step: float | None = None
    min_value: float | None = None
    max_value: float | None = None
    sort: int | None = None


class MetricDefOut(MetricDefIn):
    model_config = {"from_attributes": True}


class BodyMapShapeIn(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    data: dict


class BodyMapShapeOut(BodyMapShapeIn):
    model_config = {"from_attributes": True}


class WeekDayIn(BaseModel):
    key: str = Field(min_length=2, max_length=3)
    label: str = Field(min_length=1, max_length=40)
    short: str = Field(min_length=1, max_length=8)
    sort: int = 0


class WeekDayOut(WeekDayIn):
    model_config = {"from_attributes": True}


# Motion frame validators — the renderer relies on `pose` being an object of
# 2-tuple [x, y] joint positions. Use generic dicts to keep room for the
# rig extensions (arm2, leg2, etc.).

class ExerciseMotionIn(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    category: str | None = Field(default=None, max_length=60)
    duration: int | None = Field(default=None, ge=100, le=60000)
    bench: bool = False
    floor: bool = False
    rig: dict = Field(default_factory=dict)
    frames: list[dict] = Field(default_factory=list)


class ExerciseMotionUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=60)
    duration: int | None = Field(default=None, ge=100, le=60000)
    bench: bool | None = None
    floor: bool | None = None
    rig: dict | None = None
    frames: list[dict] | None = None


class ExerciseMotionOut(ExerciseMotionIn):
    model_config = {"from_attributes": True}


# ── Trainer / Trainee ────────────────────────────────────────────────────────

class TrainerPublicOut(BaseModel):
    """Public-facing trainer profile shown in the trainer directory."""
    id: int
    username: str
    name: str | None = None
    primary_color: str | None = None
    trainer_bio: str | None = None
    trainer_specialties: list[str] | None = None
    trainer_certifications: str | None = None
    trainer_years_experience: int | None = None
    trainee_count: int = 0
    link_status: str = "none"      # none | pending_trainer | pending_trainee | accepted | self

    model_config = {"from_attributes": True}


class TrainerLinkOut(BaseModel):
    id: int
    role: Literal["trainer", "trainee"]    # current user's role in this link
    other_user_id: int
    other_username: str
    other_name: str | None = None
    other_primary_color: str | None = None
    other_is_trainer: bool = False
    status: Literal["pending_trainer", "pending_trainee", "accepted"]
    initiator_id: int
    note: str | None = None
    created_at: int = 0


class TrainerLinkRequestCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    note: str | None = Field(default=None, max_length=2000)


# ── Regime ───────────────────────────────────────────────────────────────────

RegimeGoal = Literal["strength", "hypertrophy", "endurance", "weight_loss", "general"]
RegimeExperience = Literal["beginner", "intermediate", "advanced"]
RegimeMode = Literal["per_exercise_rpe", "general_rpe", "manual"]


class ExerciseConfigIn(BaseModel):
    """Per-exercise prescription used by the regime editor. Carries the user's
    reference max (max_weight × max_reps), the target effort (rpe), and the
    warmup/working set counts so the active workout can build a complete
    ramp + working block for every exercise on every day. Legacy fields
    (`sets`, `reps`, `weight`) are accepted on input for backward compat with
    older saved regimes but not produced by the new editor."""
    # Target effort for the working sets (1 easy … 10 max). RIR = 10 - rpe.
    rpe: int | None = Field(default=None, ge=1, le=10)
    # Reference max: weight the user can lift for max_reps clean reps. Used to
    # back into an estimated 1RM and then prescribe each working set.
    max_weight: float | None = Field(default=None, ge=0, le=2000)
    max_reps: int | None = Field(default=None, ge=1, le=999)
    # Number of warmup sets to prepend before the working sets. Default 2.
    warmup_sets: int | None = Field(default=None, ge=0, le=10)
    # Working set prescription.
    working_sets: int | None = Field(default=None, ge=1, le=20)
    working_reps: int | None = Field(default=None, ge=1, le=100)
    # Legacy fields kept for backward compat.
    sets: int | None = Field(default=None, ge=1, le=99)
    reps: int | None = Field(default=None, ge=1, le=999)
    weight: float | None = Field(default=None, ge=0, le=2000)


class DayPlanIn(BaseModel):
    focus: str
    exerciseIds: list[str] = Field(default_factory=list)
    enabled: bool = True
    # Per-exercise prescription keyed by exercise id (rpe, max, set counts).
    exerciseConfig: dict[str, ExerciseConfigIn] | None = None


class WeekPlanIn(BaseModel):
    """One week of a multi-week regime. Each week has its own day-by-day
    plan, so RPEs and exercises can differ across weeks."""
    label: str | None = Field(default=None, max_length=80)
    days: dict[str, DayPlanIn] = Field(default_factory=dict)


class RegimeQuestionnaire(BaseModel):
    """Inputs to the rule-based generator."""
    name: str | None = Field(default=None, max_length=120)
    goal: RegimeGoal = "general"
    experience: RegimeExperience = "beginner"
    days_per_week: int = Field(ge=1, le=7, default=3)
    # Days of the week the user is available to train. Empty = no preference,
    # generator falls back to an evenly-spaced schedule.
    available_days: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)        # muscle group ids
    avoid_muscles: list[str] = Field(default_factory=list)      # muscle group ids
    equipment: list[str] = Field(default_factory=list)          # barbell | dumbbell | bodyweight | machine
    include_cardio: bool = False


class RegimeOut(BaseModel):
    id: int
    owner_id: int
    name: str
    description: str | None = None
    goal: str | None = None
    experience: str | None = None
    days_per_week: int = 3
    focus_areas: list[str] = []
    avoid_muscles: list[str] = []
    equipment: list[str] = []
    # Multi-week structure (canonical). Always populated — single-week regimes
    # come back as a one-element list.
    weeks: list[WeekPlanIn] = Field(default_factory=list)
    # Legacy single-week field, populated from weeks[0] so older clients still
    # render the first week without crashing.
    days: dict[str, DayPlanIn] = {}
    mode: RegimeMode | None = None
    general_rpe: int | None = None
    is_template: bool = False
    created_at: int = 0

    model_config = {"from_attributes": True}


class RegimeCreate(BaseModel):
    """Save a generated or manually-built regime. Either `weeks` (preferred)
    or the legacy `days` may be supplied — on save the server normalises both
    so reads always see a populated `weeks` and a `days` mirror of week 1."""
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    goal: RegimeGoal | None = None
    experience: RegimeExperience | None = None
    days_per_week: int = Field(ge=1, le=7, default=3)
    focus_areas: list[str] = Field(default_factory=list)
    avoid_muscles: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    weeks: list[WeekPlanIn] | None = None
    days: dict[str, DayPlanIn] = Field(default_factory=dict)
    mode: RegimeMode | None = None
    general_rpe: int | None = Field(default=None, ge=1, le=10)


class WorkoutTemplateCreate(BaseModel):
    """Save a reusable workout blueprint. `exercise_config` is optional and
    keyed by exercise id — same shape the regime editor uses, so a template can
    carry per-exercise targets (rpe / max / set counts) or just a bare exercise
    list."""
    name: str = Field(min_length=1, max_length=120)
    focus: str | None = Field(default=None, max_length=60)
    exercise_ids: list[str] = Field(default_factory=list, max_length=100)
    exercise_config: dict[str, ExerciseConfigIn] = Field(default_factory=dict)


class WorkoutTemplateOut(BaseModel):
    id: int
    owner_id: int
    name: str
    focus: str | None = None
    exercise_ids: list[str] = Field(default_factory=list)
    exercise_config: dict[str, ExerciseConfigIn] = Field(default_factory=dict)
    created_at: int = 0

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    trainee_id: int
    regime_id: int
    note: str | None = Field(default=None, max_length=2000)


class AssignmentOut(BaseModel):
    id: int
    trainer_id: int
    trainer_username: str
    trainer_name: str | None = None
    trainee_id: int
    trainee_username: str
    trainee_name: str | None = None
    regime_id: int
    regime: RegimeOut
    note: str | None = None
    status: str = "active"
    created_at: int = 0


# ── Chat ─────────────────────────────────────────────────────────────────────

class ConversationOut(BaseModel):
    id: int
    kind: Literal["dm", "coach"]
    other_user_id: int
    other_username: str
    other_name: str | None = None
    other_primary_color: str | None = None
    other_is_trainer: bool = False
    last_message_at: int = 0
    last_message_preview: str | None = None
    unread_count: int = 0
    created_at: int = 0


class ConversationCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_username: str
    sender_name: str | None = None
    body: str
    created_at: int = 0

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body")
    @classmethod
    def _strip_body(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v
