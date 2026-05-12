// Motion keyframes for the exercise stick-figure animations.
//
// Coordinate system: 100 (wide) x 160 (tall) viewBox, +y points down.
// Each exercise is defined by 2-3 poses interpolated by ExerciseAnimation.
// All figures are drawn side-on, facing right (+x).

import type { Frame } from "../components/exercise/ExerciseAnimation";
import type { Pose } from "../components/exercise/StickFigure";

// Neutral standing pose — reused as a base for upright exercises.
const STAND: Pose = {
  head:     [50, 20],
  neck:     [50, 30],
  shoulder: [50, 35],
  elbow:    [50, 60],
  hand:     [50, 85],
  hip:      [50, 85],
  knee:     [50, 115],
  ankle:    [50, 140],
  toe:      [60, 140],
};

// ── Back squat ──────────────────────────────────────────────────────────────
// Bar sits across the shoulders; figure hinges at hips and bends knees.

const SQUAT_TOP: Pose = {
  ...STAND,
  // Hands grip the bar at shoulder height.
  elbow: [52, 50],
  hand:  [55, 38],
};

const SQUAT_BOTTOM: Pose = {
  head:     [44, 38],   // torso leans forward, head drops & forward
  neck:     [46, 47],
  shoulder: [48, 52],
  elbow:    [50, 65],   // hands still on bar — elbow swings down
  hand:     [54, 55],
  hip:      [50, 92],   // hips drop
  knee:     [62, 113],  // knees track forward, slightly out
  ankle:    [50, 140],
  toe:      [60, 140],
};

export const SQUAT_FRAMES: Frame[] = [
  { t: 0,    pose: SQUAT_TOP,    bar: [49, 32] },
  { t: 0.5,  pose: SQUAT_BOTTOM, bar: [47, 49] },
  { t: 1,    pose: SQUAT_TOP,    bar: [49, 32] },
];

// ── Barbell curl ────────────────────────────────────────────────────────────
// Stand tall; elbow hinges, hand arcs forward and up.

const CURL_DOWN: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [54, 85],   // slightly forward to suggest gripping a bar
};

const CURL_UP: Pose = {
  ...STAND,
  elbow: [50, 60],   // elbow stays pinned to the side
  hand:  [62, 42],   // bar curled up near shoulder
};

export const CURL_FRAMES: Frame[] = [
  { t: 0,    pose: CURL_DOWN, bar: [54, 85] },
  { t: 0.5,  pose: CURL_UP,   bar: [62, 42] },
  { t: 1,    pose: CURL_DOWN, bar: [54, 85] },
];

// ── Bench press ─────────────────────────────────────────────────────────────
// Body horizontal on a bench, head to the right, feet to the floor.
// Only the arm moves — bar travels straight up/down over the shoulder.

const BENCH_TOP: Pose = {
  head:     [80, 78],
  neck:     [73, 81],
  shoulder: [68, 83],
  elbow:    [68, 59],   // arm vertical at lockout (upper arm ≈ 24)
  hand:     [68, 35],   // bar straight up over the shoulder
  hip:      [42, 86],
  knee:     [25, 105],
  ankle:    [16, 138],
  toe:      [9,  138],
};

const BENCH_BOTTOM: Pose = {
  ...BENCH_TOP,
  // Elbow flares up & toward feet so the forearm can reach the chest.
  // Keeps the total arm length within ~4% of BENCH_TOP to minimise telescoping.
  elbow: [50, 64],
  hand:  [62, 80],
};

export const BENCH_FRAMES: Frame[] = [
  { t: 0,    pose: BENCH_TOP,    bar: [68, 35] },
  { t: 0.5,  pose: BENCH_BOTTOM, bar: [62, 80] },
  { t: 1,    pose: BENCH_TOP,    bar: [68, 35] },
];

// ── Index ───────────────────────────────────────────────────────────────────
// Keyed by exercise id (matches `Exercise.id` in the backend / EM map).

export interface ExerciseMotion {
  name:      string;
  frames:    Frame[];
  duration?: number;
  bench?:    boolean;
  floor?:    boolean;
}

export const MOTIONS: Record<string, ExerciseMotion> = {
  squat:   { name: "Back squat",   frames: SQUAT_FRAMES, duration: 2600, floor: true },
  bb_curl: { name: "Barbell curl", frames: CURL_FRAMES,  duration: 1800, floor: true },
  bench:   { name: "Bench press",  frames: BENCH_FRAMES, duration: 2200, bench: true },
};
