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


# ── Editable content ──────────────────────────────────────────────────────────
# These tables hold data that used to live in `frontend/src/data/*.ts`. Public
# GETs serve every client; writes are admin-only. Each table has a stable
# string id so the seeder can upsert without disturbing user-edited rows.

class Quote(Base):
    """Motivational quotes shown on the workout-start screen.
    `bucket` groups quotes by tone: bro | grl | pro | hero_bro | hero_grl."""
    __tablename__ = "quotes"
    __table_args__ = (Index("ix_quotes_bucket_sort", "bucket", "sort"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    bucket = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    source = Column(String(120), nullable=True)        # PRO_QUOTES author; null otherwise
    line2 = Column(String(120), nullable=True)         # second line for hero calls
    sort = Column(Integer, nullable=False, default=0)


class Tip(Base):
    """Coaching tips shown in the Coach tab."""
    __tablename__ = "tips"

    id = Column(String, primary_key=True)              # e.g. "rest_between_sets"
    icon = Column(String(40), nullable=False)          # lucide icon name
    title = Column(String(120), nullable=False)
    body = Column(Text, nullable=False)
    body_bro = Column(Text, nullable=True)
    body_grl = Column(Text, nullable=True)
    sort = Column(Integer, nullable=False, default=0)


class Focus(Base):
    """Workout focus presets (push/pull/legs/etc.)."""
    __tablename__ = "focuses"

    id = Column(String, primary_key=True)
    name = Column(String(80), nullable=False)
    icon = Column(String(40), nullable=False)
    description = Column(String(200), nullable=False, default="")
    exercise_ids = Column(JSONB, nullable=False, default=list)
    sort = Column(Integer, nullable=False, default=0)


class Muscle(Base):
    """Anatomy lookup — display name + muscle group."""
    __tablename__ = "muscles"

    id = Column(String, primary_key=True)              # e.g. "upper_pec"
    name = Column(String(80), nullable=False)
    muscle_group = Column(String(60), nullable=False)
    sort = Column(Integer, nullable=False, default=0)


class Stretch(Base):
    """Library of stretches keyed by muscle group."""
    __tablename__ = "stretches"
    __table_args__ = (Index("ix_stretches_group_sort", "muscle_group", "sort"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    muscle_group = Column(String(60), nullable=False)
    name = Column(String(120), nullable=False)
    duration = Column(Integer, nullable=False)         # seconds
    per_side = Column(Boolean, nullable=False, default=False)
    cue = Column(Text, nullable=False)
    sort = Column(Integer, nullable=False, default=0)


class ExerciseInfo(Base):
    """How-to text for each exercise (setup / execute / cue)."""
    __tablename__ = "exercise_info"

    exercise_id = Column(String, ForeignKey("exercises.id"), primary_key=True)
    setup = Column(Text, nullable=False)
    execute = Column(Text, nullable=False)
    cue = Column(Text, nullable=False)


class MetricDef(Base):
    """Body-metric definitions (weight, body fat, etc.)."""
    __tablename__ = "metric_defs"

    id = Column(String, primary_key=True)
    label = Column(String(80), nullable=False)
    unit = Column(String(20), nullable=False)
    color = Column(String(20), nullable=False)
    step = Column(Float, nullable=False, default=1.0)
    min_value = Column(Float, nullable=False, default=0)
    max_value = Column(Float, nullable=False, default=999)
    sort = Column(Integer, nullable=False, default=0)


class BodyMapShape(Base):
    """SVG path/ellipse data for the anatomical body map. `data` is a JSONB
    object whose shape mirrors `MuscleShape` in frontend types."""
    __tablename__ = "bodymap_shapes"

    id = Column(String, primary_key=True)
    data = Column(JSONB, nullable=False)


class WeekDay(Base):
    """Week-day metadata (monday/tuesday/..). Lets the labels be edited
    without redeploying."""
    __tablename__ = "week_days"

    key = Column(String(3), primary_key=True)          # mon | tue | ...
    label = Column(String(40), nullable=False)
    short = Column(String(8), nullable=False)
    sort = Column(Integer, nullable=False, default=0)


class ExerciseMotion(Base):
    """Stick-figure animation keyframes for an exercise. `frames` is a JSONB
    list of `{t, pose, bar?, parts?}`. `rig` controls which body parts the
    renderer draws (feet style, two-arm/leg mirroring, etc.)."""
    __tablename__ = "exercise_motions"

    exercise_id = Column(String, primary_key=True)     # matches Exercise.id
    name = Column(String(120), nullable=False)
    category = Column(String(60), nullable=True)
    duration = Column(Integer, nullable=True)           # ms per cycle
    bench = Column(Boolean, nullable=False, default=False)
    floor = Column(Boolean, nullable=False, default=False)
    rig = Column(JSONB, nullable=False, default=dict)
    frames = Column(JSONB, nullable=False, default=list)
