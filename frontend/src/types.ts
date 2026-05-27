import type { LucideIcon } from "lucide-react";

export type MuscleLevel = "primary" | "secondary";
export type ActiveMuscles = Record<string, MuscleLevel>;
export type ExerciseType = "strength" | "timed" | "cardio";

export interface MuscleInfo { n: string; g: string; }
export interface ExerciseDef { id: string; name: string; type: ExerciseType; cat?: string; is_assisted?: boolean; }
export interface SuggExercise extends ExerciseDef { isFocus?: boolean; score?: number; newP?: string[]; ovP?: string[]; newS?: string[]; }
export interface FocusDef { name: string; icon: LucideIcon; desc: string; exIds: string[]; }
/** A single set in an active workout.
 *
 * `prefilled` marks values that came from a "reapply last session" / regime
 * prescription / progression suggestion rather than typed by the user. Sets
 * that are still `prefilled` get overwritten when the user edits an earlier
 * set so the suggested rep/load chain stays consistent; the moment the user
 * touches a set's number, that set flips to `prefilled: false` and stops
 * getting auto-overwritten.
 *
 * `is_warmup` distinguishes warmup ramps from working sets — populated by the
 * regime-driven prescription when a regime exposes `warmup_sets` for an
 * exercise. The active workout renders warmup sets visually distinct and the
 * post-session save persists the flag so PR detection can ignore them.
 *
 * `rpe` is the user's perceived effort for *this* set (1 easy … 10 max) —
 * collected inline after the set is checked done. Optional; warmup sets and
 * un-rated working sets stay null. The analyzer prefers per-set RPE (max
 * across the working sets) over the post-session overall RPE when scaling the
 * next session's weight jump. */
export interface WorkoutSet {
  weight: string;
  reps: string;
  done: boolean;
  prefilled?: boolean;
  is_warmup?: boolean;
  rpe?: number | null;
}
export interface WorkoutExercise extends ExerciseDef { uid: string; sets: WorkoutSet[]; }
/** `null` = the user hasn't picked yet (default when entering the cardio screen).
 *  `"none"` = the user explicitly chose to skip cardio. */
export type CardioTiming = "none" | "before" | "after" | "both" | null;
export interface CardioSlot { exId: string; minutes: number; }
export interface CardioPlan { timing: CardioTiming; before: CardioSlot | null; after: CardioSlot | null; }
export interface WorkoutSession { id: string; date: string; duration: number; focus?: string | null; exercises: WorkoutExercise[]; rpe?: number | null; }
export interface PersonalRecord { name: string; weight: number; reps: number; date: string; isCardio?: boolean; }
export interface PersonalRecordAPI extends PersonalRecord { exercise_id: string; }
export type PRDict = Record<string, PersonalRecord>;
export interface StatusDef { label: string; color: string; bg: string; }
export interface MuscleDef { mid: string; cx: number; cy: number; rx: number; ry: number; rotate?: number; }
export interface MusclePathDef { mid: string; d: string; }
export type MuscleShape = MuscleDef | MusclePathDef;
export interface CoachingTip { icon: LucideIcon; title: string; body: string; bodyBro?: string; bodyGrl?: string; }
export interface CustomFocusDef { id: string; name: string; iconName: string; desc: string; }
export interface CustomExerciseDef { id: string; name: string; type: ExerciseType; cat: string; primary: string[]; secondary: string[]; instructions?: string; }
export interface BodyMetric { id: number; metric_type: string; value: number; unit: string; date: string; note?: string | null; }
export type WeekPlanDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** Per-exercise prescription for a specific day inside a regime.
 *
 * The new builder captures: the user's reference max (max_weight × max_reps),
 * the target effort (rpe, 1–10) for the working sets, the warmup-set count,
 * the working-set count, and the target reps for each working set. The active
 * workout uses these to lay out a warmup ramp then prescribe the working
 * weight via an Epley-derived 1RM × (1 - 0.0333 × (target_reps + RIR)) curve.
 *
 * Legacy fields (`sets`, `reps`, `weight`) are still accepted on read so older
 * saved regimes don't lose information — they're treated as raw working
 * targets when the new fields are absent. */
