// Motion keyframes for the exercise stick-figure animations.
//
// Coordinate system: 100 (wide) x 160 (tall) viewBox, +y points down.
// Each exercise is a list of poses. ExerciseAnimation threads a Catmull-Rom
// spline through them, so motion stays smooth through the interior keyframes
// and only slows where the rep naturally reverses (no per-keyframe stutter),
// and following the limb's arc keeps the bones from telescoping. The first and
// last frame should share a pose so the loop is seamless.
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
import type { Pose, Point, RigConfig, Equipment } from "../components/exercise/StickFigure";

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
  knee:     [65, 120],
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

// Halfway — forearm horizontal so the bar traces a true arc around the elbow.
const CURL_MID: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [75, 60],
};

export const CURL_FRAMES: Frame[] = [
  { t: 0,    pose: CURL_DOWN, bar: [53, 85] },
  { t: 0.25, pose: CURL_MID,  bar: [75, 60] },
  { t: 0.5,  pose: CURL_UP,   bar: [61, 38] },
  { t: 0.75, pose: CURL_MID,  bar: [75, 60] },
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
  hand:  [67, 42],   // forearm angled up at ~45°
};

const TRI_PUSH_BOTTOM: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [54, 85],   // forearm vertical at lockout
};

// Halfway — forearm horizontal so the hand arcs around the pinned elbow.
const TRI_PUSH_MID: Pose = {
  ...STAND,
  elbow: [50, 60],
  hand:  [74, 66],
};

export const TRI_PUSH_FRAMES: Frame[] = [
  { t: 0,    pose: TRI_PUSH_TOP },
  { t: 0.25, pose: TRI_PUSH_MID },
  { t: 0.5,  pose: TRI_PUSH_BOTTOM },
  { t: 0.75, pose: TRI_PUSH_MID },
  { t: 1,    pose: TRI_PUSH_TOP },
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
// Hinged at the hip, torso ~25° above horizontal at full bone length; the bar
// hangs from the shoulders and is pulled up to the lower ribs with the elbow
// driving back above the torso line.

const ROW_BOTTOM: Pose = {
  head:     [86, 65],
  neck:     [80, 70],
  shoulder: [74, 73],
  elbow:    [66, 96],
  hand:     [58, 118],   // bar hanging
  hip:      [34, 92],
  knee:     [48, 114],
  ankle:    [50, 140],
  toe:      [60, 140],
};

const ROW_TOP: Pose = {
  ...ROW_BOTTOM,
  elbow: [49, 73],   // elbow driven back behind the torso
  hand:  [62, 94],   // bar at the lower ribs
};

export const ROW_FRAMES: Frame[] = [
  { t: 0,   pose: ROW_BOTTOM, bar: [58, 118] },
  { t: 0.5, pose: ROW_TOP,    bar: [62, 94] },
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
// Standing; the arm sweeps from the side up to just above horizontal. A true
// side view hides abduction, so the raise is drawn in the sagittal plane with
// a near-straight arm — slightly higher than the front raise so the two read
// differently.

const LAT_RAISE_DOWN: Pose = {
  ...STAND,
  elbow: [51, 59],
  hand:  [52, 84],
};

const LAT_RAISE_UP: Pose = {
  ...STAND,
  shoulder: [50, 35],
  elbow:    [73, 26],
  hand:     [96, 20],   // arm just above horizontal
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
  elbow: [52, 60],
  hand:  [56, 84],
};

const FRONT_RAISE_UP: Pose = {
  ...STAND,
  shoulder: [50, 36],
  elbow:    [74, 34],
  hand:     [98, 33],   // arm extended forward, hand at shoulder height
};

export const FRONT_RAISE_FRAMES: Frame[] = [
  { t: 0,   pose: FRONT_RAISE_DOWN },
  { t: 0.5, pose: FRONT_RAISE_UP },
  { t: 1,   pose: FRONT_RAISE_DOWN },
];

// ── Deadlift ────────────────────────────────────────────────────────────────
// Bar starts just off the floor; flat back at ~26°, shoulders ahead of the
// knees, then a knee-pass keyframe so the hips and shoulders rise together
// before the tall lockout.

const DEAD_BOTTOM: Pose = {
  head:     [85, 67],
  neck:     [78, 72],
  shoulder: [71, 76],
  elbow:    [62, 100],
  hand:     [54, 124],   // gripping the bar at the floor
  hip:      [30, 96],
  knee:     [48, 118],
  ankle:    [50, 140],
  toe:      [60, 140],
};

// Bar passing the knee — back angle held, hips and chest rising together.
const DEAD_KNEE: Pose = {
  head:     [86, 55],
  neck:     [80, 59],
  shoulder: [73, 63],
  elbow:    [64, 87],
  hand:     [55, 110],
  hip:      [34, 88],
  knee:     [46, 114],
  ankle:    [50, 140],
  toe:      [60, 140],
};

const DEAD_TOP: Pose = {
  ...STAND,
  elbow: [51, 60],
  hand:  [52, 85],       // bar at hip height
};

export const DEAD_FRAMES: Frame[] = [
  { t: 0,   pose: DEAD_BOTTOM, bar: [54, 124] },
  { t: 0.3, pose: DEAD_KNEE,   bar: [55, 110] },
  { t: 0.5, pose: DEAD_TOP,    bar: [52, 85] },
  { t: 0.7, pose: DEAD_KNEE,   bar: [55, 110] },
  { t: 1,   pose: DEAD_BOTTOM, bar: [54, 124] },
];

// ── Romanian deadlift ───────────────────────────────────────────────────────
// Hinge at the hips with soft knees; bar slides down the thighs to mid-shin.

const RDL_TOP: Pose = {
  ...STAND,
  elbow: [51, 60],
  hand:  [52, 85],
};

const RDL_BOTTOM: Pose = {
  head:     [82, 44],
  neck:     [76, 51],
  shoulder: [70, 57],
  elbow:    [64, 82],
  hand:     [58, 106],   // bar just past the knee
  hip:      [38, 88],    // hips pushed back, soft knees
  knee:     [46, 114],
  ankle:    [50, 140],
  toe:      [60, 140],
};

export const RDL_FRAMES: Frame[] = [
  { t: 0,   pose: RDL_TOP,    bar: [52, 85] },
  { t: 0.5, pose: RDL_BOTTOM, bar: [58, 106] },
  { t: 1,   pose: RDL_TOP,    bar: [52, 85] },
];

// ── Lunge ───────────────────────────────────────────────────────────────────
// Split stance with both legs drawn: the front foot stays planted while the
// rear knee drops toward the floor onto the ball of the rear foot.

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
  leg2:     { hip: [50, 87], knee: [42, 114], ankle: [36, 138], toe: [26, 140] },
};

const LUNGE_DOWN: Pose = {
  head:     [50, 38],
  neck:     [50, 48],
  shoulder: [50, 53],
  elbow:    [50, 78],
  hand:     [50, 103],
  hip:      [50, 103],
  knee:     [76, 118],     // front knee far forward, thigh ~ horizontal
  ankle:    [68, 140],     // front foot stays planted
  toe:      [78, 140],
  leg2:     { hip: [50, 103], knee: [40, 126], ankle: [22, 138], toe: [14, 142] },
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
  elbow:    [47, 99],
  hand:     [55, 112],    // hands steady the bar over the hip crease
  hip:      [58, 118],
  knee:     [78, 100],
  ankle:    [76, 124],    // feet planted close to the glutes
  toe:      [86, 126],
};

const HIP_UP: Pose = {
  head:     [22, 80],
  neck:     [30, 82],
  shoulder: [38, 84],
  elbow:    [55, 87],
  hand:     [68, 79],     // bar rides up with the hips
  hip:      [72, 87],     // hips level with the shoulders/knees
  knee:     [88, 108],
  ankle:    [76, 124],
  toe:      [86, 126],
};

export const HIP_FRAMES: Frame[] = [
  { t: 0,   pose: HIP_DOWN, bar: [57, 112] },
  { t: 0.5, pose: HIP_UP,   bar: [70, 79] },
  { t: 1,   pose: HIP_DOWN, bar: [57, 112] },
];

// ── Weighted sit-up ─────────────────────────────────────────────────────────
// Knees bent; torso rises from the floor to upright.

const SITUP_DOWN: Pose = {
  head:     [22, 116],
  neck:     [28, 118],
  shoulder: [34, 120],
  elbow:    [40, 112],   // weight held folded on the chest
  hand:     [50, 114],
  hip:      [60, 122],
  knee:     [78, 100],
  ankle:    [92, 134],
  toe:      [98, 138],
};

const SITUP_UP: Pose = {
  head:     [54, 76],
  neck:     [56, 86],
  shoulder: [58, 92],
  elbow:    [64, 84],
  hand:     [74, 86],
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
// Four-phase gait cycle with both legs and both arms drawn independently and
// counter-phased: strike → mid-swing → strike (sides swapped) → mid-swing.

const RUN_A: Pose = {
  head:     [57, 21],
  neck:     [55, 28],
  shoulder: [54, 36],     // slight forward lean
  elbow:    [66, 50],     // lead arm forward
  hand:     [76, 36],
  arm2:     { shoulder: [54, 36], elbow: [38, 52], hand: [30, 68] },
  hip:      [50, 84],
  knee:     [62, 106],    // lead leg striking
  ankle:    [70, 128],
  toe:      [80, 130],
  leg2:     { hip: [50, 84], knee: [36, 108], ankle: [22, 124], toe: [14, 130] },
};

// Mid-swing — legs passing, one loading under the body, the other driving
// through with a tucked heel; both figure and arms pass the centre line.
const RUN_MID_A: Pose = {
  head:     [57, 17],
  neck:     [55, 24],
  shoulder: [54, 32],
  elbow:    [60, 52],
  hand:     [62, 68],
  arm2:     { shoulder: [54, 32], elbow: [46, 52], hand: [44, 68] },
  hip:      [50, 80],
  knee:     [52, 108],    // stance leg loading
  ankle:    [52, 134],
  toe:      [62, 136],
  leg2:     { hip: [50, 80], knee: [64, 98], ankle: [56, 114], toe: [62, 120] },
};

// The same two phases with the limbs swapped.
const RUN_B: Pose = {
  ...RUN_A,
  elbow: [38, 52], hand: [30, 68],
  arm2:  { shoulder: [54, 36], elbow: [66, 50], hand: [76, 36] },
  knee: [36, 108], ankle: [22, 124], toe: [14, 130],
  leg2:  { hip: [50, 84], knee: [62, 106], ankle: [70, 128], toe: [80, 130] },
};

const RUN_MID_B: Pose = {
  ...RUN_MID_A,
  elbow: [46, 52], hand: [44, 68],
  arm2:  { shoulder: [54, 32], elbow: [60, 52], hand: [62, 68] },
  knee: [64, 98], ankle: [56, 114], toe: [62, 120],
  leg2:  { hip: [50, 80], knee: [52, 108], ankle: [52, 134], toe: [62, 136] },
};

export const RUN_FRAMES: Frame[] = [
  { t: 0,    pose: RUN_A },
  { t: 0.25, pose: RUN_MID_A },
  { t: 0.5,  pose: RUN_B },
  { t: 0.75, pose: RUN_MID_B },
  { t: 1,    pose: RUN_A },
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
  rig?:      RigConfig;
  // Optional list of stage-level equipment (barbells, benches, cables). Each
  // entry has fixed geometry (length, plate size, etc.); per-frame position
  // overrides live in `frame.equipment[id]`. Backwards-compatible with old
  // motions that have no equipment array — the legacy `bench` and `frame.bar`
  // continue to render.
  equipment?: Equipment[];
}

// Default rigs reused below. Most upright/symmetric movements look best with
// mirrored arms+legs; lying/seated/single-side movements turn off the mirrors.
const RIG_SYMMETRIC: RigConfig = { feet: "oval", arm2: "mirror", leg2: "mirror" };
const RIG_SINGLE:    RigConfig = { feet: "oval", arm2: "none",   leg2: "none"   };
const RIG_LEGS_ONLY: RigConfig = { feet: "oval", arm2: "none",   leg2: "mirror" };
const RIG_ASYM:      RigConfig = { feet: "oval", arm2: "independent", leg2: "independent" };

// ── Frame-builder helper ───────────────────────────────────────────────────
// `loop(start, mid, ...bars)` builds the standard three-keyframe ping-pong
// (start → mid → start) used by almost every motion. Optional second/third
// arguments thread `bar` overrides through the same shape.
function loop(start: Pose, mid: Pose, startBar?: Point, midBar?: Point): Frame[] {
  const f0: Frame = startBar ? { t: 0, pose: start, bar: startBar } : { t: 0, pose: start };
  const f1: Frame = midBar   ? { t: 0.5, pose: mid, bar: midBar }   : { t: 0.5, pose: mid };
  const f2: Frame = startBar ? { t: 1, pose: start, bar: startBar } : { t: 1, pose: start };
  return [f0, f1, f2];
}

// ── Reusable equipment instances ───────────────────────────────────────────
// These give every revamped motion a properly-sized barbell, bench, or cable
// out of the box. The editor lets admins reposition, resize, or duplicate
// them, but the defaults already look right on first render.

function flatBench(id = "bench", pos: Point = [28, 86]): Equipment {
  return {
    id, kind: "bench",
    width: 58, height: 5, legHeight: 17, legInset: 4,
    pos, angle: 0, opacity: 0.5,
  };
}

function inclineBench(id = "bench", pos: Point = [22, 92], angle = -22): Equipment {
  return {
    id, kind: "bench",
    width: 60, height: 5, legHeight: 18, legInset: 4,
    pos, angle, opacity: 0.55,
  };
}

function declineBench(id = "bench", pos: Point = [22, 80], angle = 18): Equipment {
  return {
    id, kind: "bench",
    width: 60, height: 5, legHeight: 18, legInset: 4,
    pos, angle, opacity: 0.55,
  };
}

function preacherBench(id = "preacher", pos: Point = [40, 70]): Equipment {
  return {
    id, kind: "bench",
    width: 20, height: 6, legHeight: 24, legInset: 2,
    pos, angle: -45, opacity: 0.55,
  };
}

function barbell(
  id = "bar1", pos: Point = [50, 60], length = 30, angle = 0,
): Equipment {
  return {
    id, kind: "barbell",
    length, plateR: 5.5, hubR: 2, thickness: 1.6,
    pos, angle,
  };
}

function dumbbell(id: string, pos: Point): Equipment {
  return {
    id, kind: "barbell",
    length: 10, plateR: 4, hubR: 1.5, thickness: 1.4,
    pos, angle: 0,
  };
}

function cableHigh(id: string, anchor: Point = [50, 6], handle: Point = [54, 30]): Equipment {
  return { id, kind: "wire", thickness: 1.2, sag: 0, from: anchor, to: handle };
}

function cableLow(id: string, anchor: Point = [50, 154], handle: Point = [50, 90]): Equipment {
  return { id, kind: "wire", thickness: 1.2, sag: 0, from: anchor, to: handle };
}

// A pull-up / hang bar: a thin barbell with stub ends instead of plates.
function gripBar(pos: Point, length = 26, id = "gbar"): Equipment {
  return {
    id, kind: "barbell",
    length, plateR: 1.8, hubR: 0.9, thickness: 1.8,
    pos, angle: 0,
  };
}

// A plyo box / step / squat box drawn with the bench primitive.
function box(pos: Point, width = 28, legHeight = 16, id = "box"): Equipment {
  return {
    id, kind: "bench",
    width, height: 4, legHeight, legInset: 3,
    pos, angle: 0, opacity: 0.5,
  };
}

// A vertical pole (human flag) drawn as a taut wire.
function pole(x = 25, id = "pole"): Equipment {
  return { id, kind: "wire", thickness: 1.8, sag: 0, from: [x, 8], to: [x, 130], opacity: 0.6 };
}

// A ring / suspension strap hanging from the top of the frame down to the
// athlete's hand (the `to` end tracks the hand once motions are baked).
function strap(anchor: Point, handle: Point, id = "strap"): Equipment {
  return { id, kind: "wire", thickness: 1.2, sag: 0, from: anchor, to: handle, opacity: 0.7 };
}

// ── New motion frames ──────────────────────────────────────────────────────
// Compact section that adds starter animations for every default exercise
// that previously had none. Frames are deliberately simple (2 keyframes
// looped) so admins have a clean baseline to refine in the editor.

// Incline DB press — bench tilted up, hands meet a touch closer at lockout.
const INCLINE_DB_BOTTOM: Pose = {
  head:     [82, 70], neck: [74, 75], shoulder: [66, 80],
  elbow:    [48, 70], hand: [62, 52],
  hip:      [38, 92], knee: [25, 110], ankle: [25, 138], toe: [14, 138],
};
const INCLINE_DB_TOP: Pose = {
  ...INCLINE_DB_BOTTOM,
  elbow: [66, 55], hand: [66, 30],
};
const INCLINE_DB_FRAMES = loop(INCLINE_DB_TOP, INCLINE_DB_BOTTOM);

// Decline press — bench tilted down so head ends up lower than feet.
const DECLINE_TOP: Pose = {
  head:     [80, 92], neck: [73, 93], shoulder: [66, 94],
  elbow:    [66, 70], hand: [66, 46],
  hip:      [42, 80], knee: [27, 70], ankle: [27, 60], toe: [16, 60],
};
const DECLINE_BOTTOM: Pose = {
  ...DECLINE_TOP, elbow: [50, 70], hand: [62, 86],
};
const DECLINE_FRAMES = loop(DECLINE_TOP, DECLINE_BOTTOM);

// Cable fly — standing, arms sweep from out-wide to meeting in front.
const FLY_OPEN: Pose = {
  ...STAND,
  shoulder: [50, 36], elbow: [38, 50], hand: [22, 56],
};
const FLY_CLOSE: Pose = {
  ...STAND,
  shoulder: [50, 36], elbow: [56, 50], hand: [78, 50],
};
const CABLE_FLY_FRAMES = loop(FLY_OPEN, FLY_CLOSE);

// Pec deck — seated, elbows pinned to pads, arms sweep together.
const PEC_DECK_OPEN: Pose = {
  head:     [40, 38], neck: [42, 48], shoulder: [44, 56],
  elbow:    [30, 54], hand: [22, 70],
  hip:      [60, 96], knee: [80, 100], ankle: [88, 130], toe: [98, 132],
};
const PEC_DECK_CLOSE: Pose = {
  ...PEC_DECK_OPEN,
  elbow: [58, 54], hand: [76, 68],
};
const PEC_DECK_FRAMES = loop(PEC_DECK_OPEN, PEC_DECK_CLOSE);

// Skull crusher — lying flat, EZ-bar swings to forehead and back.
const SKULL_LOCK: Pose = {
  head:     [80, 78], neck: [73, 81], shoulder: [66, 84],
  elbow:    [66, 60], hand: [66, 36],
  hip:      [42, 86], knee: [27, 104], ankle: [27, 138], toe: [16, 138],
};
const SKULL_LOW: Pose = {
  ...SKULL_LOCK,
  elbow: [66, 60], hand: [82, 70],
};
const SKULL_FRAMES = loop(SKULL_LOCK, SKULL_LOW, [66, 36], [82, 70]);

// Close-grip bench — same shape as bench but the bar+hands stay over the
// chest with elbows tucked in.
const CGBENCH_TOP: Pose = {
  head:     [80, 78], neck: [73, 81], shoulder: [68, 83],
  elbow:    [62, 59], hand: [62, 35],
  hip:      [42, 86], knee: [27, 104], ankle: [27, 138], toe: [16, 138],
};
const CGBENCH_BOTTOM: Pose = {
  ...CGBENCH_TOP, elbow: [52, 100], hand: [60, 78],
};
const CGBENCH_FRAMES = loop(CGBENCH_TOP, CGBENCH_BOTTOM, [62, 35], [60, 78]);

// Overhead tricep extension — standing, upper arm vertical, hands behind head.
const TRI_OH_DOWN: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [50, 22], hand: [56, 38],
};
const TRI_OH_UP: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [50, 22], hand: [50, 4],
};
const TRI_OH_FRAMES = loop(TRI_OH_DOWN, TRI_OH_UP);

