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

// ── Barbell curl ────────────────────────────────────────────────────────────
// Elbow stays pinned to the side; forearm rotates 150° from down to peak.

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

// ── Overhead press ──────────────────────────────────────────────────────────
// Standing; bar travels from front-rack at the shoulders to lockout overhead.

const OHP_RACK: Pose = {
  ...STAND,
  elbow: [44, 46],
  hand:  [50, 35],   // bar at chin
};

const OHP_LOCKOUT: Pose = {
  ...STAND,
  shoulder: [50, 36],
  elbow:    [50, 22],
  hand:     [50, 6],  // arms locked overhead
};

export const OHP_FRAMES: Frame[] = [
  { t: 0,   pose: OHP_RACK,    bar: [50, 35] },
  { t: 0.5, pose: OHP_LOCKOUT, bar: [50, 6] },
  { t: 1,   pose: OHP_RACK,    bar: [50, 35] },
];

// ── Push-up ─────────────────────────────────────────────────────────────────
// Body horizontal, face down, head to the right. Hips track shoulders so the
// body stays straight; arms bend and extend.

const PUSHUP_UP: Pose = {
  head:     [82, 96],
  neck:     [74, 99],
  shoulder: [68, 102],
  elbow:    [70, 119],
  hand:     [70, 138],   // hands on the floor
  hip:      [40, 104],
  knee:     [18, 108],
  ankle:    [-2, 112],
  toe:      [-2, 120],
};

const PUSHUP_DOWN: Pose = {
  ...PUSHUP_UP,
  head:     [82, 128],
  neck:     [74, 129],
  shoulder: [68, 130],
  elbow:    [56, 132],   // elbow flares back ~45°
  hand:     [70, 138],
  hip:      [40, 130],
  knee:     [18, 132],
  ankle:    [-2, 134],
};

export const PUSHUP_FRAMES: Frame[] = [
  { t: 0,   pose: PUSHUP_UP },
  { t: 0.5, pose: PUSHUP_DOWN },
  { t: 1,   pose: PUSHUP_UP },
];

// ── Dips ────────────────────────────────────────────────────────────────────
// Upright on parallel bars; trunk leans forward slightly for chest emphasis.
// Hands stay fixed; the body raises and lowers.

const DIPS_TOP: Pose = {
  head:     [55, 35],
  neck:     [54, 45],
  shoulder: [53, 53],
  elbow:    [62, 65],
  hand:     [60, 90],
  hip:      [46, 95],
  knee:     [50, 120],
  ankle:    [42, 138],
  toe:      [52, 138],
};

const DIPS_BOTTOM: Pose = {
  head:     [55, 60],
  neck:     [54, 70],
  shoulder: [53, 78],
  elbow:    [42, 88],   // elbow swings back as shoulder drops below
  hand:     [60, 90],
  hip:      [46, 116],
  knee:     [50, 140],
  ankle:    [42, 156],
  toe:      [52, 156],
};

export const DIPS_FRAMES: Frame[] = [
  { t: 0,   pose: DIPS_TOP },
  { t: 0.5, pose: DIPS_BOTTOM },
  { t: 1,   pose: DIPS_TOP },
];

// ── Tricep pushdown ─────────────────────────────────────────────────────────
// Upright; upper arm stays vertical, forearm rotates around the elbow.

const TRI_PUSH_TOP: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [60, 50],   // forearm angled up at ~45°
};

const TRI_PUSH_BOTTOM: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [54, 85],   // forearm vertical at lockout
};

export const TRI_PUSH_FRAMES: Frame[] = [
  { t: 0,   pose: TRI_PUSH_TOP },
  { t: 0.5, pose: TRI_PUSH_BOTTOM },
  { t: 1,   pose: TRI_PUSH_TOP },
];

// ── Pull-up ─────────────────────────────────────────────────────────────────
// Hands fixed at the bar near the top of the viewBox; body raises and lowers.

const PULLUP_HANG: Pose = {
  head:     [50, 50],
  neck:     [50, 60],
  shoulder: [50, 67],
  elbow:    [54, 47],
  hand:     [56, 24],   // grip the bar overhead
  hip:      [50, 115],
  knee:     [55, 138],
  ankle:    [55, 156],
  toe:      [62, 156],
};

const PULLUP_TOP: Pose = {
  head:     [50, 30],
  neck:     [50, 40],
  shoulder: [50, 48],
  elbow:    [40, 36],   // elbows pulled down and back
  hand:     [56, 24],
  hip:      [50, 96],
  knee:     [55, 120],
  ankle:    [55, 140],
  toe:      [62, 140],
};

