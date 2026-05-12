// Motion keyframes for the exercise stick-figure animations.
//
// Coordinate system: 100 (wide) x 160 (tall) viewBox, +y points down.
// Each exercise is a list of poses interpolated by ExerciseAnimation with
// cosine ease-in-out between adjacent frames.
//
// Reference segment lengths (kept ~constant across poses to avoid telescoping):
//   torso   shoulder → hip  ≈ 50
//   thigh   hip → knee      ≈ 30
//   shin    knee → ankle    ≈ 25
//   uparm   shoulder → elbow ≈ 25
//   forearm elbow → hand    ≈ 25
//
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
// Bar sits across the shoulders. Hip hinges back while knees track forward to
// keep the bar over mid-foot; at depth the torso is angled ~50° from vertical.

const SQUAT_TOP: Pose = {
  ...STAND,
  // Hands grip the bar just behind the shoulders.
  elbow: [56, 50],
  hand:  [54, 35],
};

// Halfway down — hips initiate the hinge before the knees travel.
const SQUAT_MID: Pose = {
  head:     [46, 32],
  neck:     [47, 41],
  shoulder: [48, 49],
  elbow:    [55, 64],
  hand:     [52, 50],
  hip:      [44, 98],
  knee:     [56, 116],
  ankle:    [50, 140],
  toe:      [60, 140],
};

// Bottom — thighs nearly parallel to the floor, hips driven back.
const SQUAT_BOTTOM: Pose = {
  head:     [40, 48],
  neck:     [43, 56],
  shoulder: [46, 64],
  elbow:    [54, 78],
  hand:     [50, 65],
  hip:      [34, 112],
  knee:     [60, 117],   // knee in front of ankle, thigh ≈ horizontal
  ankle:    [50, 140],
  toe:      [60, 140],
};

export const SQUAT_FRAMES: Frame[] = [
  { t: 0,    pose: SQUAT_TOP,    bar: [50, 30] },
  { t: 0.25, pose: SQUAT_MID,    bar: [48, 44] },
  { t: 0.5,  pose: SQUAT_BOTTOM, bar: [47, 59] },
  { t: 0.75, pose: SQUAT_MID,    bar: [48, 44] },
  { t: 1,    pose: SQUAT_TOP,    bar: [50, 30] },
];

// ── Deadlift ────────────────────────────────────────────────────────────────
// Bar starts on the floor under mid-foot, lifts to standing along the legs.
// Hip-hinge dominant: hips back, shoulder slightly past bar, arms locked.

const DEAD_BOTTOM: Pose = {
  head:     [56, 56],
  neck:     [54, 65],
  shoulder: [50, 75],   // shoulder over the bar
  elbow:    [50, 100],
  hand:     [50, 128],  // arms locked straight, bar at floor
  hip:      [18, 100],  // hips driven back
  knee:     [42, 116],
  ankle:    [50, 140],
  toe:      [60, 140],
};

// Bar passes the knees — hips swing forward as the bar rises.
const DEAD_MID: Pose = {
  head:     [54, 34],
  neck:     [52, 43],
  shoulder: [50, 52],
  elbow:    [51, 75],
  hand:     [52, 100],  // bar just above the knees
  hip:      [32, 92],
  knee:     [50, 117],
  ankle:    [50, 140],
  toe:      [60, 140],
};

const DEAD_TOP: Pose = {
  ...STAND,
  elbow: [52, 60],
  hand:  [54, 87],      // bar at hip level on lockout
};

export const DEAD_FRAMES: Frame[] = [
  { t: 0,    pose: DEAD_BOTTOM, bar: [50, 128] },
  { t: 0.25, pose: DEAD_MID,    bar: [52, 100] },
  { t: 0.5,  pose: DEAD_TOP,    bar: [54, 87]  },
  { t: 0.75, pose: DEAD_MID,    bar: [52, 100] },
  { t: 1,    pose: DEAD_BOTTOM, bar: [50, 128] },
];

// ── Overhead press ─────────────────────────────────────────────────────────
// Bar starts at the clavicle, presses straight up over the head.
// Pure side view foreshortens the elbow flare, so we tilt the elbow forward
// at the rack position; arm length telescopes ~10% across the press.

const OHP_DOWN: Pose = {
  ...STAND,
  elbow: [60, 50],     // elbow flared forward under the bar
  hand:  [50, 38],     // bar at clavicle, just below the chin
};

const OHP_UP: Pose = {
  ...STAND,
  elbow: [50, 22],
  hand:  [50, 5],      // bar locked out overhead
};

export const OHP_FRAMES: Frame[] = [
  { t: 0,    pose: OHP_DOWN, bar: [50, 38] },
  { t: 0.5,  pose: OHP_UP,   bar: [50, 5]  },
  { t: 1,    pose: OHP_DOWN, bar: [50, 38] },
];

// ── Barbell curl ────────────────────────────────────────────────────────────
// Elbow stays pinned to the side; forearm rotates ~150° from down to peak.

const CURL_DOWN: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [53, 85],     // bar hanging just in front of the thighs
};

const CURL_UP: Pose = {
  ...STAND,
  // Tiny torso lean to suggest peak-contraction; keep it subtle.
  shoulder: [49, 36],
  elbow:    [49, 60],
  hand:     [61, 38],  // forearm arced up; bar at shoulder height
};

export const CURL_FRAMES: Frame[] = [
  { t: 0,    pose: CURL_DOWN, bar: [53, 85] },
  { t: 0.5,  pose: CURL_UP,   bar: [61, 38] },
  { t: 1,    pose: CURL_DOWN, bar: [53, 85] },
];

// ── Bent-over row ──────────────────────────────────────────────────────────
// Torso hinged ~45°, hips back, knees soft. Arm rows from full extension to
// the lower chest; elbow drives back behind the body line.