// DB shoulder press — like OHP but with mirrored arms (two dumbbells).
const DB_PRESS_FRAMES = OHP_FRAMES;

// Arnold press — like DB press but with a rotation: hands start palms-back at
// chest, end palms-forward overhead. We approximate with a curved hand path.
const ARNOLD_LOW: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [44, 50], hand: [60, 42],
};
const ARNOLD_HIGH: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [50, 22], hand: [50, 6],
};
const ARNOLD_FRAMES = loop(ARNOLD_LOW, ARNOLD_HIGH);

// Lat pulldown variants — adjusted hand width.
const LATPD_WIDE_TOP: Pose = { ...LATPD_TOP, hand: [62, 22] };
const LATPD_WIDE_BOTTOM: Pose = { ...LATPD_BOTTOM, hand: [58, 60] };
const LATPD_WIDE_FRAMES: Frame[] = [
  { t: 0,   pose: LATPD_WIDE_TOP,    bar: [62, 22] },
  { t: 0.5, pose: LATPD_WIDE_BOTTOM, bar: [58, 60] },
  { t: 1,   pose: LATPD_WIDE_TOP,    bar: [62, 22] },
];

const LATPD_CLOSE_TOP: Pose = { ...LATPD_TOP, hand: [54, 24] };
const LATPD_CLOSE_BOTTOM: Pose = { ...LATPD_BOTTOM, hand: [52, 60] };
const LATPD_CLOSE_FRAMES: Frame[] = [
  { t: 0,   pose: LATPD_CLOSE_TOP,    bar: [54, 24] },
  { t: 0.5, pose: LATPD_CLOSE_BOTTOM, bar: [52, 60] },
  { t: 1,   pose: LATPD_CLOSE_TOP,    bar: [54, 24] },
];

// Single-arm pulldown — kneeling under the cable.
const SA_PD_TOP: Pose = {
  head:     [50, 60], neck: [50, 70], shoulder: [50, 76],
  elbow:    [56, 56], hand: [60, 30],
  hip:      [50, 116], knee: [62, 134], ankle: [72, 156], toe: [82, 156],
};
const SA_PD_BOTTOM: Pose = {
  ...SA_PD_TOP, shoulder: [50, 78], elbow: [40, 90], hand: [48, 108],
};
const SA_PD_FRAMES = loop(SA_PD_TOP, SA_PD_BOTTOM);

// T-bar / single-arm DB row — full-length hinge; handle pulled in to the hip.
const TBAR_BOT: Pose = {
  head:     [86, 65], neck: [80, 70], shoulder: [74, 73],
  elbow:    [65, 95], hand: [56, 116],
  hip:      [34, 92], knee: [48, 114], ankle: [50, 140], toe: [60, 140],
};
const TBAR_TOP: Pose = { ...TBAR_BOT, elbow: [50, 78], hand: [58, 98] };
const TBAR_FRAMES = loop(TBAR_BOT, TBAR_TOP, [56, 116], [58, 98]);

const DB_ROW_FRAMES = TBAR_FRAMES;
const MEADOWS_FRAMES = TBAR_FRAMES;

// Cable seated row — upright, arms pulled in to the abdomen.
const CS_ROW_FAR: Pose = {
  head:     [22, 50], neck: [24, 60], shoulder: [26, 68],
  elbow:    [44, 72], hand: [66, 78],
  hip:      [38, 96], knee: [62, 96], ankle: [86, 116], toe: [94, 122],
};
const CS_ROW_NEAR: Pose = { ...CS_ROW_FAR, elbow: [10, 76], hand: [36, 88] };
const CS_ROW_FRAMES = loop(CS_ROW_FAR, CS_ROW_NEAR);

const CABLE_ROW_FRAMES = CS_ROW_FRAMES;

// Face pull — standing, cable at face height, elbows pulled wide and back.
const FACE_PULL_AWAY: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [60, 40], hand: [76, 36],
};
const FACE_PULL_IN: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [38, 36], hand: [52, 30],
};
const FACE_PULL_FRAMES = loop(FACE_PULL_AWAY, FACE_PULL_IN);

// Reverse fly — full-length hinge; the arms hang, then sweep back and up
// behind the torso (the side view of scapular retraction).
const REV_FLY_DOWN: Pose = {
  head:     [86, 65], neck: [80, 70], shoulder: [74, 73],
  elbow:    [72, 98], hand: [70, 122],
  hip:      [34, 92], knee: [48, 114], ankle: [50, 140], toe: [60, 140],
};
const REV_FLY_UP: Pose = {
  ...REV_FLY_DOWN, elbow: [51, 65], hand: [28, 60],
};
const REV_FLY_FRAMES = loop(REV_FLY_DOWN, REV_FLY_UP);

// DB curl / hammer / incline curl — share the bb curl skeleton.
const DB_CURL_FRAMES = CURL_FRAMES;
const HAMMER_FRAMES  = CURL_FRAMES;

// Preacher curl — torso leans forward over the pad; elbows pinned.
const PREACHER_DOWN: Pose = {
  head:     [60, 30], neck: [58, 38], shoulder: [56, 46],
  elbow:    [58, 72], hand: [70, 90],
  hip:      [38, 88], knee: [44, 116], ankle: [50, 140], toe: [60, 140],
};
const PREACHER_UP: Pose = { ...PREACHER_DOWN, hand: [66, 50] };
const PREACHER_FRAMES = loop(PREACHER_DOWN, PREACHER_UP, [70, 90], [66, 50]);

// Incline curl — lying back, arms hang behind the body.
const INCLINE_CURL_DOWN: Pose = {
  head:     [80, 70], neck: [74, 75], shoulder: [68, 80],
  elbow:    [62, 102], hand: [62, 124],
  hip:      [40, 92], knee: [25, 110], ankle: [25, 138], toe: [14, 138],
};
const INCLINE_CURL_UP: Pose = { ...INCLINE_CURL_DOWN, elbow: [62, 100], hand: [78, 78] };
const INCLINE_CURL_FRAMES = loop(INCLINE_CURL_DOWN, INCLINE_CURL_UP);

// Cable lateral raise — like a lateral raise but with the cable behind.
const CABLE_LAT_FRAMES = LAT_RAISE_FRAMES;

// Upright row — bar travels straight up the body to the chest, elbows leading
// high above the hands.
const UPRIGHT_DOWN: Pose = {
  ...STAND, elbow: [51, 60], hand: [52, 85],
};
const UPRIGHT_UP: Pose = {
  ...STAND, shoulder: [50, 38], elbow: [66, 26], hand: [54, 44],
};
const UPRIGHT_FRAMES = loop(UPRIGHT_DOWN, UPRIGHT_UP, [52, 85], [54, 44]);

const DB_SHRUG_FRAMES = SHRUG_FRAMES;

// Front squat — like back squat but bar in front rack; torso stays tall.
const FRONT_SQ_TOP: Pose = {
  ...STAND, elbow: [44, 50], hand: [42, 36],
};
const FRONT_SQ_BOTTOM: Pose = {
  head:     [50, 48], neck: [50, 56], shoulder: [50, 64],
  elbow:    [44, 78], hand: [42, 66],
  hip:      [38, 110], knee: [62, 117], ankle: [50, 140], toe: [60, 140],
};
const FRONT_SQ_FRAMES = loop(FRONT_SQ_TOP, FRONT_SQ_BOTTOM, [42, 36], [42, 66]);

// Leg press — seated, knees travel toward chest, then drive away.
const LEG_PRESS_OUT: Pose = {
  head:     [22, 80], neck: [24, 86], shoulder: [26, 92],
  elbow:    [26, 110], hand: [26, 128],
  hip:      [42, 108], knee: [70, 100], ankle: [96, 96], toe: [96, 104],
};
const LEG_PRESS_IN: Pose = {
  ...LEG_PRESS_OUT, knee: [64, 84], ankle: [82, 98], toe: [86, 106],
};
const LEG_PRESS_FRAMES = loop(LEG_PRESS_OUT, LEG_PRESS_IN);
const LEG_PRESS_1_FRAMES = LEG_PRESS_FRAMES;

// Bulgarian split squat — back foot up, front knee bends deeply.
const BULG_TOP: Pose = {
  head:     [50, 22], neck: [50, 32], shoulder: [50, 38],
  elbow:    [50, 62], hand: [50, 87],
  hip:      [50, 88], knee: [54, 116], ankle: [56, 140], toe: [66, 140],
  arm2:     { shoulder: [50, 38], elbow: [50, 62], hand: [50, 87] },
  leg2:     { hip: [50, 88], knee: [42, 110], ankle: [28, 124], toe: [22, 132] },
};
const BULG_BOTTOM: Pose = {
  head:     [50, 40], neck: [50, 50], shoulder: [50, 56],
  elbow:    [50, 80], hand: [50, 105],
  hip:      [50, 105], knee: [70, 122], ankle: [60, 140], toe: [70, 140],
  arm2:     { shoulder: [50, 56], elbow: [50, 80], hand: [50, 105] },
  leg2:     { hip: [50, 105], knee: [36, 130], ankle: [30, 138], toe: [24, 144] },
};
const BULG_FRAMES = loop(BULG_TOP, BULG_BOTTOM);

// Step-up — drive one leg up onto a box, hips rise.
const STEP_DOWN: Pose = {
  head:     [50, 24], neck: [50, 34], shoulder: [50, 40],
  elbow:    [50, 62], hand: [50, 87],
  hip:      [50, 90], knee: [70, 102], ankle: [82, 122], toe: [92, 122],
  arm2:     { shoulder: [50, 40], elbow: [50, 62], hand: [50, 87] },
  leg2:     { hip: [50, 90], knee: [48, 118], ankle: [46, 140], toe: [56, 140] },
};
const STEP_UP_POSE: Pose = {
  ...STEP_DOWN,
  head: [62, 12], neck: [62, 20], shoulder: [62, 26],
  elbow: [63, 51], hand: [64, 76],
  hip: [62, 76], knee: [72, 98], ankle: [82, 122], toe: [92, 122],
  leg2: { hip: [62, 76], knee: [56, 102], ankle: [54, 126], toe: [62, 130] },
};
const STEP_UP_FRAMES = loop(STEP_DOWN, STEP_UP_POSE);

// Good morning — bar racked on the back (squat-style grip rides with the
// shoulders), full-length torso hinging to ~45°.
const GOOD_MORN_TOP: Pose = {
  ...STAND, elbow: [56, 50], hand: [54, 35],
};
const GOOD_MORN_HINGE: Pose = {
  head:     [82, 44], neck: [76, 51], shoulder: [70, 57],
  elbow:    [76, 72], hand: [74, 57],
  hip:      [38, 88], knee: [46, 114], ankle: [50, 140], toe: [60, 140],
};
const GOOD_MORN_FRAMES = loop(GOOD_MORN_TOP, GOOD_MORN_HINGE, [50, 30], [70, 52]);

// Seated leg curl — knees go from straight to bent.
const LEG_CURL_S_OUT: Pose = {
  head:     [22, 50], neck: [24, 60], shoulder: [26, 68],
  elbow:    [26, 88], hand: [26, 108],
  hip:      [40, 88], knee: [62, 88], ankle: [88, 88], toe: [96, 96],
};
const LEG_CURL_S_IN: Pose = {
  ...LEG_CURL_S_OUT, ankle: [70, 116], toe: [78, 124],
};
const LEG_CURL_S_FRAMES = loop(LEG_CURL_S_OUT, LEG_CURL_S_IN);

// Seated calf raise — heels lift while seated.
const CALF_SEAT_DOWN: Pose = {
  head:     [22, 50], neck: [24, 60], shoulder: [26, 68],
  elbow:    [26, 88], hand: [26, 108],
  hip:      [40, 88], knee: [60, 110], ankle: [60, 140], toe: [70, 140],
};
const CALF_SEAT_UP: Pose = { ...CALF_SEAT_DOWN, knee: [60, 104], ankle: [62, 130], toe: [70, 140] };
const CALF_SEAT_FRAMES = loop(CALF_SEAT_DOWN, CALF_SEAT_UP);

// Back extension (roman) — hips pinned, torso hinges.
const ROMAN_DOWN: Pose = {
  head:     [82, 100], neck: [76, 102], shoulder: [70, 104],
  elbow:    [70, 122], hand: [70, 138],
  hip:      [44, 96], knee: [22, 110], ankle: [4, 124], toe: [-4, 130],
};
const ROMAN_UP: Pose = {
  head:     [82, 78], neck: [76, 82], shoulder: [70, 86],
  elbow:    [70, 104], hand: [70, 122],
  hip:      [44, 92], knee: [22, 110], ankle: [4, 124], toe: [-4, 130],
};
const ROMAN_FRAMES = loop(ROMAN_DOWN, ROMAN_UP);

const W_ROMAN_FRAMES = ROMAN_FRAMES;

// Cable crunch — kneeling under the stack, rope held beside the head; the
// spine flexes so the shoulders roll down-and-forward toward the knees.
const CABLE_CRUNCH_TALL: Pose = {
  head:     [54, 38], neck: [53, 45], shoulder: [52, 52],
  elbow:    [64, 51], hand: [60, 40],
  hip:      [50, 96], knee: [60, 116], ankle: [70, 142], toe: [80, 142],
};
const CABLE_CRUNCH_DOWN: Pose = {
  head:     [72, 88], neck: [67, 81], shoulder: [62, 74],
  elbow:    [74, 65], hand: [70, 54],
  hip:      [50, 96], knee: [60, 116], ankle: [70, 142], toe: [80, 142],
};
const CABLE_CRUNCH_FRAMES = loop(CABLE_CRUNCH_TALL, CABLE_CRUNCH_DOWN);

// Ab wheel — kneel, roll the wheel out and back.
const AB_WHEEL_UP: Pose = {
  head:     [50, 48], neck: [54, 56], shoulder: [58, 64],
  elbow:    [70, 78], hand: [82, 92],
  hip:      [40, 96], knee: [28, 122], ankle: [16, 140], toe: [16, 148],
};
const AB_WHEEL_OUT: Pose = {
  head:     [56, 96], neck: [62, 100], shoulder: [68, 104],
  elbow:    [82, 116], hand: [98, 132],
  hip:      [28, 116], knee: [16, 138], ankle: [4, 152], toe: [4, 156],
};
const AB_WHEEL_FRAMES = loop(AB_WHEEL_UP, AB_WHEEL_OUT);

// Hanging leg raise — hang from bar, lift legs.
const HANGING_DOWN: Pose = {
  head:     [50, 30], neck: [50, 40], shoulder: [50, 48],
  elbow:    [50, 38], hand: [50, 16],
  hip:      [50, 92], knee: [50, 122], ankle: [50, 152], toe: [60, 154],
};
const HANGING_UP: Pose = {
  ...HANGING_DOWN, hip: [48, 88], knee: [74, 89], ankle: [96, 90], toe: [98, 82],
};
const HANGING_FRAMES = loop(HANGING_DOWN, HANGING_UP);

