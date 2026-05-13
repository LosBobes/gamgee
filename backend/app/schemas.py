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
    primary_color: str | None = None
    is_admin: bool = False
    is_verified: bool = False

    model_config = {"from_attributes": True}


class UserPreferences(BaseModel):
    primary_color: str | None = None

    @field_validator("primary_color")
    @classmethod
    def _valid_hex(cls, v: str | None) -> str | None:
        if v is not None and not _HEX_COLOR_RE.match(v):
            raise ValueError("primary_color must be a valid #RRGGBB hex color")
        return v


class UserProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str | None = None

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
    primary_muscles: list[str] = []
    secondary_muscles: list[str] = []

    model_config = {"from_attributes": True}


class ExerciseCreate(BaseModel):
    id: str
    name: str
    category: str
    type: str = "strength"
    primary_muscles: list[str] = []
    secondary_muscles: list[str] = []


class ExerciseUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    type: str | None = None
    primary_muscles: list[str] | None = None
    secondary_muscles: list[str] | None = None


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
    participants: list[LiveParticipantOut] = []


class LiveProgressUpdate(BaseModel):
    sets_done: int = Field(ge=0, le=10000)


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

