from pydantic import BaseModel
from typing import Any


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
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


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