// Dragon flag — lying, lift the straight body off the bench.
const DRAGON_DOWN: Pose = {
  head:     [22, 96], neck: [30, 96], shoulder: [38, 96],
  elbow:    [30, 78], hand: [22, 60],
  hip:      [58, 96], knee: [72, 96], ankle: [88, 96], toe: [96, 102],
};
const DRAGON_UP: Pose = {
  head:     [22, 96], neck: [30, 92], shoulder: [38, 88],
  elbow:    [30, 70], hand: [22, 52],
  hip:      [58, 70], knee: [66, 58], ankle: [76, 44], toe: [82, 38],
};
const DRAGON_FRAMES = loop(DRAGON_DOWN, DRAGON_UP);

// Pallof press — standing, cable to one side, press out & resist rotation.
const PALLOF_IN: Pose = {
  ...STAND, elbow: [56, 50], hand: [44, 56],
};
const PALLOF_OUT: Pose = {
  ...STAND, elbow: [56, 50], hand: [78, 50],
};
const PALLOF_FRAMES = loop(PALLOF_IN, PALLOF_OUT);

// GHD sit-up — hips pinned on the pad, torso swings at full length from a
// deep recline (arms reaching overhead) up past vertical.
const GHD_DOWN: Pose = {
  head:     [90, 60], neck: [86, 65], shoulder: [82, 70],
  elbow:    [88, 88], hand: [92, 110],
  hip:      [46, 100], knee: [20, 110], ankle: [-2, 124], toe: [-4, 132],
};
const GHD_UP: Pose = {
  head:     [58, 46], neck: [56, 50], shoulder: [54, 54],
  elbow:    [60, 76], hand: [64, 98],
  hip:      [46, 100], knee: [20, 110], ankle: [-2, 124], toe: [-4, 132],
};
const GHD_FRAMES = loop(GHD_DOWN, GHD_UP);

// Side plank — body angled, supported on one elbow.
const SIDE_PLANK_HOLD: Pose = {
  head:     [16, 76], neck: [22, 78], shoulder: [28, 82],
  elbow:    [22, 96], hand: [22, 114],
  hip:      [56, 100], knee: [76, 122], ankle: [96, 138], toe: [96, 144],
};
const SIDE_PLANK_DIP: Pose = {
  ...SIDE_PLANK_HOLD, hip: [56, 110],
};
const SIDE_PLANK_FRAMES = loop(SIDE_PLANK_HOLD, SIDE_PLANK_DIP);

// Cardio — quick recognisable two-frame loops.

// Cycling — seated with a forward lean onto the bars; the feet trace a proper
// four-point pedal circle (front → bottom → back → top), legs counter-phased.
const CYCLE_BODY = {
  head: [51, 31] as Point, neck: [51, 38] as Point, shoulder: [52, 46] as Point,
  elbow: [64, 58] as Point, hand: [76, 68] as Point,
  hip: [44, 94] as Point,
};
const CYCLE_F: Pose = {   // primary foot at the front of the circle
  ...CYCLE_BODY,
  knee: [64, 98], ankle: [70, 118], toe: [79, 121],
  leg2: { hip: [44, 94], knee: [60, 107], ankle: [42, 118], toe: [51, 121] },
};
const CYCLE_BTM: Pose = { // primary foot at the bottom, other at the top
  ...CYCLE_BODY,
  knee: [56, 111], ankle: [56, 132], toe: [65, 135],
  leg2: { hip: [44, 94], knee: [62, 84], ankle: [56, 104], toe: [65, 107] },
};
const CYCLE_BK: Pose = {  // sides swapped — primary foot at the back
  ...CYCLE_BODY,
  knee: [60, 107], ankle: [42, 118], toe: [51, 121],
  leg2: { hip: [44, 94], knee: [64, 98], ankle: [70, 118], toe: [79, 121] },
};
const CYCLE_TOP: Pose = {
  ...CYCLE_BODY,
  knee: [62, 84], ankle: [56, 104], toe: [65, 107],
  leg2: { hip: [44, 94], knee: [56, 111], ankle: [56, 132], toe: [65, 135] },
};
const CYCLE_FRAMES: Frame[] = [
  { t: 0,    pose: CYCLE_F },
  { t: 0.25, pose: CYCLE_BTM },
  { t: 0.5,  pose: CYCLE_BK },
  { t: 0.75, pose: CYCLE_TOP },
  { t: 1,    pose: CYCLE_F },
];

// Rowing erg — catch (seat forward, knees up, arms long) to finish (legs
// extended, lean back, handle at the ribs). The feet stay strapped in place.
const ROW_FAR: Pose = {
  head:     [26, 57], neck: [28, 64], shoulder: [32, 70],
  elbow:    [46, 78], hand: [60, 86],
  hip:      [48, 102], knee: [72, 85], ankle: [82, 108], toe: [90, 112],
};
const ROW_NEAR: Pose = {
  head:     [15, 55], neck: [17, 62], shoulder: [20, 68],
  elbow:    [6, 72], hand: [26, 80],
  hip:      [34, 102], knee: [62, 92], ankle: [82, 108], toe: [90, 112],
};
const ROW_ERG_FRAMES = loop(ROW_FAR, ROW_NEAR);

// Stair climber — alternating leg drive upward.
const STAIR_A: Pose = {
  ...STAND,
  hip: [50, 86], knee: [62, 102], ankle: [74, 124], toe: [84, 126],
  leg2: { hip: [50, 86], knee: [42, 114], ankle: [38, 140], toe: [48, 140] },
};
const STAIR_B: Pose = {
  ...STAND,
  hip: [50, 86], knee: [42, 102], ankle: [38, 124], toe: [48, 126],
  leg2: { hip: [50, 86], knee: [62, 114], ankle: [74, 140], toe: [84, 140] },
};
const STAIR_FRAMES = loop(STAIR_A, STAIR_B);

// Assault bike — pedal stroke plus alternating arm levers.
const ASSAULT_A: Pose = {
  head:     [51, 31], neck: [51, 38], shoulder: [52, 46],
  elbow:    [64, 56], hand: [74, 42],
  arm2:     { shoulder: [52, 46], elbow: [42, 58], hand: [34, 72] },
  hip:      [44, 94], knee: [64, 98], ankle: [70, 118], toe: [79, 121],
  leg2:     { hip: [44, 94], knee: [60, 107], ankle: [42, 118], toe: [51, 121] },
};
const ASSAULT_B: Pose = {
  ...ASSAULT_A,
  elbow: [42, 58], hand: [34, 44],
  arm2: { shoulder: [52, 46], elbow: [64, 56], hand: [74, 70] },
  knee: [60, 107], ankle: [42, 118], toe: [51, 121],
  leg2: { hip: [44, 94], knee: [64, 98], ankle: [70, 118], toe: [79, 121] },
};
const ASSAULT_FRAMES = loop(ASSAULT_A, ASSAULT_B);

// Swimming — horizontal, arms windmill while the legs flutter-kick in
// counter-phase.
const SWIM_A: Pose = {
  head:     [80, 92], neck: [74, 94], shoulder: [68, 96],
  elbow:    [82, 84], hand: [92, 76],
  arm2:     { shoulder: [68, 96], elbow: [54, 92], hand: [40, 92] },
  hip:      [42, 100], knee: [24, 96], ankle: [6, 88], toe: [0, 84],
  leg2:     { hip: [42, 100], knee: [22, 108], ankle: [6, 112], toe: [0, 118] },
};
const SWIM_B: Pose = {
  ...SWIM_A,
  elbow: [54, 92], hand: [40, 92],
  arm2: { shoulder: [68, 96], elbow: [82, 84], hand: [92, 76] },
  knee: [22, 108], ankle: [6, 112], toe: [0, 118],
  leg2: { hip: [42, 100], knee: [24, 96], ankle: [6, 88], toe: [0, 84] },
};
const SWIM_FRAMES = loop(SWIM_A, SWIM_B);

// Sled push — low body angle, arms locked out forward.
const SLED_A: Pose = {
  head:     [70, 36], neck: [66, 44], shoulder: [62, 52],
  elbow:    [76, 58], hand: [88, 62],
  hip:      [44, 90], knee: [60, 110], ankle: [78, 130], toe: [88, 130],
  leg2:     { hip: [44, 90], knee: [28, 120], ankle: [16, 138], toe: [10, 144] },
};
const SLED_B: Pose = {
  ...SLED_A,
  knee: [28, 110], ankle: [16, 130], toe: [10, 136],
  leg2: { hip: [44, 90], knee: [60, 120], ankle: [78, 138], toe: [88, 138] },
};
const SLED_FRAMES = loop(SLED_A, SLED_B);

// Battle rope — athletic stance, the two arms whip alternately.
const BATTLE_UP: Pose = {
  ...STAND,
  hip: [50, 92], knee: [54, 116],
  elbow: [60, 52], hand: [72, 32],
  arm2: { shoulder: [50, 36], elbow: [44, 56], hand: [36, 74] },
};
const BATTLE_DOWN: Pose = {
  ...STAND,
  hip: [50, 92], knee: [54, 116],
  elbow: [44, 56], hand: [36, 74],
  arm2: { shoulder: [50, 36], elbow: [60, 52], hand: [72, 32] },
};
const BATTLE_FRAMES = loop(BATTLE_UP, BATTLE_DOWN);

// HIIT — burpee-ish: stand → crouch → low pushup → stand.
const HIIT_STAND: Pose = { ...STAND };
const HIIT_SQUAT: Pose = {
  head: [50, 52], neck: [50, 60], shoulder: [50, 65],
  elbow: [50, 90], hand: [50, 112],
  hip: [46, 108], knee: [70, 116], ankle: [56, 136], toe: [66, 140],
};
const HIIT_DOWN: Pose = {
  head: [82, 132], neck: [74, 134], shoulder: [68, 136],
  elbow: [45, 140], hand: [68, 150],
  hip: [40, 138], knee: [18, 140], ankle: [-2, 142], toe: [-2, 150],
};
const HIIT_FRAMES: Frame[] = [
  { t: 0,    pose: HIIT_STAND },
  { t: 0.33, pose: HIIT_SQUAT },
  { t: 0.66, pose: HIIT_DOWN },
  { t: 1,    pose: HIIT_STAND },
];

// ── More baseline motions ────────────────────────────────────────────────
// Starter animations for every remaining default exercise that had none.
// Like the section above, these favour simple, readable two-keyframe loops
// that admins can refine in the editor; close variants reuse a neighbouring
// movement's skeleton (e.g. chin-ups share the pull-up arc). New skeletons are
// authored only where the mechanics differ enough to need them (handstands,
// planches, levers, the human flag, single-leg squats, neck work, …).

// Two extra rigs: arms mirrored with independent legs (mountain climber,
// loaded carries) and independent arms with a single leg-line (human flag).
const RIG_LEGS_IND: RigConfig = { feet: "oval", arm2: "mirror",       leg2: "independent" };
const RIG_ARMS_IND: RigConfig = { feet: "oval", arm2: "independent",  leg2: "none"        };

// Seated chest-press machine — press forward from the chest.
const MCHEST_BASE: Pose = {
  head: [36, 40], neck: [38, 48], shoulder: [40, 58],
  elbow: [40, 76], hand: [40, 96],
  hip: [48, 92], knee: [70, 96], ankle: [92, 116], toe: [98, 122],
};
const MCHEST_BACK: Pose  = { ...MCHEST_BASE, elbow: [30, 64], hand: [46, 60] };
const MCHEST_PRESS: Pose = { ...MCHEST_BASE, elbow: [56, 60], hand: [74, 58] };
const MCHEST_FRAMES = loop(MCHEST_BACK, MCHEST_PRESS);

// DB pullover — lying on a bench, arms arc from behind the head to over chest.
const PULLOVER_OVER: Pose = {
  head: [80, 80], neck: [73, 82], shoulder: [66, 84],
  elbow: [60, 64], hand: [56, 46],
  hip: [42, 86], knee: [27, 104], ankle: [27, 138], toe: [16, 138],
};
const PULLOVER_BACK: Pose = { ...PULLOVER_OVER, elbow: [78, 66], hand: [92, 58] };
const PULLOVER_FRAMES = loop(PULLOVER_OVER, PULLOVER_BACK);

// Tricep kickback — hinged torso, upper arm pinned along the ribs, forearm
// swings from hanging to extended straight back.
const KICKBACK_BENT: Pose = {
  head: [86, 65], neck: [80, 70], shoulder: [74, 73],
  elbow: [52, 82], hand: [50, 104],
  hip: [34, 92], knee: [48, 114], ankle: [50, 140], toe: [60, 140],
};
const KICKBACK_EXT: Pose = { ...KICKBACK_BENT, hand: [28, 78] };
const KICKBACK_FRAMES = loop(KICKBACK_BENT, KICKBACK_EXT);

// Straight-arm pulldown — standing, near-straight arms sweep from shoulder
// height down to the thighs.
const STRAIGHT_ARM_TOP: Pose = { ...STAND, shoulder: [50, 36], elbow: [70, 39], hand: [90, 42] };
const STRAIGHT_ARM_BOT: Pose = { ...STAND, shoulder: [50, 36], elbow: [53, 60], hand: [56, 84] };
const STRAIGHT_ARM_FRAMES = loop(STRAIGHT_ARM_TOP, STRAIGHT_ARM_BOT);

// Seal row — lying prone on a raised bench; arms hang then the elbow drives up
// past the torso as the weight comes to the ribs.
const SEAL_DOWN: Pose = {
  head: [80, 84], neck: [74, 86], shoulder: [68, 88],
  elbow: [67, 108], hand: [65, 128],
  hip: [44, 88], knee: [24, 88], ankle: [4, 88], toe: [-2, 94],
};
const SEAL_UP: Pose = { ...SEAL_DOWN, elbow: [64, 72], hand: [64, 94] };
const SEAL_FRAMES = loop(SEAL_DOWN, SEAL_UP);

// Inverted / ring row — supine under a bar, body straight, chest rises to the bar.
const IROW_DOWN: Pose = {
  head: [80, 102], neck: [74, 102], shoulder: [66, 104],
  elbow: [60, 86], hand: [58, 66],
  hip: [44, 112], knee: [24, 118], ankle: [4, 124], toe: [4, 132],
};
const IROW_UP: Pose = {
  ...IROW_DOWN,
  head: [80, 90], neck: [74, 90], shoulder: [66, 92],
  elbow: [50, 80], hip: [44, 100], knee: [24, 108], ankle: [4, 116],
};
const IROW_FRAMES = loop(IROW_DOWN, IROW_UP);

// Landmine press — angled one-arm press up and forward.
const LANDMINE_LOW: Pose  = { ...STAND, shoulder: [50, 38], elbow: [58, 46], hand: [64, 34] };
const LANDMINE_HIGH: Pose = { ...STAND, shoulder: [50, 36], elbow: [62, 28], hand: [74, 14] };
const LANDMINE_FRAMES = loop(LANDMINE_LOW, LANDMINE_HIGH);

// Rack pull — partial deadlift from knee height to lockout.
const RACK_BOT: Pose = {
  head: [83, 51], neck: [77, 56], shoulder: [70, 62],
  elbow: [61, 86], hand: [53, 110],
  hip: [38, 90], knee: [47, 113], ankle: [50, 140], toe: [60, 140],
};
const RACK_TOP: Pose = { ...STAND, elbow: [51, 60], hand: [52, 85] };
const RACK_FRAMES = loop(RACK_BOT, RACK_TOP, [53, 110], [52, 85]);

// Glute bridge / frog pump — floor variant of the hip thrust.
const GB_DOWN: Pose = {
  head: [22, 118], neck: [30, 118], shoulder: [38, 118],
  elbow: [42, 128], hand: [46, 138],
  hip: [60, 120], knee: [81, 104], ankle: [82, 126], toe: [92, 128],
};
const GB_UP: Pose = { ...GB_DOWN, hip: [60, 100], knee: [86, 104] };
const GB_FRAMES = loop(GB_DOWN, GB_UP);

// Cable glute kickback — quadruped, one leg drives back and up.
const GKB_DOWN: Pose = {
  head: [80, 84], neck: [74, 86], shoulder: [68, 88],
  elbow: [68, 108], hand: [68, 124],
  hip: [40, 92], knee: [40, 120], ankle: [52, 138], toe: [60, 140],
};
const GKB_UP: Pose = { ...GKB_DOWN, knee: [22, 104], ankle: [6, 94], toe: [0, 88] };
const GKB_FRAMES = loop(GKB_DOWN, GKB_UP);

// Kettlebell swing — three phases: the bell hiked back between the legs on a
// full hinge, the hips snapped to a tall plank with the bell still low, then
// the float out to chest height.
const KB_BACK: Pose = {
  head: [84, 48], neck: [78, 54], shoulder: [72, 60],
  elbow: [60, 84], hand: [48, 106],   // bell hiked behind the knees
  hip: [36, 90], knee: [46, 114], ankle: [50, 140], toe: [60, 140],
};
const KB_SNAP: Pose = { ...STAND, elbow: [53, 59], hand: [58, 82] };
const KB_FRONT: Pose = { ...STAND, shoulder: [50, 36], elbow: [72, 42], hand: [94, 46] };
const KB_SWING_FRAMES: Frame[] = [
  { t: 0,   pose: KB_BACK },
  { t: 0.3, pose: KB_SNAP },
  { t: 0.5, pose: KB_FRONT },
  { t: 0.7, pose: KB_SNAP },
  { t: 1,   pose: KB_BACK },
];

