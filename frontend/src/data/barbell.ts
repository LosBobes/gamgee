// Standard Olympic barbell. Gamgee's UI is metric only ("WEIGHT (kg)"),
// so we don't carry a unit here.
export const BAR_WEIGHT_KG = 20;

// Exercises where "do you count the bar?" actually means something — i.e.
// a straight bar is loaded with plates. Excluded on purpose:
//   - Smith machine (counter-balanced; bar weight varies wildly per rig)
//   - Trap-bar / safety-bar (specialty bars, weight varies)
//   - Landmine / viking press (one end pivots — half the bar weight at best)
//   - Cable & machine work, dumbbells, bodyweight
const BARBELL_EXERCISE_IDS = new Set<string>([
  // Push
  "bench", "incline_bar", "decline", "floor_press", "larsen_press",
  "cgbench", "skull", "jm_press", "ohp", "behind_neck",
  // Pull
  "bb_row", "pendlay_row",
  "bb_curl", "ez_curl",
  // Shoulders
  "upright_row", "shrug", "rack_pull",
  // Legs
  "squat", "front_sq", "zercher_sq", "box_sq", "pause_sq",
  "rdl", "dead", "sumo_dl", "snatch_dl", "deficit_dl", "sdl",
  "good_morn", "hip_thrust",
  // Core
  "w_situp",
]);

export function isBarbellExercise(exerciseId: string): boolean {
  return BARBELL_EXERCISE_IDS.has(exerciseId);
}

// ── First-launch "do you count the bar?" preference ───────────────────────
//
// The whole point of the modal is the joke, but we still let the answer
// influence the UI: when a user says they don't count the bar, every
// barbell exercise card shows a "+20 kg bar" hint near the weight column.
//
// Three states:
//   "yes" — bar is included in entered weight
//   "no"  — only plates are entered; we hint the +bar adjustment
//   "off" — user opted out of the joke entirely; nothing is shown
//
// Stored as a plain localStorage flag so it survives logout and is
// read synchronously at first paint without any backend round-trip.
// Absence of any value means we haven't asked yet.

export type CountsBar = "yes" | "no" | "off";
export const COUNTS_BAR_KEY = "gamgee_counts_bar";

export function readCountsBar(): CountsBar | null {
  const v = localStorage.getItem(COUNTS_BAR_KEY);
  return v === "yes" || v === "no" || v === "off" ? v : null;
}

export function writeCountsBar(value: CountsBar): void {
  localStorage.setItem(COUNTS_BAR_KEY, value);
}
