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
    # "slow" | "moderate" | "fast" — scales how aggressively the analyzer
    # recommends weight jumps. Null is treated as "moderate".
    progression_speed = Column(String(20), nullable=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    # Trainer profile: populated when a user signs up through the trainer flow.
    is_trainer = Column(Boolean, nullable=False, default=False)
    trainer_bio = Column(Text, nullable=True)
    trainer_specialties = Column(JSONB, nullable=True)        # list[str]
    trainer_certifications = Column(Text, nullable=True)
    trainer_years_experience = Column(Integer, nullable=True)
    # Global notification preferences. Apply as a master switch on top of the
    # per-buddy `Buddy.notify_*` flags: if either is off, no notification.
    notify_workout = Column(Boolean, nullable=False, default=True)
    notify_pr = Column(Boolean, nullable=False, default=True)
    notify_motivate = Column(Boolean, nullable=False, default=True)
    notify_live = Column(Boolean, nullable=False, default=True)
    # Rest-timer presets surfaced after a set is checked off. Null = client
    # falls back to 60 / 90 / 180s; range-validated by the schema layer.
    rest_short_seconds = Column(Integer, nullable=True)
    rest_medium_seconds = Column(Integer, nullable=True)
    rest_long_seconds = Column(Integer, nullable=True)
    # RPE→step multiplier table — keys "1".."10", values 0..5. Null falls back
    # to the client default. Per-exercise overrides live under
    # rpe_multipliers_by_exercise, keyed by Exercise.id (same keys per ex).
    rpe_multipliers = Column(JSONB, nullable=True)
    rpe_multipliers_by_exercise = Column(JSONB, nullable=True)
    # Master switch for the whole RPE / per-exercise effort feature. When
    # off, the inline rating chips, post-session prompt, and progression
    # scaling all disappear and analyzeEx uses the plain progression-speed
    # step. Existing users default to True so behaviour is unchanged.
    rpe_enabled = Column(Boolean, nullable=False, default=True)


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
    # Post-session perceived effort 1..10. Drives the next session's
    # progression multiplier — null means we fall back to the neutral step.
    rpe = Column(Integer, nullable=True)


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
    # One- or two-sentence summary of the lift. Distinct from ExerciseInfo
    # (setup / execute / cue), which is the step-by-step coaching script.
    description = Column(Text, nullable=True)


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
    # Rich live data — exposed to peers (current + last) and trainers (set-by-set).
    current_exercise_id = Column(String, nullable=True)
    current_exercise_name = Column(String, nullable=True)
    current_set_index = Column(Integer, nullable=True)
    last_weight = Column(Float, nullable=True)
    last_reps = Column(Integer, nullable=True)
    total_sets_planned = Column(Integer, nullable=True)
    total_exercises_planned = Column(Integer, nullable=True)


class LiveSetEvent(Base):
    """Per-set events streamed to trainers for set-by-set live observation."""
    __tablename__ = "live_set_events"
    __table_args__ = (
        Index("ix_live_set_events_session_ts", "session_id", "ts"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("live_sessions.id"), nullable=False, index=True)
    exercise_id = Column(String, nullable=False)
    exercise_name = Column(String, nullable=False)
    set_index = Column(Integer, nullable=False, default=0)
    weight = Column(Float, nullable=True)
    reps = Column(Integer, nullable=True)
    ts = Column(BigInteger, nullable=False, default=0)


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


class PushSubscription(Base):
    """Web Push API endpoint registered by a browser. One row per user/device.
    Endpoint URL is unique within a user — duplicate subscribes upsert."""
    __tablename__ = "push_subscriptions"
    __table_args__ = (
        UniqueConstraint("user_id", "endpoint", name="uq_push_user_endpoint"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(BigInteger, nullable=False, default=0)


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


# ── Trainer / Trainee links ──────────────────────────────────────────────────

class TrainerLink(Base):
    """Asymmetric link from a trainer to a trainee. Single-row representation
    (unlike Buddy): the trainer_id and trainee_id columns capture the role.
    Either side can initiate; the other side accepts."""
    __tablename__ = "trainer_links"
    __table_args__ = (
        UniqueConstraint("trainer_id", "trainee_id", name="uq_trainer_link_pair"),
        Index("ix_trainer_links_trainer", "trainer_id", "status"),
        Index("ix_trainer_links_trainee", "trainee_id", "status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # "pending_trainer" — trainer invited a user; awaits the trainee accepting.
    # "pending_trainee" — a user asked a trainer to coach them; awaits the
    # trainer accepting.  "accepted" — both sides agreed.
    status = Column(String(20), nullable=False, default="pending_trainer")
    initiator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(BigInteger, nullable=False, default=0)


# ── Regimes / Assignments ────────────────────────────────────────────────────

class Regime(Base):
    """A multi-day workout plan: a `days` JSON object keyed by mon..sun whose
    values are `{focus, exerciseIds, enabled}` records. `goal`, `focus_areas`,
    and `avoid_muscles` are stored alongside so the generator can be re-run."""
    __tablename__ = "regimes"
    __table_args__ = (
        Index("ix_regimes_owner", "owner_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(String(40), nullable=True)             # strength | hypertrophy | endurance | weight_loss | general
    experience = Column(String(20), nullable=True)       # beginner | intermediate | advanced
    days_per_week = Column(Integer, nullable=False, default=3)
    focus_areas = Column(JSONB, nullable=False, default=list)     # list[str] of muscle groups
    avoid_muscles = Column(JSONB, nullable=False, default=list)   # list[str] of muscle groups to skip
    equipment = Column(JSONB, nullable=False, default=list)       # list[str]: barbell|dumbbell|bodyweight|machine
    days = Column(JSONB, nullable=False, default=dict)            # mon..sun -> DayPlan
    is_template = Column(Boolean, nullable=False, default=False)
    created_at = Column(BigInteger, nullable=False, default=0)


class RegimeAssignment(Base):
    """A trainer-assigned regime delivered to a trainee. The trainee can apply
    it to their weekly plan; the trainer can revoke or replace it."""
    __tablename__ = "regime_assignments"
    __table_args__ = (
        Index("ix_assignments_trainee", "trainee_id", "status"),
        Index("ix_assignments_trainer", "trainer_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    regime_id = Column(Integer, ForeignKey("regimes.id"), nullable=False)
    note = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active | accepted | revoked
    created_at = Column(BigInteger, nullable=False, default=0)


# ── Chat ─────────────────────────────────────────────────────────────────────

class Conversation(Base):
    """Direct 1:1 chat between two users.

    Stored as an ordered pair (user_low < user_high) so a single row covers
    each peer relationship. `kind` distinguishes a coaching channel (a
    trainer ↔ trainee chat) from a generic peer DM so the UI can label them
    differently and so trainers don't see them in their general-DM list."""
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("user_low", "user_high", "kind", name="uq_conversation_pair"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_low = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_high = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(20), nullable=False, default="dm")       # dm | coach
    last_message_at = Column(BigInteger, nullable=False, default=0)
    created_at = Column(BigInteger, nullable=False, default=0)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conv_ts", "conversation_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(BigInteger, nullable=False, default=0)


class MessageRead(Base):
    """Tracks per-user read position so we can show unread badges per
    conversation without scanning every message."""
    __tablename__ = "message_reads"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_message_read"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    last_read_at = Column(BigInteger, nullable=False, default=0)


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