// Nordic curl — knees anchored, body lowers forward under control.
const NORDIC_UP: Pose = {
  head: [48, 46], neck: [47, 54], shoulder: [46, 62],
  elbow: [46, 80], hand: [46, 98],
  hip: [42, 110], knee: [40, 138], ankle: [30, 140], toe: [24, 148],
};
const NORDIC_DOWN: Pose = {
  head: [96, 74], neck: [92, 80], shoulder: [88, 86],
  elbow: [90, 104], hand: [96, 120],
  hip: [58, 118], knee: [40, 138], ankle: [30, 140], toe: [24, 148],
};
const NORDIC_FRAMES = loop(NORDIC_UP, NORDIC_DOWN);

// V-up — lying flat with the arms stretched overhead along the floor, then
// folding hands and feet up toward each other.
const VUP_DOWN: Pose = {
  head: [82, 118], neck: [74, 118], shoulder: [66, 118],
  elbow: [46, 116], hand: [26, 114],
  hip: [44, 118], knee: [24, 118], ankle: [6, 118], toe: [2, 112],
};
const VUP_UP: Pose = {
  head: [62, 86], neck: [60, 92], shoulder: [56, 98],
  elbow: [67, 86], hand: [78, 74],
  hip: [44, 118], knee: [58, 100], ankle: [72, 84], toe: [78, 78],
};
const VUP_FRAMES = loop(VUP_DOWN, VUP_UP);

// Bicycle crunch — supine, opposite knee and elbow cycle together.
const BIKE_A: Pose = {
  head: [80, 104], neck: [74, 104], shoulder: [68, 104],
  elbow: [62, 96], hand: [56, 88],
  hip: [44, 108], knee: [58, 84], ankle: [64, 104], toe: [72, 104],
  arm2: { shoulder: [68, 104], elbow: [74, 112], hand: [82, 118] },
  leg2: { hip: [44, 108], knee: [26, 110], ankle: [8, 112], toe: [2, 118] },
};
const BIKE_B: Pose = {
  ...BIKE_A,
  elbow: [74, 112], hand: [82, 118],
  knee: [26, 110], ankle: [8, 112], toe: [2, 118],
  arm2: { shoulder: [68, 104], elbow: [62, 96], hand: [56, 88] },
  leg2: { hip: [44, 108], knee: [58, 84], ankle: [64, 104], toe: [72, 104] },
};
const BIKE_FRAMES = loop(BIKE_A, BIKE_B);

// Russian twist — seated lean-back, hands sweep across the body.
const RT_A: Pose = {
  head: [40, 56], neck: [42, 64], shoulder: [44, 72],
  elbow: [54, 78], hand: [66, 76],
  hip: [58, 98], knee: [78, 90], ankle: [92, 110], toe: [98, 114],
};
const RT_B: Pose = { ...RT_A, elbow: [50, 86], hand: [56, 92] };
const RT_FRAMES = loop(RT_A, RT_B);

// Cable woodchop — diagonal pull from high on one side to low on the other.
const WC_HIGH: Pose = { ...STAND, shoulder: [50, 36], elbow: [64, 22], hand: [82, 8] };
const WC_LOW: Pose  = { ...STAND, shoulder: [50, 38], elbow: [42, 58], hand: [30, 76] };
const WC_FRAMES = loop(WC_HIGH, WC_LOW);

// Dead bug — supine, arm and opposite leg extend and return.
const DEADBUG_IN: Pose = {
  head: [78, 100], neck: [70, 100], shoulder: [62, 100],
  elbow: [66, 84], hand: [68, 70],
  hip: [44, 104], knee: [34, 90], ankle: [26, 76], toe: [20, 72],
};
const DEADBUG_OUT: Pose = {
  ...DEADBUG_IN,
  elbow: [72, 80], hand: [84, 72],
  knee: [30, 100], ankle: [12, 96], toe: [6, 100],
};
const DEADBUG_FRAMES = loop(DEADBUG_IN, DEADBUG_OUT);

// Bird dog — quadruped, opposite arm and leg reach out level.
const BIRDDOG_IN: Pose = {
  head: [80, 84], neck: [74, 86], shoulder: [68, 88],
  elbow: [68, 104], hand: [68, 120],
  hip: [40, 92], knee: [40, 120], ankle: [52, 138], toe: [60, 140],
};
const BIRDDOG_OUT: Pose = {
  ...BIRDDOG_IN,
  elbow: [80, 92], hand: [92, 84],
  knee: [22, 92], ankle: [4, 92], toe: [-2, 88],
};
const BIRDDOG_FRAMES = loop(BIRDDOG_IN, BIRDDOG_OUT);

// L-sit — supported on the hands, legs straight out (held, subtle settle).
const LSIT_HOLD: Pose = {
  head: [50, 48], neck: [50, 56], shoulder: [50, 64],
  elbow: [50, 82], hand: [50, 100],
  hip: [50, 96], knee: [72, 96], ankle: [94, 96], toe: [98, 102],
};
const LSIT_SETTLE: Pose = { ...LSIT_HOLD, hip: [50, 98], knee: [72, 98], ankle: [94, 98] };
const LSIT_FRAMES = loop(LSIT_HOLD, LSIT_SETTLE);

// V-sit — like an L-sit but legs raised high into a V.
const VSIT_HOLD: Pose = {
  head: [50, 54], neck: [50, 62], shoulder: [50, 70],
  elbow: [58, 84], hand: [68, 80],
  hip: [50, 96], knee: [66, 76], ankle: [84, 58], toe: [92, 52],
};
const VSIT_SETTLE: Pose = { ...VSIT_HOLD, knee: [66, 78], ankle: [84, 60] };
const VSIT_FRAMES = loop(VSIT_HOLD, VSIT_SETTLE);

// Hollow hold — supine dish, arms overhead, off the floor (held).
const HOLLOW_A: Pose = {
  head: [76, 102], neck: [70, 100], shoulder: [64, 98],
  elbow: [74, 90], hand: [86, 82],
  hip: [44, 104], knee: [28, 98], ankle: [12, 92], toe: [6, 88],
};
const HOLLOW_B: Pose = { ...HOLLOW_A, hip: [44, 106], knee: [28, 100] };
const HOLLOW_FRAMES = loop(HOLLOW_A, HOLLOW_B);

// Mountain climber — plank with the knees driving in alternately.
const MTN_A: Pose = {
  head: [82, 100], neck: [74, 102], shoulder: [66, 104],
  elbow: [66, 122], hand: [60, 138],
  hip: [38, 106], knee: [52, 118], ankle: [66, 130], toe: [72, 132],
  leg2: { hip: [38, 106], knee: [18, 112], ankle: [0, 118], toe: [-2, 126] },
};
const MTN_B: Pose = {
  ...MTN_A,
  knee: [18, 112], ankle: [0, 118], toe: [-2, 126],
  leg2: { hip: [38, 106], knee: [52, 118], ankle: [66, 130], toe: [72, 132] },
};
const MTN_FRAMES = loop(MTN_A, MTN_B);

// Loaded carry — upright walk holding the weight at the sides.
const CARRY_A: Pose = {
  head: [50, 22], neck: [50, 32], shoulder: [50, 38],
  elbow: [52, 60], hand: [54, 86],
  hip: [50, 86], knee: [64, 104], ankle: [74, 124], toe: [84, 126],
  leg2: { hip: [50, 86], knee: [40, 112], ankle: [34, 138], toe: [44, 138] },
};
const CARRY_B: Pose = {
  ...CARRY_A,
  knee: [40, 110], ankle: [34, 130], toe: [44, 132],
  leg2: { hip: [50, 86], knee: [64, 104], ankle: [74, 124], toe: [84, 126] },
};
const CARRY_FRAMES = loop(CARRY_A, CARRY_B);

// Pike push-up — hips high, head lowers between the hands.
const PIKE_UP: Pose = {
  head: [72, 92], neck: [66, 96], shoulder: [62, 100],
  elbow: [70, 118], hand: [78, 138],
  hip: [40, 80], knee: [24, 108], ankle: [8, 136], toe: [8, 144],
};
const PIKE_DOWN: Pose = {
  ...PIKE_UP,
  head: [86, 132], neck: [78, 126], shoulder: [66, 118], elbow: [62, 132],
};
const PIKE_FRAMES = loop(PIKE_UP, PIKE_DOWN);

// Handstand hold — inverted, body vertical, hands on the floor (subtle sway).
const HANDSTAND_HOLD: Pose = {
  head: [50, 118], neck: [50, 110], shoulder: [50, 104],
  elbow: [50, 128], hand: [50, 150],
  hip: [50, 74], knee: [50, 44], ankle: [50, 16], toe: [58, 12],
};
const HANDSTAND_SWAY: Pose = { ...HANDSTAND_HOLD, hip: [51, 76], knee: [51, 46], ankle: [51, 18] };
const HANDSTAND_FRAMES = loop(HANDSTAND_HOLD, HANDSTAND_SWAY);

// Handstand push-up — inverted, body dips toward the floor and presses back up.
const HSPU_DOWN: Pose = {
  ...HANDSTAND_HOLD,
  head: [50, 138], neck: [50, 128], shoulder: [50, 118],
  elbow: [40, 134], hip: [50, 90], knee: [50, 60], ankle: [50, 32], toe: [58, 28],
};
const HSPU_FRAMES = loop(HANDSTAND_HOLD, HSPU_DOWN);

// Planche — body held horizontal over the hands, shoulders leaning well ahead
// of the wrists. Full-length plank proportions.
const PLANCHE_HOLD: Pose = {
  head: [74, 94], neck: [66, 97], shoulder: [58, 100],
  elbow: [54, 119], hand: [50, 138],
  hip: [32, 96], knee: [14, 96], ankle: [-4, 96], toe: [-8, 100],
};
const PLANCHE_SETTLE: Pose = { ...PLANCHE_HOLD, hip: [32, 98], knee: [14, 98], ankle: [-4, 98] };
const PLANCHE_FRAMES = loop(PLANCHE_HOLD, PLANCHE_SETTLE);

// Tuck planche — same lean, knees pulled in to the chest.
const TUCK_PLANCHE_HOLD: Pose = {
  head: [72, 96], neck: [64, 99], shoulder: [56, 102],
  elbow: [53, 120], hand: [50, 138],
  hip: [42, 110], knee: [30, 96], ankle: [34, 114], toe: [40, 118],
};
const TUCK_PLANCHE_SETTLE: Pose = {
  ...TUCK_PLANCHE_HOLD, hip: [42, 112], knee: [30, 98], ankle: [34, 116], toe: [40, 120],
};
const TUCK_PLANCHE_FRAMES = loop(TUCK_PLANCHE_HOLD, TUCK_PLANCHE_SETTLE);

// Straddle planche — legs split apart around the horizontal.
const STRADDLE_PLANCHE_HOLD: Pose = {
  ...PLANCHE_HOLD,
  knee: [16, 90], ankle: [0, 86], toe: [-4, 82],
  leg2: { hip: [32, 96], knee: [18, 104], ankle: [2, 110], toe: [-2, 114] },
};
const STRADDLE_PLANCHE_SETTLE: Pose = {
  ...STRADDLE_PLANCHE_HOLD, hip: [32, 98], knee: [16, 92], ankle: [0, 88],
  leg2: { hip: [32, 98], knee: [18, 106], ankle: [2, 112], toe: [-2, 116] },
};
const STRADDLE_PLANCHE_FRAMES = loop(STRADDLE_PLANCHE_HOLD, STRADDLE_PLANCHE_SETTLE);

// Front lever — body horizontal, face-up, hanging from a bar overhead with
// straight arms; toes point up.
const FLEVER_HOLD: Pose = {
  head: [80, 59], neck: [72, 61], shoulder: [66, 62],
  elbow: [65, 42], hand: [64, 22],
  hip: [38, 64], knee: [18, 66], ankle: [0, 68], toe: [0, 62],
};
const FLEVER_SETTLE: Pose = { ...FLEVER_HOLD, hip: [38, 66], knee: [18, 68], ankle: [0, 70] };
const FLEVER_FRAMES = loop(FLEVER_HOLD, FLEVER_SETTLE);

// Tuck front lever — hips under the bar, knees pulled to the chest.
const TUCK_FL_HOLD: Pose = {
  head: [80, 59], neck: [72, 61], shoulder: [66, 62],
  elbow: [65, 42], hand: [64, 22],
  hip: [50, 78], knee: [34, 68], ankle: [36, 86], toe: [42, 90],
};
const TUCK_FL_SETTLE: Pose = { ...TUCK_FL_HOLD, hip: [50, 80], knee: [34, 70], ankle: [36, 88] };
const TUCK_FL_FRAMES = loop(TUCK_FL_HOLD, TUCK_FL_SETTLE);

// Front-lever raise / ice-cream maker — from a hang up to the horizontal lever.
const FL_HANG: Pose = {
  head: [62, 46], neck: [63, 54], shoulder: [64, 62],
  elbow: [64, 42], hand: [64, 22],
  hip: [63, 108], knee: [64, 132], ankle: [64, 154], toe: [70, 156],
};
const FL_RAISE_FRAMES = loop(FL_HANG, FLEVER_HOLD);

// Back lever — body horizontal, face-down, hanging from a bar behind.
const BLEVER_HOLD: Pose = {
  head: [24, 68], neck: [30, 66], shoulder: [36, 64],
  elbow: [35, 44], hand: [34, 24],
  hip: [64, 66], knee: [82, 68], ankle: [98, 70], toe: [98, 76],
};
const BLEVER_SETTLE: Pose = { ...BLEVER_HOLD, hip: [64, 68], knee: [82, 70], ankle: [98, 72] };
const BLEVER_FRAMES = loop(BLEVER_HOLD, BLEVER_SETTLE);

// Tuck back lever — knees drawn in under the bar.
const TUCK_BL_HOLD: Pose = {
  head: [24, 68], neck: [30, 66], shoulder: [36, 64],
  elbow: [35, 44], hand: [34, 24],
  hip: [52, 80], knee: [68, 70], ankle: [66, 88], toe: [60, 92],
};
const TUCK_BL_SETTLE: Pose = { ...TUCK_BL_HOLD, hip: [52, 82], knee: [68, 72], ankle: [66, 90] };
const TUCK_BL_FRAMES = loop(TUCK_BL_HOLD, TUCK_BL_SETTLE);

// Muscle-up — pull-up into a transition over the bar to support.
const MU_HANG: Pose = {
  head: [50, 50], neck: [50, 60], shoulder: [50, 67],
  elbow: [54, 47], hand: [56, 24],
  hip: [50, 115], knee: [55, 138], ankle: [55, 156], toe: [62, 156],
};
const MU_PULL: Pose = {
  head: [50, 34], neck: [50, 44], shoulder: [50, 52],
  elbow: [40, 40], hand: [56, 24],
  hip: [50, 100], knee: [55, 124], ankle: [55, 144], toe: [62, 144],
};
const MU_OVER: Pose = {
  head: [46, 6], neck: [47, 14], shoulder: [48, 22],
  elbow: [38, 32], hand: [56, 24],
  hip: [50, 70], knee: [54, 98], ankle: [54, 124], toe: [61, 124],
};
const MU_FRAMES: Frame[] = [
  { t: 0, pose: MU_HANG },
  { t: 0.4, pose: MU_PULL },
  { t: 0.7, pose: MU_OVER },
  { t: 1, pose: MU_HANG },
];

// Human flag — body horizontal off a vertical pole: the top arm pulls from a
// high grip, the bottom arm pushes from a low grip.
const FLAG_HOLD: Pose = {
  head: [44, 58], neck: [37, 59], shoulder: [30, 60],
  elbow: [28, 42], hand: [26, 24],
  hip: [58, 64], knee: [78, 66], ankle: [96, 68], toe: [98, 74],
  arm2: { shoulder: [30, 60], elbow: [22, 74], hand: [22, 88] },
};
const FLAG_SETTLE: Pose = { ...FLAG_HOLD, hip: [58, 66], knee: [78, 68], ankle: [96, 70] };
const FLAG_FRAMES = loop(FLAG_HOLD, FLAG_SETTLE);

// Tuck human flag — same grips, knees pulled in toward the chest.
const TUCK_FLAG_HOLD: Pose = {
  ...FLAG_HOLD,
  hip: [50, 68], knee: [64, 58], ankle: [66, 76], toe: [72, 80],
};
const TUCK_FLAG_SETTLE: Pose = {
  ...TUCK_FLAG_HOLD, hip: [50, 70], knee: [64, 60], ankle: [66, 78], toe: [72, 82],
};
const TUCK_FLAG_FRAMES = loop(TUCK_FLAG_HOLD, TUCK_FLAG_SETTLE);

// Pistol squat — single-leg squat, free leg extended forward.
const PISTOL_UP: Pose = {
  ...STAND,
  shoulder: [50, 36], elbow: [60, 46], hand: [74, 46],
  hip: [50, 86], knee: [50, 115], ankle: [50, 140], toe: [60, 140],
  leg2: { hip: [50, 86], knee: [64, 100], ankle: [80, 104], toe: [90, 104] },
};
const PISTOL_DOWN: Pose = {
  head: [50, 60], neck: [50, 68], shoulder: [50, 74],
  elbow: [62, 74], hand: [78, 70],
  hip: [44, 116], knee: [66, 122], ankle: [50, 140], toe: [60, 140],
  leg2: { hip: [44, 116], knee: [70, 104], ankle: [92, 96], toe: [98, 94] },
};
const PISTOL_FRAMES = loop(PISTOL_UP, PISTOL_DOWN);

// Dead hang — hanging from a bar, subtle sway.
const HANG_A: Pose = {
  head: [50, 34], neck: [50, 44], shoulder: [50, 52],
  elbow: [52, 38], hand: [54, 16],
  hip: [50, 98], knee: [50, 128], ankle: [50, 154], toe: [58, 156],
};
const HANG_B: Pose = { ...HANG_A, hip: [51, 99], knee: [51, 129], ankle: [51, 155] };
const HANG_FRAMES = loop(HANG_A, HANG_B);