export const PULLUP_FRAMES: Frame[] = [
  { t: 0,   pose: PULLUP_HANG },
  { t: 0.5, pose: PULLUP_TOP },
  { t: 1,   pose: PULLUP_HANG },
];

// ── Bent-over row ───────────────────────────────────────────────────────────
// Hinged at the hip; bar pulled to the lower chest.

const ROW_BOTTOM: Pose = {
  head:     [70, 60],
  neck:     [64, 65],
  shoulder: [58, 70],
  elbow:    [56, 95],
  hand:     [58, 118],   // bar hanging
  hip:      [38, 80],
  knee:     [46, 110],
  ankle:    [50, 140],
  toe:      [60, 140],
};

const ROW_TOP: Pose = {
  ...ROW_BOTTOM,
  elbow: [44, 80],   // elbow driven back behind the torso
  hand:  [56, 92],   // bar at lower-chest height
};

export const ROW_FRAMES: Frame[] = [
  { t: 0,   pose: ROW_BOTTOM, bar: [58, 118] },
  { t: 0.5, pose: ROW_TOP,    bar: [56, 92] },
  { t: 1,   pose: ROW_BOTTOM, bar: [58, 118] },
];

// ── Lat pulldown ────────────────────────────────────────────────────────────
// Seated; bar pulled from overhead down to the upper chest.

const LATPD_TOP: Pose = {
  head:     [50, 50],
  neck:     [50, 60],
  shoulder: [50, 67],
  elbow:    [56, 46],
  hand:     [58, 22],    // hands grip bar high
  hip:      [50, 117],
  knee:     [62, 130],
  ankle:    [72, 144],
  toe:      [82, 144],
};

const LATPD_BOTTOM: Pose = {
  ...LATPD_TOP,
  shoulder: [50, 65],
  elbow:    [40, 76],
  hand:     [54, 60],    // bar at upper chest
};

export const LATPD_FRAMES: Frame[] = [
  { t: 0,   pose: LATPD_TOP,    bar: [58, 22] },
  { t: 0.5, pose: LATPD_BOTTOM, bar: [54, 60] },
  { t: 1,   pose: LATPD_TOP,    bar: [58, 22] },
];

// ── Shrug ───────────────────────────────────────────────────────────────────
// Bar at the thighs; shoulders elevate vertically.

const SHRUG_DOWN: Pose = {
  ...STAND,
  shoulder: [50, 38],
  elbow:    [50, 63],
  hand:     [52, 88],
};

const SHRUG_UP: Pose = {
  ...STAND,
  neck:     [50, 26],
  shoulder: [50, 30],   // shoulders pulled up to the ears
  elbow:    [50, 55],
  hand:     [52, 80],
};

export const SHRUG_FRAMES: Frame[] = [
  { t: 0,    pose: SHRUG_DOWN, bar: [52, 88] },
  { t: 0.5,  pose: SHRUG_UP,   bar: [52, 80] },
  { t: 1,    pose: SHRUG_DOWN, bar: [52, 88] },
];

// ── Lateral raise ───────────────────────────────────────────────────────────
// Standing; arm starts at the side and rises to shoulder height. Side view
// hides the abduction angle so we lift the hand upward instead.

const LAT_RAISE_DOWN: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [50, 85],
};

const LAT_RAISE_UP: Pose = {
  ...STAND,
  elbow: [50, 36],
  hand:  [50, 12],     // hand reaches up beside the head
};

export const LAT_RAISE_FRAMES: Frame[] = [
  { t: 0,   pose: LAT_RAISE_DOWN },
  { t: 0.5, pose: LAT_RAISE_UP },
  { t: 1,   pose: LAT_RAISE_DOWN },
];

// ── Front raise ─────────────────────────────────────────────────────────────
// Arm raises forward from the thigh to shoulder height.

const FRONT_RAISE_DOWN: Pose = {
  ...STAND,
  elbow: [54, 60],
  hand:  [58, 85],
};

const FRONT_RAISE_UP: Pose = {
  ...STAND,
  shoulder: [50, 36],
  elbow:    [65, 40],
  hand:     [82, 36],   // arm extended forward, hand at shoulder height
};

export const FRONT_RAISE_FRAMES: Frame[] = [
  { t: 0,   pose: FRONT_RAISE_DOWN },
  { t: 0.5, pose: FRONT_RAISE_UP },
  { t: 1,   pose: FRONT_RAISE_DOWN },
];

// ── Deadlift ────────────────────────────────────────────────────────────────
// Bar starts on the floor; pull through to a tall lockout.

