import type { LucideIcon } from "lucide-react";

export type MuscleLevel = "primary" | "secondary";
export type ActiveMuscles = Record<string, MuscleLevel>;
export type ExerciseType = "strength" | "timed" | "cardio";

export interface MuscleInfo { n: string; g: string; }
export interface ExerciseDef { id: string; name: string; type: ExerciseType; cat?: string; }
export interface SuggExercise extends ExerciseDef { isFocus?: boolean; score?: number; newP?: string[]; ovP?: string[]; newS?: string[]; }
export interface FocusDef { name: string; icon: LucideIcon; desc: string; exIds: string[]; }
export interface WorkoutSet { weight: string; reps: string; done: boolean; }
export interface WorkoutExercise extends ExerciseDef { uid: string; sets: WorkoutSet[]; }
export type CardioTiming = "none" | "before" | "after" | "both";
export interface CardioSlot { exId: string; minutes: number; }
export interface CardioPlan { timing: CardioTiming; before: CardioSlot | null; after: CardioSlot | null; }
export interface WorkoutSession { id: string; date: string; duration: number; focus?: string | null; exercises: WorkoutExercise[]; }
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
export interface DayPlan { focus: string; exerciseIds: string[]; enabled: boolean; }
export type WeeklyPlan = Partial<Record<WeekPlanDay, DayPlan>>;
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

export interface RegimeQuestionnaire {
  name?: string;
  goal: RegimeGoal;
  experience: RegimeExperience;
  days_per_week: number;
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
  days: Record<string, DayPlan>;
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
  days: Record<string, DayPlan>;
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
