import type { ExerciseConfig } from "../types";

/** localStorage key holding the user's last-used per-exercise prescribe
 * configs. Keyed by exercise id; values mirror the ExerciseConfig shape so
 * they round-trip directly into prescribeExercise(). */
const KEY = "gamgee_prescribe_configs";

export type PrescribeConfigMap = Record<string, ExerciseConfig>;

export function loadPrescribeConfigs(): PrescribeConfigMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as PrescribeConfigMap : {};
  } catch {
    return {};
  }
}

export function savePrescribeConfigs(map: PrescribeConfigMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota exceeded or storage disabled — silently ignore */
  }
}

/** Merge a single-workout config map into the persisted store so future
 * workouts pick up the user's tuned numbers as defaults. */
export function mergePrescribeConfigs(updates: PrescribeConfigMap): PrescribeConfigMap {
  const current = loadPrescribeConfigs();
  const next: PrescribeConfigMap = { ...current };
  for (const [exId, cfg] of Object.entries(updates)) {
    next[exId] = { ...(current[exId] ?? {}), ...cfg };
  }
  savePrescribeConfigs(next);
  return next;
}