export interface ExerciseConfig {
  /** Target effort for the working sets (1 easy … 10 max). RIR = 10 - rpe. */
  rpe?: number;
  /** Reference max — weight the user can lift for max_reps clean reps. */
  max_weight?: number;
  /** Reps the user can hit at max_weight (e.g. 5 if it's a 5RM). */
  max_reps?: number;
  /** Number of warmup sets prepended before the working sets. */
  warmup_sets?: number;
  /** Number of working sets. */
  working_sets?: number;
  /** Target reps per working set. */
  working_reps?: number;
  /** Legacy single-block fields, kept for backward compat with older regimes. */
  sets?: number;
  reps?: number;
  weight?: number;
}
export interface DayPlan {
  focus: string;
  exerciseIds: string[];
  enabled: boolean;
  /** Per-exercise prescription keyed by exercise id. */
  exerciseConfig?: Record<string, ExerciseConfig>;
  /** Legacy regime-mode marker carried over from older saved regimes. The
   * active workout no longer branches on this — every exercise just reads its
   * own ExerciseConfig — but the field is preserved so a re-save round-trips. */
  mode?: RegimeMode | null;
  general_rpe?: number | null;
}
export interface WeekPlan {
  label?: string | null;
  days: Partial<Record<WeekPlanDay, DayPlan>>;
}
/** Applied weekly plan. Multi-week regimes store every week along with the
 * user's current position so the active workout can prescribe the right
 * effort/exercises automatically. Single-week applications keep `weeks: null`
 * and use the flat day map as before. */
export type WeeklyPlan = Partial<Record<WeekPlanDay, DayPlan>> & {
  weeks?: WeekPlan[] | null;
  current_week_index?: number | null;
};
export type ProgressionSpeed = "slow" | "moderate" | "fast";
export interface RestPrefs { short: number; medium: number; long: number; }
export const DEFAULT_REST_PREFS: RestPrefs = { short: 60, medium: 90, long: 180 };

/** Visual effect played during workout-wizard step transitions so the
 * delay between tap and next step feels intentional. `none` skips the fx
 * entirely for users who want a quieter UI. */
export type WizardTransitionStyle = "earthquake" | "none";
export const DEFAULT_WIZARD_TRANSITION: WizardTransitionStyle = "none";

export interface MetricDef { id: string; label: string; unit: string; color: string; step: number; min: number; max: number; }
export interface BodyMapProps { active?: ActiveMuscles; preview?: ActiveMuscles; focusMuscles?: ActiveMuscles; onHoverMuscle?: (mid: string | null) => void; }

// ── Buddy system ────────────────────────────────────────────────────────────
export type BuddyStatus = "pending_out" | "pending_in" | "accepted";
export interface Buddy {
  id: number;
  user_id: number;
  username: string;
  name: string | null;
  primary_color: string | null;
  status: BuddyStatus;
  notify_workout: boolean;
  notify_pr: boolean;
  notify_motivate: boolean;
  notify_live: boolean;
}
export interface UserSearchResult {
  id: number;
  username: string;
  name: string | null;
  primary_color: string | null;
  relationship: "none" | "accepted" | "pending_out" | "pending_in" | "self";
}
export interface ScoreboardRow {
  user_id: number;
  username: string;
  name: string | null;
  primary_color: string | null;
  is_self: boolean;
  workouts_week: number;
  workouts_month: number;
  workouts_total: number;
  sets_week: number;
  volume_week: number;
  pr_count: number;
  last_workout: string | null;
  current_streak: number;
}
export interface MotivatePreset { id: string; message: string; }

export interface PublicProfileMemory {
  id: number;
  sender_user_id: number | null;
  sender_username: string | null;
  sender_name: string | null;
  sender_primary_color: string | null;
  message: string;
  created_at: number;
}
export interface PublicProfile {
  user_id: number;
  username: string;
  name: string | null;
  primary_color: string | null;
  gender: string | null;
  is_trainer: boolean;
  is_self: boolean;
  relationship: "self" | "accepted" | "none";
  member_since: string | null;
  workouts_total: number;
  pr_count: number;
  current_streak: number;
  last_workout: string | null;
  top_focuses: string[];
  memories: PublicProfileMemory[];
}

export type NotificationKind =
  | "buddy_request" | "buddy_accepted"
  | "workout_done" | "pr_set"
  | "motivate"
  | "live_started" | "live_joined" | "live_ended"
  | "chat_message" | "trainer_link_request" | "trainer_link_accepted" | "regime_assigned";
export interface AppNotification {
  id: number;
  kind: NotificationKind;
  sender_user_id: number | null;
  sender_username: string | null;
  sender_name: string | null;
  message: string;
  payload: unknown;
  read: boolean;
  created_at: number;
}