// Static loaded hold (plate pinch / fat-grip / thick-bar) — standing, slight breath.
const HOLD_A: Pose = { ...STAND, elbow: [51, 60], hand: [52, 88] };
const HOLD_B: Pose = { ...STAND, neck: [50, 31], shoulder: [50, 36], elbow: [51, 61], hand: [52, 89] };
const HOLD_FRAMES = loop(HOLD_A, HOLD_B);

// Wrist curl — seated, forearm on the thigh, the load flexes up and down.
const WRIST_DOWN: Pose = {
  head: [38, 40], neck: [40, 48], shoulder: [42, 56],
  elbow: [42, 82], hand: [66, 92],
  hip: [46, 88], knee: [66, 110], ankle: [66, 140], toe: [76, 140],
};
const WRIST_UP: Pose = { ...WRIST_DOWN, hand: [66, 78] };
const WRIST_FRAMES = loop(WRIST_DOWN, WRIST_UP);

// Gripper (captains of crush) — standing, the hand squeezes closed.
const GRIP_OPEN: Pose = { ...STAND, elbow: [54, 58], hand: [64, 64] };
const GRIP_SHUT: Pose = { ...STAND, elbow: [54, 58], hand: [58, 62] };
const GRIPPER_FRAMES = loop(GRIP_OPEN, GRIP_SHUT);

// Neck flexion — head nods forward against resistance.
const NECK_BASE: Pose = {
  head: [50, 18], neck: [50, 30], shoulder: [50, 38],
  elbow: [50, 62], hand: [50, 86],
  hip: [50, 86], knee: [50, 115], ankle: [50, 140], toe: [60, 140],
};
const NECK_CURL_BACK: Pose = { ...NECK_BASE, head: [44, 20], neck: [48, 30] };
const NECK_CURL_FWD: Pose  = { ...NECK_BASE, head: [57, 24], neck: [52, 31] };
const NECK_CURL_FRAMES = loop(NECK_CURL_BACK, NECK_CURL_FWD);

// Neck extension — head travels from down to back.
const NECK_EXT_DOWN: Pose = { ...NECK_BASE, head: [57, 26], neck: [52, 32] };
const NECK_EXT_BACK: Pose = { ...NECK_BASE, head: [42, 18], neck: [47, 29] };
const NECK_EXT_FRAMES = loop(NECK_EXT_DOWN, NECK_EXT_BACK);

// Lateral neck flexion — head tilts side to side (subtle in side view).
const NECK_LAT_A: Pose = { ...NECK_BASE, head: [54, 18] };
const NECK_LAT_B: Pose = { ...NECK_BASE, head: [46, 18] };
const NECK_LAT_FRAMES = loop(NECK_LAT_A, NECK_LAT_B);

// Neck bridge — supine arch supported on the head.
const NECK_BRIDGE_DOWN: Pose = {
  head: [80, 122], neck: [74, 117], shoulder: [66, 112],
  elbow: [60, 124], hand: [56, 138],
  hip: [40, 100], knee: [21, 111], ankle: [26, 132], toe: [18, 136],
};
const NECK_BRIDGE_UP: Pose = { ...NECK_BRIDGE_DOWN, shoulder: [66, 108], hip: [38, 90], knee: [32, 111] };
const NECK_BRIDGE_FRAMES = loop(NECK_BRIDGE_DOWN, NECK_BRIDGE_UP);

// Ski erg — double-pole: arms drive from overhead down past the hips.
const SKI_UP: Pose = {
  head: [50, 26], neck: [50, 36], shoulder: [50, 42],
  elbow: [54, 26], hand: [58, 12],
  hip: [50, 88], knee: [54, 114], ankle: [54, 140], toe: [64, 140],
};
const SKI_DOWN: Pose = {
  head: [54, 40], neck: [52, 48], shoulder: [50, 56],
  elbow: [52, 78], hand: [54, 98],
  hip: [48, 96], knee: [56, 118], ankle: [54, 140], toe: [64, 140],
};
const SKI_FRAMES = loop(SKI_UP, SKI_DOWN);

// ── Dedicated motions (replacing ill-fitting reuses) ─────────────────────────
// Each exercise below previously borrowed a neighbour's skeleton that
// misrepresented its mechanics — the hip abductor/adductor machines reused the
// leg-extension kick, the sumo / trap-bar / snatch pulls reused the
// conventional deadlift, the sissy & zercher squats reused the front squat,
// the drag & zottman curls reused the plain curl, and the archer / typewriter
// pull-ups and archer / pseudo-planche / decline push-ups all reused their
// vanilla cousins. They now each get a side-on skeleton that matches how the
// movement actually looks.

// Rig for seated single-joint leg machines: independent legs, no doubled arm.
const RIG_LEGS_SPLIT: RigConfig = { feet: "oval", arm2: "none", leg2: "independent" };

// Sumo deadlift — wide stance, torso markedly more upright than a conventional
// pull; the bar travels a short path up the shins.
const SUMO_BOTTOM: Pose = {
  head: [76, 55], neck: [71, 61], shoulder: [66, 68],
  elbow: [59, 92], hand: [52, 116],
  hip: [32, 90], knee: [48, 112], ankle: [50, 140], toe: [62, 140],
};
const SUMO_TOP: Pose = { ...STAND, elbow: [51, 60], hand: [52, 85] };
const SUMO_FRAMES = loop(SUMO_BOTTOM, SUMO_TOP, [52, 118], [52, 85]);

// Trap-bar deadlift — neutral handles at the sides; more knee bend and a
// taller torso than a conventional pull.
const TRAP_BOTTOM: Pose = {
  head: [78, 51], neck: [73, 57], shoulder: [68, 64],
  elbow: [62, 88], hand: [56, 112],
  hip: [34, 92], knee: [50, 114], ankle: [52, 140], toe: [64, 140],
};
const TRAP_TOP: Pose = { ...STAND, elbow: [52, 61], hand: [56, 86] };
const TRAP_FRAMES = loop(TRAP_BOTTOM, TRAP_TOP);

// Snatch-grip deadlift — the wide grip drops the shoulders and lifts the hips,
// so the torso runs flatter at the floor than a conventional pull.
const SNATCH_BOTTOM: Pose = {
  head: [85, 71], neck: [78, 75], shoulder: [72, 78],
  elbow: [63, 101], hand: [54, 124],
  hip: [30, 98], knee: [48, 118], ankle: [50, 140], toe: [60, 140],
};
const SNATCH_TOP: Pose = { ...STAND, elbow: [51, 60], hand: [52, 85] };
const SNATCH_FRAMES = loop(SNATCH_BOTTOM, SNATCH_TOP, [54, 124], [52, 85]);

// Sissy squat — torso and thighs stay roughly in one line as the body leans
// back, the knees travel well past the toes and the heels lift onto the balls.
// Arms stay reaching forward for counterbalance.
const SISSY_UP: Pose = { ...STAND, elbow: [74, 37], hand: [97, 37], shoulder: [50, 35] };
const SISSY_DOWN: Pose = {
  head: [28, 32], neck: [31, 39], shoulder: [34, 46],
  elbow: [58, 48], hand: [82, 46],
  hip: [50, 86], knee: [74, 108], ankle: [60, 130], toe: [68, 140],
};
const SISSY_FRAMES = loop(SISSY_UP, SISSY_DOWN);

// Zercher squat — the load rides in the crook of the elbows in front of the
// chest, keeping the torso vertical through a deep squat.
const ZERCHER_TOP: Pose = { ...STAND, elbow: [56, 58], hand: [48, 46] };
const ZERCHER_BOTTOM: Pose = {
  head: [50, 46], neck: [50, 55], shoulder: [50, 64],
  elbow: [56, 86], hand: [48, 74],
  hip: [42, 108], knee: [64, 116], ankle: [50, 140], toe: [60, 140],
};
const ZERCHER_FRAMES = loop(ZERCHER_TOP, ZERCHER_BOTTOM);

// Goblet squat — a single weight cupped at the chest keeps the hands centred
// and the torso vertical.
const GOBLET_TOP: Pose = { ...STAND, elbow: [56, 58], hand: [50, 46] };
const GOBLET_BOTTOM: Pose = {
  head: [48, 46], neck: [49, 55], shoulder: [50, 64],
  elbow: [56, 86], hand: [50, 74],
  hip: [42, 108], knee: [64, 116], ankle: [50, 140], toe: [60, 140],
};
const GOBLET_FRAMES = loop(GOBLET_TOP, GOBLET_BOTTOM);

// Hip abductor machine — seated, knees driven apart. Side-on we fan the two
// legs in opposite directions so "open vs closed" reads clearly.
const ABD_IN: Pose = {
  head: [24, 48], neck: [26, 58], shoulder: [28, 66],
  elbow: [28, 88], hand: [28, 106],
  hip: [44, 90], knee: [64, 96], ankle: [84, 108], toe: [94, 112],
  leg2: { hip: [44, 90], knee: [62, 98], ankle: [82, 112], toe: [92, 116] },
};
const ABD_OUT: Pose = {
  ...ABD_IN,
  knee: [70, 88], ankle: [96, 96], toe: [98, 104],
  leg2: { hip: [44, 90], knee: [54, 104], ankle: [70, 120], toe: [80, 124] },
};
const ABDUCTOR_FRAMES = loop(ABD_IN, ABD_OUT);

// Hip adductor machine — the mirror: legs start apart and squeeze together.
const ADDUCTOR_FRAMES = loop(ABD_OUT, ABD_IN);

// Drag curl — the bar drags straight up the torso as the elbows travel back
// behind the body, so the load stays close instead of arcing out.
const DRAG_DOWN: Pose = { ...STAND, elbow: [51, 60], hand: [52, 84] };
const DRAG_UP: Pose = { ...STAND, shoulder: [50, 36], elbow: [36, 58], hand: [52, 45] };
const DRAG_FRAMES = loop(DRAG_DOWN, DRAG_UP, [52, 84], [52, 45]);

// Zottman curl — curl up supinated, then rotate and lower pronated along a
// wider path on the way down.
const ZOTT_DOWN: Pose = { ...STAND, elbow: [50, 60], hand: [53, 85] };
const ZOTT_UP: Pose = { ...STAND, shoulder: [49, 36], elbow: [49, 60], hand: [61, 38] };
const ZOTT_OUT: Pose = { ...STAND, elbow: [52, 60], hand: [74, 58] };
const ZOTTMAN_FRAMES: Frame[] = [
  { t: 0, pose: ZOTT_DOWN },
  { t: 0.4, pose: ZOTT_UP },
  { t: 0.7, pose: ZOTT_OUT },
  { t: 1, pose: ZOTT_DOWN },
];

// Decline push-up — feet elevated above the shoulders; the body slopes down
// toward the hands.
const DPU_UP: Pose = {
  head: [82, 101], neck: [74, 104], shoulder: [66, 106],
  elbow: [68, 123], hand: [70, 140],
  hip: [38, 89], knee: [19, 78], ankle: [2, 68], toe: [2, 60],
};
const DPU_DOWN: Pose = {
  ...DPU_UP,
  head: [68, 131], neck: [60, 127], shoulder: [52, 124], elbow: [56, 138],
  hip: [30, 99], knee: [15, 83], ankle: [2, 68],
};
const DECLINE_PUSHUP_FRAMES = loop(DPU_UP, DPU_DOWN);

// Pseudo-planche push-up — hands shifted back toward the hips with the
// shoulders leaning forward past them, loading the front delts and chest.
const PP_UP: Pose = {
  head: [88, 98], neck: [80, 100], shoulder: [72, 102],
  elbow: [66, 118], hand: [58, 138],
  hip: [40, 106], knee: [20, 110], ankle: [0, 114], toe: [-2, 122],
};
const PP_DOWN: Pose = {
  ...PP_UP,
  head: [92, 126], neck: [84, 126], shoulder: [76, 124], elbow: [58, 122],
  hip: [40, 112], knee: [20, 116], ankle: [0, 120],
};
const PSEUDO_PLANCHE_FRAMES = loop(PP_UP, PP_DOWN);

// Archer push-up — weight shifts onto one bent arm while the other reaches out
// wide and straight.
const APU_UP: Pose = {
  head: [82, 96], neck: [74, 99], shoulder: [68, 102],
  elbow: [70, 119], hand: [70, 138],
  arm2: { shoulder: [68, 102], elbow: [84, 116], hand: [98, 136] },
  hip: [40, 104], knee: [18, 108], ankle: [-2, 112], toe: [-2, 120],
};
const APU_DOWN: Pose = {
  ...APU_UP,
  head: [80, 124], neck: [73, 126], shoulder: [66, 128],
  elbow: [48, 134], hand: [70, 138],
  arm2: { shoulder: [66, 128], elbow: [86, 132], hand: [100, 138] },
  hip: [40, 126], knee: [18, 128], ankle: [-2, 130],
};
const ARCHER_PUSHUP_FRAMES = loop(APU_UP, APU_DOWN);

// Archer pull-up — pull the body up toward one hand; that arm bends hard while
// the other stays straight along the bar.
const APULL_HANG: Pose = {
  head: [50, 50], neck: [50, 60], shoulder: [50, 67],
  elbow: [44, 47], hand: [40, 24],
  arm2: { shoulder: [50, 67], elbow: [60, 47], hand: [66, 24] },
  hip: [50, 115], knee: [55, 138], ankle: [55, 156], toe: [62, 156],
};
const APULL_TOP: Pose = {
  head: [42, 34], neck: [42, 44], shoulder: [42, 52],
  elbow: [26, 46], hand: [40, 24],
  arm2: { shoulder: [42, 52], elbow: [54, 38], hand: [66, 24] },
  hip: [42, 100], knee: [47, 124], ankle: [47, 144], toe: [54, 144],
};
const ARCHER_PULLUP_FRAMES = loop(APULL_HANG, APULL_TOP);

// Typewriter pull-up — hold at the top and traverse from one hand to the
// other: the near arm folds hard while the far arm straightens along the bar.
const TW_LEFT: Pose = {
  head: [40, 40], neck: [40, 48], shoulder: [40, 54],
  elbow: [26, 41], hand: [38, 24],
  arm2: { shoulder: [40, 54], elbow: [51, 39], hand: [62, 24] },
  hip: [40, 98], knee: [45, 122], ankle: [45, 142], toe: [52, 142],
};
const TW_RIGHT: Pose = {
  head: [60, 40], neck: [60, 48], shoulder: [60, 54],
  elbow: [49, 39], hand: [38, 24],
  arm2: { shoulder: [60, 54], elbow: [74, 41], hand: [62, 24] },
  hip: [60, 98], knee: [65, 122], ankle: [65, 142], toe: [72, 142],
};
const TYPEWRITER_FRAMES = loop(TW_LEFT, TW_RIGHT);

// Cuban press — high pull to the elbows, external rotation, then press overhead.
const CUBAN_LOW: Pose = { ...STAND, elbow: [51, 60], hand: [52, 86] };
const CUBAN_PULL: Pose = { ...STAND, shoulder: [50, 37], elbow: [64, 26], hand: [54, 42] };
const CUBAN_ROT: Pose = { ...STAND, shoulder: [50, 36], elbow: [64, 26], hand: [70, 4] };
const CUBAN_TOP: Pose = { ...STAND, shoulder: [50, 36], elbow: [50, 22], hand: [50, 6] };
const CUBAN_FRAMES: Frame[] = [
  { t: 0, pose: CUBAN_LOW },
  { t: 0.3, pose: CUBAN_PULL },
  { t: 0.55, pose: CUBAN_ROT },
  { t: 0.78, pose: CUBAN_TOP },
  { t: 1, pose: CUBAN_LOW },
];

// Incline treadmill walk — a tall, low-knee gait with a slight forward lean,
// distinct from the bounding run cycle.
const WALK_A: Pose = {
  head: [52, 22], neck: [52, 32], shoulder: [52, 38],
  elbow: [56, 56], hand: [60, 72],
  arm2: { shoulder: [52, 38], elbow: [48, 56], hand: [44, 72] },
  hip: [50, 86], knee: [62, 108], ankle: [72, 128], toe: [82, 130],
  leg2: { hip: [50, 86], knee: [42, 112], ankle: [34, 134], toe: [26, 136] },
};
const WALK_B: Pose = {
  ...WALK_A,
  elbow: [48, 56], hand: [44, 72],
  arm2: { shoulder: [52, 38], elbow: [56, 56], hand: [60, 72] },
  knee: [44, 112], ankle: [36, 134], toe: [28, 136],
  leg2: { hip: [50, 86], knee: [62, 108], ankle: [72, 128], toe: [82, 130] },
};
const WALK_FRAMES = loop(WALK_A, WALK_B);

// ── Second wave of dedicated skeletons ──────────────────────────────────────
// Replaces the remaining borrowed frames that misrepresented their movement.

// Chin-up — supinated grip: the elbows stay in front of the body and the chest
// leads up to the bar (contrast the pull-up, whose elbows flare back).
const CHIN_HANG: Pose = {
  head:     [48, 50], neck: [48, 60], shoulder: [48, 67],
  elbow:    [52, 47], hand: [54, 24],
  hip:      [48, 115], knee: [53, 138], ankle: [53, 156], toe: [60, 156],
};
const CHIN_TOP: Pose = {
  head:     [50, 28], neck: [50, 38], shoulder: [50, 46],
  elbow:    [69, 41], hand: [54, 24],   // elbow stays in front of the body
  hip:      [46, 94], knee: [54, 116], ankle: [54, 138], toe: [61, 138],
};
const CHIN_FRAMES = loop(CHIN_HANG, CHIN_TOP);

