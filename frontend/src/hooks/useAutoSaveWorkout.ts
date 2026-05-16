import { useEffect, useRef } from "react";
import type { WorkoutExercise } from "../types";

interface Snapshot {
  active: boolean;
  startTs: number | null;
  focus: string | null;
  exercises: WorkoutExercise[];
  savedAt: number;
}

const KEY = "gamgee_active_workout_snapshot";

/**
 * Persist the in-progress workout to localStorage on every change so a
 * page refresh / crash doesn't lose data. Restored separately in WorkoutTracker
 * via `loadSavedWorkout()`.
 */
export function useAutoSaveWorkout(
  active: boolean,
  startTs: number | null,
  focus: string | null,
  exercises: WorkoutExercise[],
) {
  // Debounce writes — typing into a weight field shouldn't cause a write per
  // keystroke; 600 ms is invisible to the user and saves a couple orders of
  // magnitude of localStorage churn.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    timer.current = window.setTimeout(() => {
      if (!active) {
        localStorage.removeItem(KEY);
        return;
      }
      const snap: Snapshot = {
        active,
        startTs,
        focus,
        exercises,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(snap));
      } catch {
        // localStorage full / disabled — silent.
      }
    }, 600);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [active, startTs, focus, exercises]);
}

export function loadSavedWorkout(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    // Stale (>3 days old) — drop it. The user probably forgot.
    if (Date.now() - (parsed.savedAt || 0) > 3 * 24 * 3600 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedWorkout(): void {
  localStorage.removeItem(KEY);
}