const DEAD_BOTTOM: Pose = {
  head:     [62, 55],
  neck:     [58, 62],
  shoulder: [54, 70],
  elbow:    [52, 95],
  hand:     [50, 120],   // gripping bar on the floor
  hip:      [40, 90],
  knee:     [48, 112],
  ankle:    [50, 140],
  toe:      [60, 140],
};

const DEAD_TOP: Pose = {
  ...STAND,
  hand:  [52, 90],       // bar at hip height
  elbow: [52, 70],
};

export const DEAD_FRAMES: Frame[] = [
  { t: 0,   pose: DEAD_BOTTOM, bar: [50, 122] },
  { t: 0.5, pose: DEAD_TOP,    bar: [52, 90] },
  { t: 1,   pose: DEAD_BOTTOM, bar: [50, 122] },
];

// ── Romanian deadlift ───────────────────────────────────────────────────────
// Hinge at the hips with soft knees; bar slides down the thighs to mid-shin.

const RDL_TOP: Pose = {
  ...STAND,
  elbow: [52, 70],
  hand:  [52, 90],
};

const RDL_BOTTOM: Pose = {
  head:     [70, 58],
  neck:     [64, 64],
  shoulder: [58, 70],
  elbow:    [54, 92],
  hand:     [52, 116],   // bar at mid-shin
  hip:      [38, 84],
  knee:     [46, 112],
  ankle:    [50, 140],
  toe:      [60, 140],
};

export const RDL_FRAMES: Frame[] = [
  { t: 0,   pose: RDL_TOP,    bar: [52, 90] },
  { t: 0.5, pose: RDL_BOTTOM, bar: [52, 116] },
  { t: 1,   pose: RDL_TOP,    bar: [52, 90] },
];

// ── Lunge ───────────────────────────────────────────────────────────────────
// Front leg planted; back leg knee drops toward the floor.

const LUNGE_UP: Pose = {
  head:     [50, 22],
  neck:     [50, 32],
  shoulder: [50, 37],
  elbow:    [50, 62],
  hand:     [50, 87],
  hip:      [50, 87],
  knee:     [60, 116],
  ankle:    [68, 140],
  toe:      [78, 140],
};

const LUNGE_DOWN: Pose = {
  head:     [50, 38],
  neck:     [50, 48],
  shoulder: [50, 53],
  elbow:    [50, 78],
  hand:     [50, 103],
  hip:      [50, 103],
  knee:     [76, 122],     // front knee far forward, thigh ~ horizontal
  ankle:    [78, 140],
  toe:      [88, 140],
};

export const LUNGE_FRAMES: Frame[] = [
  { t: 0,   pose: LUNGE_UP },
  { t: 0.5, pose: LUNGE_DOWN },
  { t: 1,   pose: LUNGE_UP },
];

// ── Calf raise ──────────────────────────────────────────────────────────────
// Heels lift; the whole figure shifts upward.

const CALF_DOWN: Pose = { ...STAND };
const CALF_UP: Pose = {
  head:     [50, 14],
  neck:     [50, 24],
  shoulder: [50, 29],
  elbow:    [50, 54],
  hand:     [50, 79],
  hip:      [50, 79],
  knee:     [50, 109],
  ankle:    [50, 130],     // heel lifted
  toe:      [60, 140],
};

export const CALF_FRAMES: Frame[] = [
  { t: 0,   pose: CALF_DOWN },
  { t: 0.5, pose: CALF_UP },
  { t: 1,   pose: CALF_DOWN },
];

// ── Lying leg curl ──────────────────────────────────────────────────────────
// Face down on a bench; heels travel up toward the glutes.

const LEG_CURL_DOWN: Pose = {
  head:     [12, 92],
  neck:     [20, 90],
  shoulder: [28, 88],
  elbow:    [22, 96],
  hand:     [16, 102],
  hip:      [60, 88],
  knee:     [78, 88],
  ankle:    [96, 88],
  toe:      [96, 96],
};

const LEG_CURL_UP: Pose = {
  ...LEG_CURL_DOWN,
  ankle: [76, 64],   // heels curled up over the glutes
  toe:   [82, 56],
};

export const LEG_CURL_FRAMES: Frame[] = [
  { t: 0,   pose: LEG_CURL_DOWN },
  { t: 0.5, pose: LEG_CURL_UP },
  { t: 1,   pose: LEG_CURL_DOWN },
];

// ── Leg extension ───────────────────────────────────────────────────────────
// Seated; shin rotates from hanging down to straight out.

const LEG_EXT_DOWN: Pose = {
  head:     [22, 50],
  neck:     [22, 60],
  shoulder: [22, 65],
  elbow:    [22, 88],
  hand:     [22, 110],
  hip:      [40, 88],
  knee:     [60, 88],
  ankle:    [60, 116],    // shin hangs down
  toe:      [68, 120],
};