// Single-leg RDL — the free leg sweeps back and up in line with the torso as
// the hips hinge over the planted leg.
const SL_RDL_TOP: Pose = {
  ...STAND,
  elbow: [51, 60], hand: [52, 85],
  leg2: { hip: [50, 85], knee: [50, 115], ankle: [50, 140], toe: [60, 140] },
};
const SL_RDL_BOTTOM: Pose = {
  head:     [88, 50], neck: [82, 56], shoulder: [76, 63],
  elbow:    [67, 86], hand: [58, 110],
  hip:      [40, 88], knee: [46, 114], ankle: [50, 140], toe: [60, 140],
  leg2:     { hip: [40, 88], knee: [18, 84], ankle: [-4, 76], toe: [-10, 74] },
};
const SL_RDL_FRAMES = loop(SL_RDL_TOP, SL_RDL_BOTTOM);

// Stiff-leg deadlift — deeper hinge and straighter knees than the RDL.
const SDL_TOP: Pose = { ...STAND, elbow: [51, 60], hand: [52, 85] };
const SDL_BOTTOM: Pose = {
  head:     [88, 55], neck: [82, 59], shoulder: [76, 64],
  elbow:    [67, 88], hand: [58, 112],
  hip:      [36, 86], knee: [44, 114], ankle: [50, 140], toe: [60, 140],
};
const SDL_FRAMES = loop(SDL_TOP, SDL_BOTTOM, [52, 85], [58, 112]);

// Donkey calf raise — hinged over with the hands braced on a support while
// the heels drive up.
const DONKEY_DOWN: Pose = {
  head:     [92, 62], neck: [86, 66], shoulder: [80, 70],
  elbow:    [86, 92], hand: [90, 114],   // braced on the frame
  hip:      [40, 84], knee: [46, 112], ankle: [50, 140], toe: [62, 140],
};
const DONKEY_UP: Pose = {
  head:     [92, 56], neck: [86, 60], shoulder: [80, 64],
  elbow:    [86, 88], hand: [90, 114],
  hip:      [40, 76], knee: [46, 106], ankle: [50, 132], toe: [62, 140],
};
const DONKEY_FRAMES = loop(DONKEY_DOWN, DONKEY_UP);

// Concentration curl — seated, elbow braced inside the thigh.
const CONC_DOWN: Pose = {
  head:     [36, 42], neck: [38, 50], shoulder: [40, 58],
  elbow:    [52, 80], hand: [58, 102],
  hip:      [48, 92], knee: [70, 108], ankle: [70, 138], toe: [80, 140],
};
const CONC_UP: Pose = { ...CONC_DOWN, hand: [64, 58] };
const CONC_FRAMES = loop(CONC_DOWN, CONC_UP);

// Y-raise — arms sweep from the thighs up to a high, overhead "Y".
const Y_RAISE_DOWN: Pose = { ...STAND, elbow: [52, 60], hand: [56, 84] };
const Y_RAISE_UP: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [68, 18], hand: [84, 2],
};
const Y_RAISE_FRAMES = loop(Y_RAISE_DOWN, Y_RAISE_UP);

// Svend press — a plate squeezed between the palms at the chest and pressed
// straight out to full extension.
const SVEND_IN: Pose = { ...STAND, shoulder: [50, 36], elbow: [54, 56], hand: [60, 40] };
const SVEND_OUT: Pose = { ...STAND, shoulder: [50, 36], elbow: [74, 38], hand: [98, 38] };
const SVEND_FRAMES = loop(SVEND_IN, SVEND_OUT);

// Behind-the-neck press — the bar racks behind the head and presses to the
// same overhead lockout as a military press.
const BTN_RACK: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [58, 52], hand: [46, 38],
};
const BTN_LOCKOUT: Pose = {
  ...STAND, shoulder: [50, 36], elbow: [50, 22], hand: [48, 6],
};
const BTN_FRAMES = loop(BTN_RACK, BTN_LOCKOUT, [44, 36], [48, 6]);

// Floor press — supine on the floor, knees up; the upper arms stop against
// the floor at the bottom so the range is shorter than a bench press.
const FLOOR_PRESS_TOP: Pose = {
  head:     [80, 116], neck: [73, 118], shoulder: [68, 120],
  elbow:    [68, 96], hand: [68, 72],
  hip:      [44, 122], knee: [26, 104], ankle: [16, 130], toe: [6, 132],
};
const FLOOR_PRESS_BOTTOM: Pose = {
  ...FLOOR_PRESS_TOP,
  elbow: [45, 115], hand: [62, 98],   // triceps resting on the floor
};
const FLOOR_PRESS_FRAMES = loop(FLOOR_PRESS_TOP, FLOOR_PRESS_BOTTOM, [68, 72], [62, 98]);

// Larsen press — bench press with the legs held straight out off the floor.
const LARSEN_TOP: Pose = {
  head:     [80, 78], neck: [73, 81], shoulder: [68, 83],
  elbow:    [68, 59], hand: [68, 35],
  hip:      [42, 86], knee: [22, 88], ankle: [2, 90], toe: [-4, 86],
};
const LARSEN_BOTTOM: Pose = {
  ...LARSEN_TOP,
  head: [80, 80], elbow: [50, 62], hand: [62, 78],
};
const LARSEN_FRAMES = loop(LARSEN_TOP, LARSEN_BOTTOM, [68, 35], [62, 78]);

// Hack squat — reclined against a 45° sled, feet ahead of the body; the whole
// torso slides down the slope while the knees travel forward.
const HACK_TOP: Pose = {
  head:     [38, 26], neck: [40, 33], shoulder: [42, 40],
  elbow:    [46, 55], hand: [42, 44],   // gripping the sled handles
  hip:      [56, 84], knee: [62, 112], ankle: [66, 136], toe: [76, 136],
};
const HACK_BOTTOM: Pose = {
  head:     [26, 52], neck: [28, 59], shoulder: [30, 66],
  elbow:    [34, 81], hand: [30, 70],
  hip:      [44, 110], knee: [73, 113], ankle: [66, 136], toe: [76, 136],
};
const HACK_FRAMES = loop(HACK_TOP, HACK_BOTTOM);

// Hanging knee raise — knees tuck up toward the chest (contrast the straight
// legs of the full hanging leg raise).
const KNEE_RAISE_DOWN: Pose = {
  head:     [50, 30], neck: [50, 40], shoulder: [50, 48],
  elbow:    [50, 38], hand: [50, 16],
  hip:      [50, 92], knee: [50, 122], ankle: [50, 148], toe: [58, 150],
};
const KNEE_RAISE_UP: Pose = {
  ...KNEE_RAISE_DOWN,
  hip: [48, 90], knee: [70, 74], ankle: [72, 96], toe: [80, 100],
};
const KNEE_RAISE_FRAMES = loop(KNEE_RAISE_DOWN, KNEE_RAISE_UP);

// Tuck L-sit — support hold with the knees drawn up to the chest.
const TUCK_LSIT_HOLD: Pose = {
  head: [50, 48], neck: [50, 56], shoulder: [50, 64],
  elbow: [50, 82], hand: [50, 100],
  hip: [48, 98], knee: [62, 80], ankle: [66, 98], toe: [72, 102],
};
const TUCK_LSIT_SETTLE: Pose = {
  ...TUCK_LSIT_HOLD, knee: [62, 82], ankle: [66, 100], toe: [72, 104],
};
const TUCK_LSIT_FRAMES = loop(TUCK_LSIT_HOLD, TUCK_LSIT_SETTLE);

// Shrimp squat — the free leg folds behind, shin held off the floor, while
// the standing leg squats (contrast the pistol's leg held out front).
const SHRIMP_UP: Pose = {
  ...STAND,
  shoulder: [50, 36], elbow: [64, 46], hand: [78, 40],
  leg2: { hip: [50, 85], knee: [46, 112], ankle: [30, 122], toe: [24, 128] },
};
const SHRIMP_DOWN: Pose = {
  head: [54, 56], neck: [53, 64], shoulder: [52, 72],
  elbow: [66, 80], hand: [80, 74],
  hip: [42, 112], knee: [66, 120], ankle: [50, 140], toe: [60, 140],
  leg2: { hip: [42, 112], knee: [30, 134], ankle: [12, 128], toe: [6, 134] },
};
const SHRIMP_FRAMES = loop(SHRIMP_UP, SHRIMP_DOWN);

// Elliptical — gliding low-impact stride, hands on the moving poles.
const ELLIP_A: Pose = {
  head: [51, 24], neck: [51, 32], shoulder: [51, 38],
  elbow: [64, 50], hand: [76, 60],
  arm2: { shoulder: [51, 38], elbow: [44, 56], hand: [48, 76] },
  hip: [50, 88], knee: [62, 108], ankle: [68, 130], toe: [78, 132],
  leg2: { hip: [50, 88], knee: [42, 112], ankle: [32, 132], toe: [24, 136] },
};
const ELLIP_B: Pose = {
  ...ELLIP_A,
  elbow: [44, 56], hand: [48, 76],
  arm2: { shoulder: [51, 38], elbow: [64, 50], hand: [76, 60] },
  knee: [42, 112], ankle: [32, 132], toe: [24, 136],
  leg2: { hip: [50, 88], knee: [62, 108], ankle: [68, 130], toe: [78, 132] },
};
const ELLIP_FRAMES = loop(ELLIP_A, ELLIP_B);

// Diamond push-up — hands together under the chest, elbows tracking straight
// back along the ribs instead of flaring.
const DIAMOND_UP: Pose = {
  head:     [82, 96], neck: [74, 99], shoulder: [68, 102],
  elbow:    [66, 120], hand: [64, 138],
  hip:      [40, 104], knee: [18, 108], ankle: [-2, 112], toe: [-2, 120],
};
const DIAMOND_DOWN: Pose = {
  ...DIAMOND_UP,
  head:     [82, 126], neck: [74, 127], shoulder: [68, 128],
  elbow:    [46, 130], hand: [64, 138],   // elbows hug straight back
  hip:      [40, 128], knee: [18, 130], ankle: [-2, 132],
};
const DIAMOND_FRAMES = loop(DIAMOND_UP, DIAMOND_DOWN);

// Walking lunge — alternating four-phase step-through: deep lunge, tall
// passing stride, deep lunge on the other side.
const WLUNGE_PASS: Pose = {
  head:     [50, 22], neck: [50, 32], shoulder: [50, 37],
  elbow:    [50, 62], hand: [50, 87],
  hip:      [50, 87], knee: [54, 115], ankle: [56, 139], toe: [66, 140],
  leg2:     { hip: [50, 87], knee: [48, 115], ankle: [44, 139], toe: [34, 141] },
};
const WLUNGE_DOWN_A: Pose = { ...LUNGE_DOWN };
const WLUNGE_DOWN_B: Pose = {
  ...LUNGE_DOWN,
  knee: [40, 126], ankle: [22, 138], toe: [14, 142],
  leg2: { hip: [50, 103], knee: [76, 118], ankle: [68, 140], toe: [78, 140] },
};
const WLUNGE_FRAMES: Frame[] = [
  { t: 0,    pose: WLUNGE_DOWN_A },
  { t: 0.25, pose: WLUNGE_PASS },
  { t: 0.5,  pose: WLUNGE_DOWN_B },
  { t: 0.75, pose: WLUNGE_PASS },
  { t: 1,    pose: WLUNGE_DOWN_A },
];

// Reverse lunge — from standing, one leg steps back into the lunge and
// returns (the forward lunge holds its split stance instead).
const RLUNGE_STAND: Pose = {
  head:     [50, 22], neck: [50, 32], shoulder: [50, 37],
  elbow:    [50, 62], hand: [50, 87],
  hip:      [50, 87], knee: [50, 116], ankle: [50, 140], toe: [60, 140],
  leg2:     { hip: [50, 87], knee: [48, 116], ankle: [48, 140], toe: [58, 140] },
};
const RLUNGE_DOWN: Pose = { ...LUNGE_DOWN };
const RLUNGE_FRAMES = loop(RLUNGE_STAND, RLUNGE_DOWN);

// Curtsy lunge — the rear leg crosses behind and under the body, knees close
// together as the hips sink.
const CURTSY_DOWN: Pose = {
  head:     [50, 36], neck: [50, 46], shoulder: [50, 51],
  elbow:    [50, 76], hand: [50, 101],
  hip:      [50, 100], knee: [64, 116], ankle: [58, 140], toe: [68, 140],
  leg2:     { hip: [50, 100], knee: [40, 120], ankle: [46, 138], toe: [52, 142] },
};
const CURTSY_FRAMES = loop(RLUNGE_STAND, CURTSY_DOWN);

