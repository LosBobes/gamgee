from sqlalchemy import Column, DateTime, Integer, String, Text, Float, Boolean, ForeignKey, UniqueConstraint, BigInteger, Index
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
    primary_color = Column(String(7), nullable=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)


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


# ── Buddy system ──────────────────────────────────────────────────────────────

class Buddy(Base):
    """Directed friendship rows. Two rows per accepted buddy pair (one each
    direction) so simple `WHERE user_id = X` queries return every buddy."""
    __tablename__ = "buddies"
    __table_args__ = (
        UniqueConstraint("user_id", "buddy_user_id", name="uq_buddy_pair"),
        Index("ix_buddies_user_status", "user_id", "status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    buddy_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # "pending_out" — this user sent a request; "pending_in" — received one;
    # "accepted" — both rows flip to accepted when the recipient confirms.
    status = Column(String(20), nullable=False, default="pending_out")
    notify_workout = Column(Boolean, nullable=False, default=True)
    notify_pr = Column(Boolean, nullable=False, default=True)
    notify_motivate = Column(Boolean, nullable=False, default=True)
    notify_live = Column(Boolean, nullable=False, default=True)
    created_at = Column(BigInteger, nullable=False, default=0)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notif_user_read", "user_id", "read"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # "buddy_request" | "buddy_accepted" | "workout_done" | "pr_set"
    # | "motivate" | "live_started" | "live_joined" | "live_ended"
    kind = Column(String(30), nullable=False)
    sender_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=True)
    read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(BigInteger, nullable=False, default=0, index=True)


class LiveSession(Base):
    """Real-time co-working-out session. Owner broadcasts; buddies can join
    and contribute set counts. Lifecycle: active -> ended."""
    __tablename__ = "live_sessions"

    id = Column(String, primary_key=True)                # client-generated UUID
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    focus = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active | ended
    started_at = Column(BigInteger, nullable=False, default=0)
    ended_at = Column(BigInteger, nullable=True)
    # Owner-side counters updated as workout progresses
    owner_sets_done = Column(Integer, nullable=False, default=0)


class LiveParticipant(Base):
    __tablename__ = "live_participants"
    __table_args__ = (
        UniqueConstraint("session_id", "user_id", name="uq_live_participant"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("live_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sets_done = Column(Integer, nullable=False, default=0)
    joined_at = Column(BigInteger, nullable=False, default=0)
    last_seen = Column(BigInteger, nullable=False, default=0)


# ── Feedback ──────────────────────────────────────────────────────────────────

class Feedback(Base):
    """User-submitted feedback, bug reports, or feature requests.
    Visible only to admins via /api/admin/feedback."""
    __tablename__ = "feedback"
    __table_args__ = (
        Index("ix_feedback_status_created", "status", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    # "bug" | "feature" | "general"
    kind = Column(String(20), nullable=False, default="general")
    message = Column(Text, nullable=False)
    # "open" | "resolved" | "dismissed"
    status = Column(String(20), nullable=False, default="open", index=True)
    created_at = Column(BigInteger, nullable=False, default=0)
    resolved_at = Column(BigInteger, nullable=True)