const LEG_EXT_UP: Pose = {
  ...LEG_EXT_DOWN,
  ankle: [92, 88],         // shin out horizontal
  toe:   [96, 96],
};

export const LEG_EXT_FRAMES: Frame[] = [
  { t: 0,   pose: LEG_EXT_DOWN },
  { t: 0.5, pose: LEG_EXT_UP },
  { t: 1,   pose: LEG_EXT_DOWN },
];

// ── Hip thrust ──────────────────────────────────────────────────────────────
// Upper back on the bench; hips driven from the floor to full extension.

const HIP_DOWN: Pose = {
  head:     [22, 80],
  neck:     [30, 82],
  shoulder: [38, 84],
  elbow:    [42, 100],
  hand:     [44, 118],
  hip:      [62, 120],
  knee:     [80, 114],
  ankle:    [88, 138],
  toe:      [96, 138],
};

const HIP_UP: Pose = {
  head:     [22, 80],
  neck:     [30, 82],
  shoulder: [38, 84],
  elbow:    [42, 100],
  hand:     [44, 118],
  hip:      [60, 86],     // hips level with the shoulders/knees
  knee:     [80, 90],
  ankle:    [88, 138],
  toe:      [96, 138],
};

export const HIP_FRAMES: Frame[] = [
  { t: 0,   pose: HIP_DOWN },
  { t: 0.5, pose: HIP_UP },
  { t: 1,   pose: HIP_DOWN },
];

// ── Weighted sit-up ─────────────────────────────────────────────────────────
// Knees bent; torso rises from the floor to upright.

const SITUP_DOWN: Pose = {
  head:     [22, 116],
  neck:     [28, 118],
  shoulder: [34, 120],
  elbow:    [34, 124],
  hand:     [34, 130],
  hip:      [60, 122],
  knee:     [78, 100],
  ankle:    [92, 134],
  toe:      [98, 138],
};

const SITUP_UP: Pose = {
  head:     [54, 76],
  neck:     [56, 86],
  shoulder: [58, 92],
  elbow:    [58, 110],
  hand:     [58, 122],
  hip:      [60, 122],
  knee:     [78, 100],
  ankle:    [92, 134],
  toe:      [98, 138],
};

export const SITUP_FRAMES: Frame[] = [
  { t: 0,   pose: SITUP_DOWN },
  { t: 0.5, pose: SITUP_UP },
  { t: 1,   pose: SITUP_DOWN },
];

// ── Plank ───────────────────────────────────────────────────────────────────
// Held position with a subtle "breath" cycle so the figure feels alive.

const PLANK_BASE: Pose = {
  head:     [82, 100],
  neck:     [74, 102],
  shoulder: [66, 104],
  elbow:    [66, 122],
  hand:     [60, 138],
  hip:      [38, 106],
  knee:     [18, 110],
  ankle:    [0, 114],
  toe:      [-2, 122],
};

const PLANK_BREATH: Pose = {
  ...PLANK_BASE,
  shoulder: [66, 106],
  hip:      [38, 108],
};

export const PLANK_FRAMES: Frame[] = [
  { t: 0,   pose: PLANK_BASE },
  { t: 0.5, pose: PLANK_BREATH },
  { t: 1,   pose: PLANK_BASE },
];

// ── Running ─────────────────────────────────────────────────────────────────
// A simplified two-pose gait — the side-view stick figure suggests rhythm
// without trying to be biomechanically accurate.

const RUN_A: Pose = {
  head:     [50, 22],
  neck:     [50, 32],
  shoulder: [50, 38],
  elbow:    [62, 50],
  hand:     [70, 64],     // lead arm forward
  hip:      [50, 86],
  knee:     [68, 100],    // lead knee up
  ankle:    [80, 120],
  toe:      [90, 122],
};

const RUN_B: Pose = {
  head:     [50, 22],
  neck:     [50, 32],
  shoulder: [50, 38],
  elbow:    [38, 50],     // arms swap
  hand:     [30, 64],
  hip:      [50, 86],
  knee:     [38, 116],
  ankle:    [26, 138],    // trailing leg back, pushing off
  toe:      [16, 138],
};

export const RUN_FRAMES: Frame[] = [
  { t: 0,   pose: RUN_A },
  { t: 0.5, pose: RUN_B },
  { t: 1,   pose: RUN_A },
];

// ── Jump rope ───────────────────────────────────────────────────────────────
// Small vertical hop on the balls of the feet.

const JUMP_DOWN: Pose = {
  ...STAND,
  knee:  [50, 118],
  ankle: [50, 142],
  toe:   [60, 142],
};