export interface LiveParticipant {
  user_id: number;
  username: string;
  name: string | null;
  primary_color: string | null;
  sets_done: number;
  joined_at: number;
  last_seen: number;
}
export interface LiveSession {
  id: string;
  owner_id: number;
  owner_username: string;
  owner_name: string | null;
  owner_primary_color: string | null;
  focus: string | null;
  note: string | null;
  status: "active" | "ended";
  started_at: number;
  ended_at: number | null;
  owner_sets_done: number;
  current_exercise_id?: string | null;
  current_exercise_name?: string | null;
  current_set_index?: number | null;
  last_weight?: number | null;
  last_reps?: number | null;
  total_sets_planned?: number | null;
  total_exercises_planned?: number | null;
  can_see_set_timeline?: boolean;
  participants: LiveParticipant[];
}

export interface LiveSetEvent {
  id: number;
  exercise_id: string;
  exercise_name: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  ts: number;
}

// ── Trainer / Regime / Chat ────────────────────────────────────────────────
export interface TrainerPublic {
  id: number;
  username: string;
  name: string | null;
  primary_color: string | null;
  trainer_bio: string | null;
  trainer_specialties: string[] | null;
  trainer_certifications: string | null;
  trainer_years_experience: number | null;
  trainee_count: number;
  link_status: "none" | "pending_trainer" | "pending_trainee" | "accepted" | "self";
}

export type TrainerLinkStatus = "pending_trainer" | "pending_trainee" | "accepted";
export interface TrainerLink {
  id: number;
  role: "trainer" | "trainee";
  other_user_id: number;
  other_username: string;
  other_name: string | null;
  other_primary_color: string | null;
  other_is_trainer: boolean;
  status: TrainerLinkStatus;
  initiator_id: number;
  note: string | null;
  created_at: number;
}

export type RegimeGoal = "strength" | "hypertrophy" | "endurance" | "weight_loss" | "general";
export type RegimeExperience = "beginner" | "intermediate" | "advanced";
/** How a regime drives weight/reps for scheduled workouts.
 *  - `per_exercise_rpe`: each exercise has its own target RPE (1–10).
 *  - `general_rpe`:     one RPE for the whole regime; auto-adjusts every lift.
 *  - `manual`:          explicit sets/reps/weight per exercise; no auto-progression.
 */
export type RegimeMode = "per_exercise_rpe" | "general_rpe" | "manual";

export interface RegimeQuestionnaire {
  name?: string;
  goal: RegimeGoal;
  experience: RegimeExperience;
  days_per_week: number;
  available_days: WeekPlanDay[];
  focus_areas: string[];
  avoid_muscles: string[];
  equipment: string[];
  include_cardio: boolean;
}

export interface Regime {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  goal: RegimeGoal | null;
  experience: RegimeExperience | null;
  days_per_week: number;
  focus_areas: string[];
  avoid_muscles: string[];
  equipment: string[];
  /** Multi-week structure (canonical). Single-week regimes come back as a
   * one-element list. */
  weeks: WeekPlan[];
  /** Mirror of weeks[0].days for backward-compat with any consumer that
   * hasn't been ported to multi-week. */
  days: Record<string, DayPlan>;
  mode?: RegimeMode | null;
  general_rpe?: number | null;
  is_template: boolean;
  created_at: number;
}

export interface RegimeDraft {
  name: string;
  description: string | null;
  goal: RegimeGoal | null;
  experience: RegimeExperience | null;
  days_per_week: number;
  focus_areas: string[];
  avoid_muscles: string[];
  equipment: string[];
  weeks: WeekPlan[];
  days: Record<string, DayPlan>;
  mode?: RegimeMode | null;
  general_rpe?: number | null;
}

export interface RegimeAssignment {
  id: number;
  trainer_id: number;
  trainer_username: string;
  trainer_name: string | null;
  trainee_id: number;
  trainee_username: string;
  trainee_name: string | null;
  regime_id: number;
  regime: Regime;
  note: string | null;
  status: "active" | "accepted" | "revoked";
  created_at: number;
}

export type ChatKind = "dm" | "coach";
export interface Conversation {
  id: number;
  kind: ChatKind;
  other_user_id: number;
  other_username: string;
  other_name: string | null;
  other_primary_color: string | null;
  other_is_trainer: boolean;
  last_message_at: number;
  last_message_preview: string | null;
  unread_count: number;
  created_at: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  sender_name: string | null;
  body: string;
  created_at: number;
}
// activeMuscles removed — SuggCard uses pre-computed newP/ovP/newS from SuggExercise
export interface SuggCardProps { ex: SuggExercise; isAdded: boolean; onAdd: () => void; onRemove: () => void; onHover: () => void; onLeave: () => void; }