export const MOTIONS: Record<string, ExerciseMotion> = {
  // ── Push ────────────────────────────────────────────────────────────────
  bench:       { name: "Bench press",      frames: BENCH_FRAMES,        duration: 2200,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [flatBench(), barbell("bar1", [68, 35], 30)] },
  incline_db:  { name: "Incline DB press", frames: INCLINE_DB_FRAMES,   duration: 2200,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [inclineBench(), dumbbell("db_l", [66, 24])] },
  incline_bar: { name: "Incline bar press", frames: INCLINE_DB_FRAMES,  duration: 2200,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [inclineBench(), barbell("bar1", [66, 24], 30)] },
  decline:     { name: "Decline press",    frames: DECLINE_FRAMES,      duration: 2200,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [declineBench(), barbell("bar1", [66, 46], 30)] },
  cable_fly:   { name: "Cable fly",        frames: CABLE_FLY_FRAMES,    duration: 2200, floor: true,   category: "Push",      rig: RIG_SYMMETRIC, equipment: [cableHigh("cable_l", [10, 20], [22, 56]), cableHigh("cable_r", [90, 20], [78, 56])] },
  pec_deck:    { name: "Pec deck",         frames: PEC_DECK_FRAMES,     duration: 2000,                category: "Push",      rig: RIG_SYMMETRIC },
  dips:        { name: "Dips",             frames: DIPS_FRAMES,         duration: 2200,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [gripBar([60, 90], 4)] },
  skull:       { name: "Skull crusher",    frames: SKULL_FRAMES,        duration: 2000,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [flatBench()] },
  cgbench:     { name: "Close-grip bench", frames: CGBENCH_FRAMES,      duration: 2200,                category: "Push",      rig: RIG_SYMMETRIC, equipment: [flatBench(), barbell("bar1", [62, 35], 26)] },
  tri_push:    { name: "Tricep pushdown",  frames: TRI_PUSH_FRAMES,     duration: 1600, floor: true,   category: "Push",      rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [50, 6], [60, 50])] },
  tri_oh:      { name: "Overhead tri ext", frames: TRI_OH_FRAMES,       duration: 1800, floor: true,   category: "Push",      rig: RIG_SYMMETRIC },
  ohp:         { name: "Overhead press",   frames: OHP_FRAMES,          duration: 2000, floor: true,   category: "Push",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 35], 30)] },
  db_press:    { name: "DB shoulder press", frames: DB_PRESS_FRAMES,    duration: 2000, floor: true,   category: "Push",      rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [50, 35])] },
  arnold:      { name: "Arnold press",     frames: ARNOLD_FRAMES,       duration: 2200, floor: true,   category: "Push",      rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [60, 42])] },
  push_up:     { name: "Push-up",          frames: PUSHUP_FRAMES,       duration: 1800, floor: true,   category: "Push",      rig: RIG_SYMMETRIC },

  // ── Pull ────────────────────────────────────────────────────────────────
  lat_pd:        { name: "Lat pulldown",         frames: LATPD_FRAMES,        duration: 2000,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [56, 4], [58, 22])] },
  lat_pd_wide:   { name: "Wide-grip pulldown",   frames: LATPD_WIDE_FRAMES,   duration: 2000,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [62, 4], [62, 22])] },
  lat_pd_close:  { name: "Close-grip pulldown",  frames: LATPD_CLOSE_FRAMES,  duration: 2000,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [54, 4], [54, 24])] },
  pullups:       { name: "Pull-up",              frames: PULLUP_FRAMES,       duration: 2400,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  sa_pulldown:   { name: "Single-arm pulldown",  frames: SA_PD_FRAMES,        duration: 2200,                category: "Pull", rig: RIG_SINGLE, equipment: [cableHigh("cable", [60, 4], [60, 30])] },
  tbar:          { name: "T-bar row",            frames: TBAR_FRAMES,         duration: 2000, floor: true,   category: "Pull", rig: RIG_SYMMETRIC },
  bb_row:        { name: "Bent-over row",        frames: ROW_FRAMES,          duration: 2000, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [58, 118], 30)] },
  db_row:        { name: "DB row",               frames: DB_ROW_FRAMES,       duration: 2000, floor: true,   category: "Pull", rig: RIG_SINGLE, equipment: [dumbbell("db", [56, 116])] },
  meadows:       { name: "Meadows row",          frames: MEADOWS_FRAMES,      duration: 2000, floor: true,   category: "Pull", rig: RIG_SINGLE },
  cs_row:        { name: "Cable seated row",     frames: CS_ROW_FRAMES,       duration: 2000,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableLow("cable", [98, 116], [66, 78])] },
  cable_row:     { name: "Cable row",            frames: CABLE_ROW_FRAMES,    duration: 2000,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableLow("cable", [98, 116], [66, 78])] },
  face_pull:     { name: "Face pull",            frames: FACE_PULL_FRAMES,    duration: 1800, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [80, 20], [76, 36])] },
  rev_fly:       { name: "Reverse fly",          frames: REV_FLY_FRAMES,      duration: 1800, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [70, 122])] },
  bb_curl:       { name: "Barbell curl",         frames: CURL_FRAMES,         duration: 1800, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [53, 85], 24)] },
  db_curl:       { name: "DB curl",              frames: DB_CURL_FRAMES,      duration: 1800, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [53, 85])] },
  hammer:        { name: "Hammer curl",          frames: HAMMER_FRAMES,       duration: 1800, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [53, 85])] },
  preacher:      { name: "Preacher curl",        frames: PREACHER_FRAMES,     duration: 1800, floor: true,   category: "Pull", rig: RIG_SYMMETRIC, equipment: [preacherBench()] },
  incline_curl:  { name: "Incline DB curl",      frames: INCLINE_CURL_FRAMES, duration: 2000,                category: "Pull", rig: RIG_SYMMETRIC, equipment: [inclineBench(), dumbbell("db", [62, 124])] },

  // ── Shoulders ───────────────────────────────────────────────────────────
  lat_raise:    { name: "Lateral raise",       frames: LAT_RAISE_FRAMES,   duration: 1800, floor: true,  category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [52, 84])] },
  cable_lat:    { name: "Cable lateral raise", frames: CABLE_LAT_FRAMES,   duration: 1800, floor: true,  category: "Shoulders", rig: RIG_SINGLE,    equipment: [cableLow("cable", [50, 154], [50, 60])] },
  front_raise:  { name: "Front raise",         frames: FRONT_RAISE_FRAMES, duration: 1800, floor: true,  category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [56, 84])] },
  upright_row:  { name: "Upright row",         frames: UPRIGHT_FRAMES,     duration: 1800, floor: true,  category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [52, 88], 22)] },
  shrug:        { name: "Shrug",               frames: SHRUG_FRAMES,       duration: 1600, floor: true,  category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [52, 88], 30)] },
  db_shrug:     { name: "DB shrug",            frames: DB_SHRUG_FRAMES,    duration: 1600, floor: true,  category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [52, 88])] },

  // ── Legs ────────────────────────────────────────────────────────────────
  squat:        { name: "Back squat",          frames: SQUAT_FRAMES,      duration: 3000, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 30], 32)] },
  front_sq:     { name: "Front squat",         frames: FRONT_SQ_FRAMES,   duration: 3000, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [42, 36], 32)] },
  hack_sq:      { name: "Hack squat",          frames: HACK_FRAMES,       duration: 3000,               category: "Legs",      rig: RIG_SYMMETRIC },
  leg_press:    { name: "Leg press",           frames: LEG_PRESS_FRAMES,  duration: 2400,               category: "Legs",      rig: RIG_LEGS_ONLY },
  leg_press_1:  { name: "High-foot leg press", frames: LEG_PRESS_1_FRAMES, duration: 2400,               category: "Legs",      rig: RIG_LEGS_ONLY },
  bulg_split:   { name: "Bulgarian split squat", frames: BULG_FRAMES,     duration: 2600, floor: true,  category: "Legs",      rig: RIG_ASYM },
  lunges:       { name: "Lunge",               frames: LUNGE_FRAMES,      duration: 2400, floor: true,  category: "Legs",      rig: RIG_ASYM },
  step_up:      { name: "Step-up",             frames: STEP_UP_FRAMES,    duration: 2400, floor: true,  category: "Legs",      rig: RIG_ASYM, equipment: [box([64, 122], 30, 16)] },
  rdl:          { name: "Romanian deadlift",   frames: RDL_FRAMES,        duration: 2600, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [52, 90], 30)] },
  dead:         { name: "Deadlift",            frames: DEAD_FRAMES,       duration: 2800, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 122], 30)] },
  sdl:          { name: "Stiff-leg deadlift",  frames: SDL_FRAMES,        duration: 2600, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [52, 90], 30)] },
  good_morn:    { name: "Good morning",        frames: GOOD_MORN_FRAMES,  duration: 2400, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 32], 32)] },
  calf_raise:   { name: "Calf raise",          frames: CALF_FRAMES,       duration: 1400, floor: true,  category: "Legs",      rig: RIG_SYMMETRIC },
  calf_seat:    { name: "Seated calf raise",   frames: CALF_SEAT_FRAMES,  duration: 1400,               category: "Legs",      rig: RIG_LEGS_ONLY },
  leg_curl:     { name: "Lying leg curl",      frames: LEG_CURL_FRAMES,   duration: 1800,               category: "Legs",      rig: RIG_LEGS_ONLY },
  leg_curl_s:   { name: "Seated leg curl",     frames: LEG_CURL_S_FRAMES, duration: 1800,               category: "Legs",      rig: RIG_LEGS_ONLY },
  leg_ext:      { name: "Leg extension",       frames: LEG_EXT_FRAMES,    duration: 1800,               category: "Legs",      rig: RIG_LEGS_ONLY },
  hip_thrust:   { name: "Hip thrust",          frames: HIP_FRAMES,        duration: 2200,               category: "Legs",      rig: RIG_SYMMETRIC, equipment: [flatBench(), barbell("bar1", [60, 80], 28)] },

  // ── Core ────────────────────────────────────────────────────────────────
  w_situp:      { name: "Weighted sit-up",  frames: SITUP_FRAMES,        duration: 2000, floor: true, category: "Core", rig: RIG_SYMMETRIC },
  roman:        { name: "Back extension",   frames: ROMAN_FRAMES,        duration: 2200,              category: "Core", rig: RIG_SYMMETRIC },
  w_roman:      { name: "Oblique extension", frames: W_ROMAN_FRAMES,     duration: 2200,              category: "Core", rig: RIG_SYMMETRIC },
  cable_crunch: { name: "Cable crunch",     frames: CABLE_CRUNCH_FRAMES, duration: 1800,              category: "Core", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [50, 6], [50, 20])] },
  ab_wheel:     { name: "Ab wheel",         frames: AB_WHEEL_FRAMES,     duration: 2400, floor: true, category: "Core", rig: RIG_SYMMETRIC },
  hanging_lr:   { name: "Hanging leg raise", frames: HANGING_FRAMES,     duration: 2200,              category: "Core", rig: RIG_SYMMETRIC, equipment: [gripBar([50, 16])] },
  dragon:       { name: "Dragon flag",      frames: DRAGON_FRAMES,       duration: 2600,              category: "Core", rig: RIG_SYMMETRIC, equipment: [flatBench()] },
  pallof:       { name: "Pallof press",     frames: PALLOF_FRAMES,       duration: 1800, floor: true, category: "Core", rig: RIG_SINGLE,    equipment: [cableHigh("cable", [0, 50], [44, 56])] },
  ghd:          { name: "GHD sit-up",       frames: GHD_FRAMES,          duration: 2200,              category: "Core", rig: RIG_SYMMETRIC },
  plank:        { name: "Plank",            frames: PLANK_FRAMES,        duration: 2400, floor: true, category: "Core", rig: RIG_SYMMETRIC },
  side_plank:   { name: "Side plank",       frames: SIDE_PLANK_FRAMES,   duration: 2400, floor: true, category: "Core", rig: RIG_SINGLE },

  // ── Cardio ──────────────────────────────────────────────────────────────
  run:         { name: "Running",      frames: RUN_FRAMES,     duration: 900,  floor: true, category: "Cardio", rig: RIG_ASYM },
  cycle:       { name: "Cycling",      frames: CYCLE_FRAMES,   duration: 1000,               category: "Cardio", rig: RIG_ASYM },
  row_erg:     { name: "Rowing erg",   frames: ROW_ERG_FRAMES, duration: 2000,              category: "Cardio", rig: RIG_SYMMETRIC },
  jump_rope:   { name: "Jump rope",    frames: JUMP_FRAMES,    duration: 850,  floor: true, category: "Cardio", rig: RIG_SYMMETRIC },
  stair:       { name: "Stair climber", frames: STAIR_FRAMES,  duration: 1100,  floor: true, category: "Cardio", rig: RIG_ASYM },
  assault:     { name: "Assault bike", frames: ASSAULT_FRAMES, duration: 1000,               category: "Cardio", rig: RIG_ASYM },
  swim:        { name: "Swimming",     frames: SWIM_FRAMES,    duration: 1400, floor: true, category: "Cardio", rig: RIG_ASYM },
  sled_push:   { name: "Sled push",    frames: SLED_FRAMES,    duration: 1200, floor: true, category: "Cardio", rig: RIG_ASYM },
  battle_rope: { name: "Battle ropes", frames: BATTLE_FRAMES,  duration: 900,  floor: true, category: "Cardio", rig: RIG_ASYM },
  hiit:        { name: "HIIT",         frames: HIIT_FRAMES,    duration: 2000, floor: true, category: "Cardio", rig: RIG_SYMMETRIC },

  // ── Push (added) ──────────────────────────────────────────────────────────
  smith_bench:    { name: "Smith Machine Bench", frames: BENCH_FRAMES,   duration: 2200,              category: "Push", rig: RIG_SYMMETRIC, equipment: [flatBench(), barbell("bar1", [68, 35], 30)] },
  machine_chest:  { name: "Chest Press Machine", frames: MCHEST_FRAMES,  duration: 2000,              category: "Push", rig: RIG_SYMMETRIC },
  floor_press:    { name: "Floor Press",         frames: FLOOR_PRESS_FRAMES,   duration: 2200, floor: true, category: "Push", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [68, 35], 30)] },
  larsen_press:   { name: "Larsen Press",        frames: LARSEN_FRAMES,   duration: 2200,              category: "Push", rig: RIG_SYMMETRIC, equipment: [flatBench(), barbell("bar1", [68, 35], 30)] },
  db_pullover:    { name: "DB Pullover",         frames: PULLOVER_FRAMES, duration: 2400,             category: "Push", rig: RIG_SYMMETRIC, equipment: [flatBench(), dumbbell("db", [56, 46])] },
  svend_press:    { name: "Svend Press",         frames: SVEND_FRAMES,    duration: 2000, floor: true, category: "Push", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [58, 38])] },
  decline_pushup: { name: "Decline Push-up",     frames: DECLINE_PUSHUP_FRAMES, duration: 1800, floor: true, category: "Push", rig: RIG_SYMMETRIC },
  diamond_pushup: { name: "Diamond Push-up",     frames: DIAMOND_FRAMES,  duration: 1800, floor: true, category: "Push", rig: RIG_SYMMETRIC },
  archer_pushup:  { name: "Archer Push-up",      frames: ARCHER_PUSHUP_FRAMES,  duration: 2000, floor: true, category: "Push", rig: RIG_ASYM },
  tate_press:     { name: "Tate Press",          frames: SKULL_FRAMES,   duration: 2000,              category: "Push", rig: RIG_SYMMETRIC, equipment: [flatBench()] },
  jm_press:       { name: "JM Press",            frames: SKULL_FRAMES,   duration: 2000,              category: "Push", rig: RIG_SYMMETRIC, equipment: [flatBench()] },
  rope_pushdown:  { name: "Rope Pushdown",       frames: TRI_PUSH_FRAMES, duration: 1600, floor: true, category: "Push", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [50, 6], [60, 50])] },
  sa_pushdown:    { name: "Single-Arm Pushdown", frames: TRI_PUSH_FRAMES, duration: 1600, floor: true, category: "Push", rig: RIG_SINGLE,    equipment: [cableHigh("cable", [50, 6], [60, 50])] },
  kickback:       { name: "Tricep Kickback",     frames: KICKBACK_FRAMES, duration: 1800, floor: true, category: "Push", rig: RIG_SINGLE, equipment: [dumbbell("db", [50, 104])] },
  assisted_dips:  { name: "Assisted Dips",       frames: DIPS_FRAMES,    duration: 2200,              category: "Push", rig: RIG_SYMMETRIC, equipment: [gripBar([60, 90], 4)] },

  // ── Pull (added) ──────────────────────────────────────────────────────────
  machine_pd:       { name: "Machine Pulldown",      frames: LATPD_FRAMES,        duration: 2000,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [56, 4], [58, 22])] },
  straight_arm:     { name: "Straight-Arm Pulldown", frames: STRAIGHT_ARM_FRAMES, duration: 2000, floor: true, category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableHigh("cable", [80, 6], [74, 54])] },
  assisted_pullups: { name: "Assisted Pull-ups",     frames: PULLUP_FRAMES,       duration: 2400,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  chinups:          { name: "Chin-ups",              frames: CHIN_FRAMES,       duration: 2400,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [gripBar([54, 24])] },
  assisted_chinups: { name: "Assisted Chin-ups",     frames: CHIN_FRAMES,       duration: 2400,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [gripBar([54, 24])] },
  neutral_pullup:   { name: "Neutral-Grip Pull-ups", frames: PULLUP_FRAMES,       duration: 2400,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  weighted_pull:    { name: "Weighted Pull-ups",     frames: PULLUP_FRAMES,       duration: 2600,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  pendlay_row:      { name: "Pendlay Row",           frames: ROW_FRAMES,          duration: 2000, floor: true, category: "Pull", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [58, 118], 30)] },
  kroc_row:         { name: "Kroc Row",              frames: TBAR_FRAMES,         duration: 1800, floor: true, category: "Pull", rig: RIG_SINGLE, equipment: [dumbbell("db", [56, 116])] },
  seal_row:         { name: "Seal Row",              frames: SEAL_FRAMES,         duration: 2000,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [flatBench("bench", [22, 92])] },
  machine_row:      { name: "Machine Row",           frames: CS_ROW_FRAMES,       duration: 2000,              category: "Pull", rig: RIG_SYMMETRIC },
  inverted_row:     { name: "Inverted Row",          frames: IROW_FRAMES,         duration: 2000, floor: true, category: "Pull", rig: RIG_SYMMETRIC },
  ez_curl:          { name: "EZ-Bar Curl",           frames: CURL_FRAMES,         duration: 1800, floor: true, category: "Pull", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [53, 85], 24)] },
  cable_curl:       { name: "Cable Curl",            frames: CURL_FRAMES,         duration: 1800, floor: true, category: "Pull", rig: RIG_SYMMETRIC, equipment: [cableLow("cable", [50, 154], [53, 85])] },
  spider_curl:      { name: "Spider Curl",           frames: PREACHER_FRAMES,     duration: 1800,              category: "Pull", rig: RIG_SYMMETRIC, equipment: [preacherBench()] },
  conc_curl:        { name: "Concentration Curl",    frames: CONC_FRAMES,         duration: 1800, floor: true, category: "Pull", rig: RIG_SINGLE, equipment: [dumbbell("db", [58, 102])] },
  drag_curl:        { name: "Drag Curl",             frames: DRAG_FRAMES,         duration: 1800, floor: true, category: "Pull", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [52, 84], 24)] },
  zottman:          { name: "Zottman Curl",          frames: ZOTTMAN_FRAMES,      duration: 2000, floor: true, category: "Pull", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [53, 85])] },

  // ── Shoulders (added) ─────────────────────────────────────────────────────
  mach_lat:       { name: "Machine Lateral Raise", frames: LAT_RAISE_FRAMES,   duration: 1800, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC },
  lean_lat:       { name: "Leaning Lateral Raise", frames: LAT_RAISE_FRAMES,   duration: 1800, floor: true, category: "Shoulders", rig: RIG_SINGLE, equipment: [dumbbell("db", [52, 84])] },
  y_raise:        { name: "Y-Raise",               frames: Y_RAISE_FRAMES, duration: 1800, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [56, 84])] },
  plate_front:    { name: "Plate Front Raise",     frames: FRONT_RAISE_FRAMES, duration: 1800, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [dumbbell("db", [56, 84])] },
  viking_press:   { name: "Viking Press",          frames: OHP_FRAMES,         duration: 2000, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC },
  landmine_press: { name: "Landmine Press",        frames: LANDMINE_FRAMES,    duration: 2000, floor: true, category: "Shoulders", rig: RIG_SINGLE },
  behind_neck:    { name: "Behind-the-Neck Press", frames: BTN_FRAMES,         duration: 2000, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 35], 30)] },
  cuban_press:    { name: "Cuban Press",           frames: CUBAN_FRAMES,       duration: 2400, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC },
  rack_pull:      { name: "Rack Pull",             frames: RACK_FRAMES,        duration: 2400, floor: true, category: "Shoulders", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [52, 100], 30)] },

  // ── Legs (added) ──────────────────────────────────────────────────────────
  goblet_sq:      { name: "Goblet Squat",        frames: GOBLET_FRAMES,   duration: 3000, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [dumbbell("kb", [50, 46])] },
  zercher_sq:     { name: "Zercher Squat",       frames: ZERCHER_FRAMES,  duration: 3000, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  box_sq:         { name: "Box Squat",           frames: SQUAT_FRAMES,    duration: 3000, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 30], 32), box([6, 112], 24, 26)] },
  pause_sq:       { name: "Paused Squat",        frames: SQUAT_FRAMES,    duration: 3200, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 30], 32)] },
  safety_sq:      { name: "Safety-Bar Squat",    frames: SQUAT_FRAMES,    duration: 3000, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 30], 32)] },
  pendulum_sq:    { name: "Pendulum Squat",      frames: SQUAT_FRAMES,    duration: 3000, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  sissy_sq:       { name: "Sissy Squat",         frames: SISSY_FRAMES,    duration: 2800, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  walking_lunge:  { name: "Walking Lunge",       frames: WLUNGE_FRAMES,    duration: 2400, floor: true, category: "Legs", rig: RIG_ASYM },
  reverse_lunge:  { name: "Reverse Lunge",       frames: RLUNGE_FRAMES,    duration: 2400, floor: true, category: "Legs", rig: RIG_ASYM },
  curtsy_lunge:   { name: "Curtsy Lunge",        frames: CURTSY_FRAMES,    duration: 2400, floor: true, category: "Legs", rig: RIG_ASYM },
  single_rdl:     { name: "Single-Leg RDL",      frames: SL_RDL_FRAMES,   duration: 2600, floor: true, category: "Legs", rig: RIG_LEGS_IND },
  sumo_dl:        { name: "Sumo Deadlift",       frames: SUMO_FRAMES,     duration: 2800, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 118], 36)] },
  trap_bar_dl:    { name: "Trap-Bar Deadlift",   frames: TRAP_FRAMES,     duration: 2800, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  snatch_dl:      { name: "Snatch-Grip Deadlift", frames: SNATCH_FRAMES,  duration: 2800, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 118], 38)] },
  deficit_dl:     { name: "Deficit Deadlift",    frames: DEAD_FRAMES,     duration: 2800, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [50, 122], 30)] },
  glute_bridge:   { name: "Glute Bridge",        frames: GB_FRAMES,       duration: 2000, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  frog_pump:      { name: "Frog Pump",           frames: GB_FRAMES,       duration: 1600, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  glute_kickback: { name: "Cable Glute Kickback", frames: GKB_FRAMES,     duration: 2000, floor: true, category: "Legs", rig: RIG_SINGLE,    equipment: [cableLow("cable", [98, 138], [16, 92])] },
  pull_through:   { name: "Cable Pull-Through",  frames: RDL_FRAMES,      duration: 2400, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [cableLow("cable", [98, 150], [52, 116])] },
  kb_swing:       { name: "Kettlebell Swing",    frames: KB_SWING_FRAMES, duration: 1600, floor: true, category: "Legs", rig: RIG_SYMMETRIC, equipment: [dumbbell("kb", [48, 106])] },
  nordic_curl:    { name: "Nordic Hamstring Curl", frames: NORDIC_FRAMES, duration: 2600, floor: true, category: "Legs", rig: RIG_SYMMETRIC },
  abductor_m:     { name: "Hip Abductor Machine", frames: ABDUCTOR_FRAMES, duration: 1800,            category: "Legs", rig: RIG_LEGS_SPLIT },
  adductor_m:     { name: "Hip Adductor Machine", frames: ADDUCTOR_FRAMES, duration: 1800,            category: "Legs", rig: RIG_LEGS_SPLIT },
  donkey_calf:    { name: "Donkey Calf Raise",   frames: DONKEY_FRAMES,   duration: 1400, floor: true, category: "Legs", rig: RIG_SYMMETRIC },

  // ── Core (added) ──────────────────────────────────────────────────────────
  knee_raise:     { name: "Hanging Knee Raise", frames: KNEE_RAISE_FRAMES, duration: 2000,           category: "Core", rig: RIG_SYMMETRIC, equipment: [gripBar([50, 16])] },
  v_up:           { name: "V-Up",               frames: VUP_FRAMES,     duration: 1800, floor: true, category: "Core", rig: RIG_SYMMETRIC },
  bicycle:        { name: "Bicycle Crunch",     frames: BIKE_FRAMES,    duration: 1400, floor: true, category: "Core", rig: RIG_ASYM },
  russian_twist:  { name: "Russian Twist",      frames: RT_FRAMES,      duration: 1400,              category: "Core", rig: RIG_SYMMETRIC },
  woodchop:       { name: "Cable Woodchop",     frames: WC_FRAMES,      duration: 1800, floor: true, category: "Core", rig: RIG_SINGLE,    equipment: [cableHigh("cable", [90, 6], [70, 18])] },
  dead_bug:       { name: "Dead Bug",           frames: DEADBUG_FRAMES, duration: 2000, floor: true, category: "Core", rig: RIG_SINGLE },
  bird_dog:       { name: "Bird Dog",           frames: BIRDDOG_FRAMES, duration: 2200, floor: true, category: "Core", rig: RIG_SINGLE },
  l_sit:          { name: "L-Sit",              frames: LSIT_FRAMES,    duration: 2400,              category: "Core", rig: RIG_SYMMETRIC },
  hollow_hold:    { name: "Hollow Hold",        frames: HOLLOW_FRAMES,  duration: 2400, floor: true, category: "Core", rig: RIG_SYMMETRIC },
  mtn_climber:    { name: "Mountain Climber",   frames: MTN_FRAMES,     duration: 900,  floor: true, category: "Core", rig: RIG_LEGS_IND },
  copenhagen:     { name: "Copenhagen Plank",   frames: SIDE_PLANK_FRAMES, duration: 2400, floor: true, category: "Core", rig: RIG_SINGLE },
  suitcase_carry: { name: "Suitcase Carry",     frames: CARRY_FRAMES,   duration: 1100, floor: true, category: "Core", rig: RIG_LEGS_IND, equipment: [dumbbell("db", [54, 86])] },

  // ── Calisthenics (added) ──────────────────────────────────────────────────
  pike_pushup:        { name: "Pike Push-up",           frames: PIKE_FRAMES,      duration: 2000, floor: true, category: "Calisthenics", rig: RIG_SYMMETRIC },
  wall_hspu:          { name: "Wall Handstand Push-up", frames: HSPU_FRAMES,      duration: 2200,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  hspu:               { name: "Handstand Push-up",      frames: HSPU_FRAMES,      duration: 2200,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  pseudo_planche_pu:  { name: "Pseudo-Planche Push-up", frames: PSEUDO_PLANCHE_FRAMES, duration: 2000, floor: true, category: "Calisthenics", rig: RIG_SYMMETRIC },
  ring_dips:          { name: "Ring Dips",              frames: DIPS_FRAMES,      duration: 2200,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [strap([60, 0], [60, 90])] },
  korean_dips:        { name: "Korean Dips",            frames: DIPS_FRAMES,      duration: 2200,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([60, 90], 4)] },
  wall_handstand:     { name: "Wall Handstand Hold",    frames: HANDSTAND_FRAMES, duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  handstand:          { name: "Freestanding Handstand", frames: HANDSTAND_FRAMES, duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  planche_lean:       { name: "Planche Lean",           frames: PLANCHE_FRAMES,   duration: 2600, floor: true, category: "Calisthenics", rig: RIG_SYMMETRIC },
  tuck_planche:       { name: "Tuck Planche",           frames: TUCK_PLANCHE_FRAMES,   duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  adv_tuck_planche:   { name: "Adv. Tuck Planche",      frames: TUCK_PLANCHE_FRAMES,   duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  straddle_planche:   { name: "Straddle Planche",       frames: STRADDLE_PLANCHE_FRAMES, duration: 2600,      category: "Calisthenics", rig: RIG_LEGS_IND },
  full_planche:       { name: "Full Planche",           frames: PLANCHE_FRAMES,   duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  ring_row:           { name: "Ring Row",               frames: IROW_FRAMES,      duration: 2000, floor: true, category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [strap([58, 0], [58, 66])] },
  archer_pullup:      { name: "Archer Pull-up",         frames: ARCHER_PULLUP_FRAMES, duration: 2400,          category: "Calisthenics", rig: RIG_ASYM, equipment: [gripBar([53, 24], 44)] },
  typewriter_pullup:  { name: "Typewriter Pull-up",     frames: TYPEWRITER_FRAMES, duration: 2600,             category: "Calisthenics", rig: RIG_ASYM, equipment: [gripBar([50, 24], 44)] },
  explosive_pullup:   { name: "Explosive Pull-up",      frames: PULLUP_FRAMES,    duration: 1600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  muscle_up:          { name: "Muscle-up",              frames: MU_FRAMES,        duration: 2400,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  bar_muscle_up:      { name: "Bar Muscle-up",          frames: MU_FRAMES,        duration: 2200,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 24])] },
  ring_muscle_up:     { name: "Ring Muscle-up",         frames: MU_FRAMES,        duration: 2400,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [strap([56, 0], [56, 24])] },
  fl_raise:           { name: "Front Lever Raise",      frames: FL_RAISE_FRAMES,  duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  ice_cream_maker:    { name: "Ice Cream Maker",        frames: FL_RAISE_FRAMES,  duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  skin_cat:           { name: "Skin the Cat",           frames: FL_RAISE_FRAMES,  duration: 2800,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  tuck_fl:            { name: "Tuck Front Lever",       frames: TUCK_FL_FRAMES,    duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  adv_tuck_fl:        { name: "Adv. Tuck Front Lever",  frames: TUCK_FL_FRAMES,    duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  straddle_fl:        { name: "Straddle Front Lever",   frames: FLEVER_FRAMES,    duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  front_lever:        { name: "Front Lever",            frames: FLEVER_FRAMES,    duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([64, 22])] },
  tuck_bl:            { name: "Tuck Back Lever",        frames: TUCK_BL_FRAMES,    duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([34, 24])] },
  back_lever:         { name: "Back Lever",             frames: BLEVER_FRAMES,    duration: 2600,              category: "Calisthenics", rig: RIG_SYMMETRIC, equipment: [gripBar([34, 24])] },
  tuck_l_sit:         { name: "Tuck L-Sit",             frames: TUCK_LSIT_FRAMES,      duration: 2400,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  v_sit:              { name: "V-Sit",                  frames: VSIT_FRAMES,      duration: 2400,              category: "Calisthenics", rig: RIG_SYMMETRIC },
  tuck_human_flag:    { name: "Tuck Human Flag",        frames: TUCK_FLAG_FRAMES,      duration: 2600,              category: "Calisthenics", rig: RIG_ARMS_IND, equipment: [pole()] },
  human_flag:         { name: "Human Flag",             frames: FLAG_FRAMES,      duration: 2600,              category: "Calisthenics", rig: RIG_ARMS_IND, equipment: [pole()] },
  pistol_squat:       { name: "Pistol Squat",           frames: PISTOL_FRAMES,    duration: 2600, floor: true, category: "Calisthenics", rig: RIG_ASYM },
  box_pistol:         { name: "Box Pistol Squat",       frames: PISTOL_FRAMES,    duration: 2600, floor: true, category: "Calisthenics", rig: RIG_ASYM },
  assisted_pistol:    { name: "Assisted Pistol Squat",  frames: PISTOL_FRAMES,    duration: 2600, floor: true, category: "Calisthenics", rig: RIG_ASYM },
  shrimp_squat:       { name: "Shrimp Squat",           frames: SHRIMP_FRAMES,    duration: 2600, floor: true, category: "Calisthenics", rig: RIG_LEGS_IND },

  // ── Grip (added) ──────────────────────────────────────────────────────────
  farmers:     { name: "Farmer's Carry",     frames: CARRY_FRAMES,   duration: 1100, floor: true, category: "Grip", rig: RIG_LEGS_IND, equipment: [dumbbell("db", [54, 86])] },
  dead_hang:   { name: "Dead Hang",          frames: HANG_FRAMES,    duration: 2600,              category: "Grip", rig: RIG_SYMMETRIC, equipment: [gripBar([54, 16])] },
  plate_pinch: { name: "Plate Pinch",        frames: HOLD_FRAMES,    duration: 2000, floor: true, category: "Grip", rig: RIG_SYMMETRIC },
  wrist_curl:  { name: "Wrist Curl",         frames: WRIST_FRAMES,   duration: 1600,              category: "Grip", rig: RIG_SINGLE, equipment: [dumbbell("db", [66, 92])] },
  rev_curl:    { name: "Reverse Curl",       frames: CURL_FRAMES,    duration: 1800, floor: true, category: "Grip", rig: RIG_SYMMETRIC, equipment: [barbell("bar1", [53, 85], 24)] },
  fat_grip:    { name: "Fat-Grip Hold",      frames: HOLD_FRAMES,    duration: 2200, floor: true, category: "Grip", rig: RIG_SYMMETRIC },
  captains:    { name: "Captains-of-Crush",  frames: GRIPPER_FRAMES, duration: 1200, floor: true, category: "Grip", rig: RIG_SINGLE },
  towel_pull:  { name: "Towel Pull-up",      frames: PULLUP_FRAMES,  duration: 2400,              category: "Grip", rig: RIG_SYMMETRIC, equipment: [gripBar([56, 10]), strap([56, 10], [56, 24], "towel")] },
  thick_hold:  { name: "Thick-Bar Hold",     frames: HOLD_FRAMES,    duration: 2200, floor: true, category: "Grip", rig: RIG_SYMMETRIC },
  kb_bottoms:  { name: "KB Bottoms-Up Hold", frames: HOLD_FRAMES,    duration: 2200, floor: true, category: "Grip", rig: RIG_SINGLE },

  // ── Neck (added) ──────────────────────────────────────────────────────────
  neck_curl:    { name: "Plate Neck Curl",      frames: NECK_CURL_FRAMES,   duration: 1800, floor: true, category: "Neck", rig: RIG_SYMMETRIC },
  neck_ext:     { name: "Plate Neck Extension",  frames: NECK_EXT_FRAMES,   duration: 1800, floor: true, category: "Neck", rig: RIG_SYMMETRIC },
  neck_harness: { name: "Neck Harness",          frames: NECK_EXT_FRAMES,   duration: 1800, floor: true, category: "Neck", rig: RIG_SYMMETRIC },
  neck_lat:     { name: "Lateral Neck Flex",     frames: NECK_LAT_FRAMES,   duration: 1800, floor: true, category: "Neck", rig: RIG_SYMMETRIC },
  nm_4way:      { name: "4-Way Neck Machine",    frames: NECK_CURL_FRAMES,  duration: 1800, floor: true, category: "Neck", rig: RIG_SYMMETRIC },
  neck_bridge:  { name: "Neck Bridge",           frames: NECK_BRIDGE_FRAMES, duration: 2400, floor: true, category: "Neck", rig: RIG_SYMMETRIC },

  // ── Cardio (added) ────────────────────────────────────────────────────────
  incline_walk: { name: "Incline Treadmill Walk", frames: WALK_FRAMES,  duration: 1400, floor: true, category: "Cardio", rig: RIG_ASYM },
  sprint:       { name: "Sprints",                frames: RUN_FRAMES,   duration: 650,  floor: true, category: "Cardio", rig: RIG_ASYM },
  hill_sprint:  { name: "Hill Sprints",           frames: RUN_FRAMES,   duration: 700,  floor: true, category: "Cardio", rig: RIG_ASYM },
  shuttle_run:  { name: "Shuttle Run",            frames: RUN_FRAMES,   duration: 800,  floor: true, category: "Cardio", rig: RIG_ASYM },
  elliptical:   { name: "Elliptical",             frames: ELLIP_FRAMES, duration: 1200, floor: true, category: "Cardio", rig: RIG_ASYM },
  ski_erg:      { name: "Ski Erg",                frames: SKI_FRAMES,   duration: 1800, floor: true, category: "Cardio", rig: RIG_SYMMETRIC },
  burpees:      { name: "Burpees",                frames: HIIT_FRAMES,  duration: 2000, floor: true, category: "Cardio", rig: RIG_SYMMETRIC },
  prowler:      { name: "Prowler Push",           frames: SLED_FRAMES,  duration: 1200, floor: true, category: "Cardio", rig: RIG_ASYM },
};

// ── Equipment tracking ──────────────────────────────────────────────────────
// The renderer supports per-frame equipment overrides (frame.equipment[id]),
// but authoring them by hand for every keyframe is tedious — so they're baked
// here: barbells ride the legacy `bar` point (falling back to the hand), and
// cables keep their handle end pinned to the joint that holds them. Motions
// whose grip never moves (pull-up bars, flag poles) come out static naturally;
// anything that must not follow a joint is listed in the exceptions map.
// Once a motion has a real barbell, the legacy end-plate dot is dropped so the
// bar isn't drawn twice. Baked frames are fresh copies, so motions that share
// keyframe arrays don't leak overrides into each other.

type TrackJoint = "hand" | "ankle" | "hip" | "static";

const EQUIP_TRACKING_EXCEPTIONS: Record<string, Record<string, TrackJoint>> = {
  glute_kickback:    { cable: "ankle" },   // the cuff is on the ankle, not in the hand
  archer_pullup:     { gbar: "static" },   // wide grip — keep the bar centred
  typewriter_pullup: { gbar: "static" },
  human_flag:        { pole: "static" },
  tuck_human_flag:   { pole: "static" },
  towel_pull:        { gbar: "static" },   // the towel hangs from the bar overhead
};

function bakeEquipmentTracking(motions: Record<string, ExerciseMotion>): void {
  for (const [id, m] of Object.entries(motions)) {
    const trackable = (m.equipment ?? []).filter(e => e.kind !== "bench");
    if (trackable.length === 0) continue;
    const exceptions = EQUIP_TRACKING_EXCEPTIONS[id] ?? {};
    const hasBarbell = trackable.some(
      e => e.kind === "barbell" && exceptions[e.id] !== "static",
    );
    m.frames = m.frames.map(f => {
      const equip = { ...(f.equipment ?? {}) };
      for (const eq of trackable) {
        const mode = exceptions[eq.id];
        if (mode === "static") continue;
        if (eq.kind === "barbell") {
          // Authored overrides win; otherwise ride the bar point / hand.
          equip[eq.id] = { pos: f.bar ?? f.pose.hand, ...equip[eq.id] };
        } else {
          const joint = mode ?? "hand";
          const target =
            joint === "ankle" ? f.pose.ankle :
            joint === "hip"   ? f.pose.hip   : f.pose.hand;
          equip[eq.id] = { to: target, ...equip[eq.id] };
        }
      }
      const out: Frame = { ...f, equipment: equip };
      if (hasBarbell) delete out.bar;
      return out;
    });
  }
}

bakeEquipmentTracking(MOTIONS);

// Silence "unused" if the consumer doesn't import RIG_SINGLE.
export { RIG_SINGLE };