const JUMP_UP: Pose = {
  ...STAND,
  head:  [50, 14],
  neck:  [50, 24],
  shoulder: [50, 29],
  elbow: [50, 54],
  hand:  [50, 79],
  hip:   [50, 79],
  knee:  [50, 108],
  ankle: [50, 130],
  toe:   [60, 132],
};

export const JUMP_FRAMES: Frame[] = [
  { t: 0,    pose: JUMP_DOWN },
  { t: 0.5,  pose: JUMP_UP },
  { t: 1,    pose: JUMP_DOWN },
];

// ── Index ───────────────────────────────────────────────────────────────────
// Keyed by exercise id (matches `Exercise.id` in the backend / EM map).

export interface ExerciseMotion {
  name:      string;
  frames:    Frame[];
  duration?: number;
  bench?:    boolean;
  floor?:    boolean;
  category?: string;
}

export const MOTIONS: Record<string, ExerciseMotion> = {
  // ── Push ────────────────────────────────────────────────────────────────
  bench:      { name: "Bench press",     frames: BENCH_FRAMES,       duration: 2200, bench: true,  category: "Push" },
  ohp:        { name: "Overhead press",  frames: OHP_FRAMES,         duration: 2000, floor: true,  category: "Push" },
  push_up:    { name: "Push-up",         frames: PUSHUP_FRAMES,      duration: 1800, floor: true,  category: "Push" },
  dips:       { name: "Dips",            frames: DIPS_FRAMES,        duration: 2200,               category: "Push" },
  tri_push:   { name: "Tricep pushdown", frames: TRI_PUSH_FRAMES,    duration: 1600, floor: true,  category: "Push" },

  // ── Pull ────────────────────────────────────────────────────────────────
  bb_curl:    { name: "Barbell curl",    frames: CURL_FRAMES,        duration: 1800, floor: true,  category: "Pull" },
  pullups:    { name: "Pull-up",         frames: PULLUP_FRAMES,      duration: 2400,               category: "Pull" },
  bb_row:     { name: "Bent-over row",   frames: ROW_FRAMES,         duration: 2000, floor: true,  category: "Pull" },
  lat_pd:     { name: "Lat pulldown",    frames: LATPD_FRAMES,       duration: 2000,               category: "Pull" },
  shrug:      { name: "Shrug",           frames: SHRUG_FRAMES,       duration: 1600, floor: true,  category: "Pull" },

  // ── Shoulders ──────────────────────────────────────────────────────────
  lat_raise:   { name: "Lateral raise",  frames: LAT_RAISE_FRAMES,   duration: 1800, floor: true,  category: "Shoulders" },
  front_raise: { name: "Front raise",    frames: FRONT_RAISE_FRAMES, duration: 1800, floor: true,  category: "Shoulders" },

  // ── Legs ────────────────────────────────────────────────────────────────
  squat:      { name: "Back squat",      frames: SQUAT_FRAMES,       duration: 3000, floor: true,  category: "Legs" },
  dead:       { name: "Deadlift",        frames: DEAD_FRAMES,        duration: 2800, floor: true,  category: "Legs" },
  rdl:        { name: "Romanian deadlift", frames: RDL_FRAMES,       duration: 2600, floor: true,  category: "Legs" },
  lunges:     { name: "Lunge",           frames: LUNGE_FRAMES,       duration: 2400, floor: true,  category: "Legs" },
  calf_raise: { name: "Calf raise",      frames: CALF_FRAMES,        duration: 1400, floor: true,  category: "Legs" },
  leg_curl:   { name: "Lying leg curl",  frames: LEG_CURL_FRAMES,    duration: 1800,               category: "Legs" },
  leg_ext:    { name: "Leg extension",   frames: LEG_EXT_FRAMES,     duration: 1800,               category: "Legs" },
  hip_thrust: { name: "Hip thrust",      frames: HIP_FRAMES,         duration: 2200,               category: "Legs" },

  // ── Core ────────────────────────────────────────────────────────────────
  w_situp:    { name: "Sit-up",          frames: SITUP_FRAMES,       duration: 2000, floor: true,  category: "Core" },
  plank:      { name: "Plank",           frames: PLANK_FRAMES,       duration: 2400, floor: true,  category: "Core" },

  // ── Cardio ──────────────────────────────────────────────────────────────
  run:        { name: "Running",         frames: RUN_FRAMES,         duration: 600,  floor: true,  category: "Cardio" },
  jump_rope:  { name: "Jump rope",       frames: JUMP_FRAMES,        duration: 600,  floor: true,  category: "Cardio" },
};
