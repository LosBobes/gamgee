import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .password_policy import validate_password

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]+$")

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

    model_config = {"from_attributes": True}


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

