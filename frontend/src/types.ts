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
  | "live_started" | "live_joined" | "live_ended";
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
  participants: LiveParticipant[];
}
// activeMuscles removed — SuggCard uses pre-computed newP/ovP/newS from SuggExercise
export interface SuggCardProps { ex: SuggExercise; isAdded: boolean; onAdd: () => void; onRemove: () => void; onHover: () => void; onLeave: () => void; }