const BB_ROW_DOWN: Pose = {
  head:     [62, 50],
  neck:     [56, 56],
  shoulder: [50, 65],
  elbow:    [50, 88],   // arm hanging straight
  hand:     [50, 113],  // bar at full extension under the shoulders
  hip:      [20, 100],
  knee:     [30, 120],
  ankle:    [38, 140],
  toe:      [50, 140],
};

const BB_ROW_UP: Pose = {
  ...BB_ROW_DOWN,
  elbow: [27, 70],      // elbow driven back behind the body line
  hand:  [50, 80],      // bar at lower chest
};

export const BB_ROW_FRAMES: Frame[] = [
  { t: 0,    pose: BB_ROW_DOWN, bar: [50, 113] },
  { t: 0.5,  pose: BB_ROW_UP,   bar: [50, 80]  },
  { t: 1,    pose: BB_ROW_DOWN, bar: [50, 113] },
];

// ── Bench press ─────────────────────────────────────────────────────────────
// Body horizontal on a bench, head to the right, feet planted on the floor.
// In a pure side view a real elbow flare projects into the screen; we cheat
// by lifting the elbow up-and-forward so the bend reads clearly.

const BENCH_TOP: Pose = {
  head:     [80, 78],
  neck:     [73, 81],
  shoulder: [68, 83],
  elbow:    [68, 59],   // upper arm vertical at lockout
  hand:     [68, 35],   // bar over the shoulder
  hip:      [42, 86],
  knee:     [27, 104],
  ankle:    [27, 138],  // shin vertical — foot planted under the knee
  toe:      [16, 138],
};

const BENCH_BOTTOM: Pose = {
  ...BENCH_TOP,
  head:  [80, 80],      // head settles into the bench slightly under load
  elbow: [50, 62],
  hand:  [62, 78],      // bar at chest level, just forward of the shoulder
};

export const BENCH_FRAMES: Frame[] = [
  { t: 0,    pose: BENCH_TOP,    bar: [68, 35] },
  { t: 0.5,  pose: BENCH_BOTTOM, bar: [62, 78] },
  { t: 1,    pose: BENCH_TOP,    bar: [68, 35] },
];

// ── Pull-ups ────────────────────────────────────────────────────────────────
// Hands fixed on a horizontal bar near the top of the frame; the whole body
// translates up. At the top the elbow flares forward and the chin clears the
// bar — the bar position itself doesn't move between frames.

const PULL_BAR_Y = 3;

const PULLUP_DOWN: Pose = {
  head:     [50, 38],
  neck:     [50, 48],
  shoulder: [50, 53],   // arms fully extended (50 below the bar)
  elbow:    [50, 28],
  hand:     [50, PULL_BAR_Y],
  hip:      [50, 103],
  knee:     [50, 133],
  ankle:    [50, 158],
  toe:      [60, 158],
};

const PULLUP_UP: Pose = {
  head:     [50, 18],
  neck:     [50, 28],
  shoulder: [50, 33],   // body raised 20 units
  elbow:    [72, 18],   // elbow flares forward as the chin clears the bar
  hand:     [50, PULL_BAR_Y],
  hip:      [50, 83],
  knee:     [50, 113],
  ankle:    [50, 138],
  toe:      [60, 138],
};

export const PULLUP_FRAMES: Frame[] = [
  { t: 0,    pose: PULLUP_DOWN },
  { t: 0.5,  pose: PULLUP_UP   },
  { t: 1,    pose: PULLUP_DOWN },
];

// ── Calf raise ──────────────────────────────────────────────────────────────
// Bodyweight; figure pivots on the toes and the whole body rises ~5 units.

const CALF_DOWN: Pose = { ...STAND };

const CALF_UP: Pose = {
  head:     [50, 14],
  neck:     [50, 24],
  shoulder: [50, 29],
  elbow:    [50, 54],
  hand:     [50, 79],
  hip:      [50, 79],
  knee:     [50, 109],
  ankle:    [51, 135],   // heel lifts, ankle drifts toward the toe pivot
  toe:      [60, 140],   // toe stays planted on the floor
};

export const CALF_FRAMES: Frame[] = [
  { t: 0,    pose: CALF_DOWN },
  { t: 0.5,  pose: CALF_UP   },
  { t: 1,    pose: CALF_DOWN },
];

// ── Index ───────────────────────────────────────────────────────────────────
// Keyed by exercise id (matches `Exercise.id` in the backend / EM map).

export interface ExerciseMotion {
  name:      string;
  frames:    Frame[];
  duration?: number;
  bench?:    boolean;
  floor?:    boolean;
  barLine?:  number;   // draw a fixed horizontal bar across the frame at this y
}

export const MOTIONS: Record<string, ExerciseMotion> = {
  squat:      { name: "Back squat",     frames: SQUAT_FRAMES,  duration: 3000, floor: true },
  dead:       { name: "Deadlift",       frames: DEAD_FRAMES,   duration: 3000, floor: true },
  ohp:        { name: "Overhead press", frames: OHP_FRAMES,    duration: 2200, floor: true },
  bench:      { name: "Bench press",    frames: BENCH_FRAMES,  duration: 2200, bench: true },
  bb_row:     { name: "Barbell row",    frames: BB_ROW_FRAMES, duration: 2200, floor: true },
  bb_curl:    { name: "Barbell curl",   frames: CURL_FRAMES,   duration: 1800, floor: true },
  pullups:    { name: "Pull-ups",       frames: PULLUP_FRAMES, duration: 2400, barLine: PULL_BAR_Y },
  calf_raise: { name: "Calf raise",     frames: CALF_FRAMES,   duration: 1400, floor: true },
};
