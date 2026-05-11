from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String(100), nullable=True)
    email = Column(String(254), unique=True, nullable=True, index=True)
    gender = Column(String(20), nullable=True)


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(String, primary_key=True)       # client-generated UUID string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    date = Column(String, nullable=False)        # ISO date string
    duration = Column(Integer, nullable=False)   # milliseconds
    focus = Column(String, nullable=True)
    exercises = Column(JSONB, nullable=False, default=list)


class PersonalRecord(Base):
    __tablename__ = "personal_records"
    __table_args__ = (UniqueConstraint("user_id", "exercise_id", name="uq_pr_user_exercise"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    exercise_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    weight = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    date = Column(String, nullable=False)        # ISO date string
    is_cardio = Column(Boolean, nullable=False, default=False)


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(String, primary_key=True)        # matches the short key e.g. "bench"
    name = Column(String(120), nullable=False)
    category = Column(String(50), nullable=False)
    type = Column(String(20), nullable=False)     # strength | cardio | timed
    primary_muscles = Column(JSONB, nullable=False, default=list)
    secondary_muscles = Column(JSONB, nullable=False, default=list)


class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    metric_type = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    date = Column(String, nullable=False)        # ISO date string YYYY-MM-DD
    note = Column(Text, nullable=True)
