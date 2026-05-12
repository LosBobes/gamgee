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
export interface CoachingTip { icon: LucideIcon; title: string; body: string; bodyBro?: string; }
export interface CustomFocusDef { id: string; name: string; iconName: string; desc: string; }
export interface CustomExerciseDef { id: string; name: string; type: ExerciseType; cat: string; primary: string[]; secondary: string[]; }
export interface BodyMetric { id: number; metric_type: string; value: number; unit: string; date: string; note?: string | null; }
export type WeekPlanDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export interface DayPlan { focus: string; exerciseIds: string[]; enabled: boolean; }
export type WeeklyPlan = Partial<Record<WeekPlanDay, DayPlan>>;
export interface MetricDef { id: string; label: string; unit: string; color: string; step: number; min: number; max: number; }
export interface BodyMapProps { active?: ActiveMuscles; preview?: ActiveMuscles; focusMuscles?: ActiveMuscles; onHoverMuscle?: (mid: string | null) => void; }
// activeMuscles removed — SuggCard uses pre-computed newP/ovP/newS from SuggExercise
export interface SuggCardProps { ex: SuggExercise; isAdded: boolean; onAdd: () => void; onRemove: () => void; onHover: () => void; onLeave: () => void; }
