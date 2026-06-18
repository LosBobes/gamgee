// Subset of the backend API shapes the mobile app consumes. Mirrors
// backend/app/schemas.py — keep in sync when those change.

export interface User {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  gender: string | null;
  bodyweight_kg: number | null;
  height_cm: number | null;
  primary_color: string | null;
  progression_speed: string | null;
  is_admin: boolean;
  is_verified: boolean;
  is_trainer: boolean;
}

export type NotificationKind =
  | "buddy_request"
  | "buddy_accepted"
  | "workout_done"
  | "pr_set"
  | "motivate"
  | "live_started"
  | "live_joined"
  | "live_ended"
  | "chat_message"
  | "trainer_link_request"
  | "trainer_link_accepted"
  | "regime_assigned";

export interface AppNotification {
  id: number;
  kind: NotificationKind | string;
  sender_user_id: number | null;
  sender_username: string | null;
  sender_name: string | null;
  message: string;
  payload: unknown;
  read: boolean;
  created_at: number; // epoch ms
}

export interface WorkoutExercise {
  id: string;
  name?: string;
  sets?: { weight?: number; reps?: number }[];
}

export interface WorkoutSession {
  id: string;
  date: number; // epoch ms
  duration: number; // ms
  exercises: WorkoutExercise[];
  rpe?: number | null;
}
