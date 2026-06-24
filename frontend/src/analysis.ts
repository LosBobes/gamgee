import type { WorkoutSession, WorkoutSet, StatusDef, ExerciseConfig, ProgressionOverride } from "./types";
import { UPPER_IDS, STATUS } from "./constants";
import { orm1, e1rmWithRir, rpeToRir } from "./utils";

export interface SessionSummary {
  date: string;
  topW: number;
  topR: number;
  totalSets: number;
  /** Reps left in reserve on the top set (0 = taken to failure). Derived from
   * the per-set effort the user logged, which is stored as RPE (RIR = 10 -
   * RPE). Null when the set carried no effort rating. */
  topRir: number | null;
  /** RIR-adjusted estimated 1RM for this session's top set. This is the single
   * number the trend is fit on — it folds the weight, the reps, and how much
   * the user had left in the tank into one measure of demonstrated strength. */
  e1rm: number;
}
export interface AnalysisResult {
  sessions: SessionSummary[];
  last: SessionSummary;
  est1RM: number | null;
  status: StatusDef;
  nextWeight: number;
  nextReps: number;
  /** Modelled change in estimated 1RM per session, in kg. Positive = gaining,
   * negative = slipping. Drives both the status read and the next target. */
  trendPerSession: number;
  reason: string;
}

/** How many of the most recent sessions feed the trend. Enough to smooth out
 * a single off day, short enough that the recommendation tracks recent form
 * rather than ancient history. */
const TREND_WINDOW = 8;

/** Least-squares slope of y over x for a set of points. Returns 0 when there
 * aren't enough points (or they're all at the same x) to define a line. */
function linregSlope(points: ReadonlyArray<readonly [number, number]>): number {
  const n = points.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const [x, y] of points) { sx += x; sy += y; sxy += x * y; sxx += x * x; }
  const denom = n * sxx - sx * sx;
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

/**
 * Read an exercise's progression from the user's whole history and extrapolate
 * the next target.
 *
 * Rather than the old state machine that only compared the last two or three
 * sessions, this fits a straight line through the RIR-adjusted estimated 1RM
 * of every recent session and projects it one session forward. The slope tells
 * us, in plain terms, whether the lifter is gaining, holding, or slipping; the
 * projection sets the next weight. Per-set RIR ("reps left in the tank") makes
 * the per-session strength estimate honest — a hard set and an easy set at the
 * same weight×reps are not the same data point.
 *
 * `history` is expected newest-first (the order the API returns it).
 *
 * When `override` is supplied (the user steered this lift on the diagnostics
 * chart), the trend still drives the read but the recommended next target is
 * replaced by the override and the status flips to STEERED.
 */
export function analyzeEx(
  exId: string,
  history: WorkoutSession[],
  override?: ProgressionOverride | null,
): AnalysisResult | null {
  // Fold a manual steer over a computed result: keep the trend/sessions/est1RM
  // but hand back the user's target and flag it as steered.
  const steer = (r: AnalysisResult): AnalysisResult =>
    override && Number.isFinite(override.weight) && override.weight > 0
      ? {
          ...r,
          status: STATUS.STEERED,
          nextWeight: override.weight,
          nextReps: Math.max(1, Math.round(override.reps)),
          reason: `You're steering this lift — aiming for ${override.weight}kg × ${Math.max(1, Math.round(override.reps))}. Reset to hand it back to the auto-trend.`,
        }
      : r;

  // Build chronological (oldest → newest) per-session summaries.
  const sessions: SessionSummary[] = [];
  [...history].reverse().forEach(w => {
    const f = w.exercises.find(e => e.id === exId);
    if (!f || !f.sets.length) return;
    // Top set as a single unit (heaviest weight, tie-break on reps) so topW and
    // topR come from the same real set. Warmups are excluded so a heavy primer
    // can't masquerade as the working top set.
    const workingSets = f.sets.filter(s => !s.is_warmup);
    const parsed = workingSets
      .map(s => ({ w: parseFloat(s.weight), r: parseInt(s.reps), rir: rpeToRir(s.rpe) }))
      .filter(p => Number.isFinite(p.w) && p.w !== 0)
      .map(p => ({ w: p.w, r: Number.isFinite(p.r) && p.r > 0 ? p.r : 0, rir: p.rir }));
    if (!parsed.length) return;
    const top = parsed.reduce((a, b) => (b.w !== a.w ? (b.w > a.w ? b : a) : (b.r > a.r ? b : a)));
    // When the top set carried no RIR we treat it as taken to failure (rir 0),
    // which makes e1rm collapse to plain Epley — i.e. no worse than before.
    const e1rm = top.r > 0 ? e1rmWithRir(top.w, top.r, top.rir ?? 0) : top.w;
    sessions.push({
      date: w.date,
      topW: top.w,
      topR: top.r,
      totalSets: f.sets.length,
      topRir: top.rir,
      e1rm,
    });
  });
  if (!sessions.length) return null;

  const last = sessions[sessions.length - 1];
  const plate = UPPER_IDS.has(exId) ? 2.5 : 5;
  const roundPlate = (raw: number) => Math.max(plate, Math.round(raw / plate) * plate);
  const targetReps = last.topR > 0 ? last.topR : 8;
  const est1RM = last.topR > 0 ? last.e1rm : null;

  // ── First session: no trend yet. Seed a sensible target off how much the
  // user had left in the tank. ──────────────────────────────────────────────
  if (sessions.length === 1) {
    const rir = last.topRir;
    let nextWeight = last.topW;
    let nextReps = targetReps;
    let reason: string;
    if (rir != null && rir >= 3) {
      nextWeight = roundPlate(last.topW + plate);
      reason = `First time logging this — you left ~${rir} in the tank, so add ${plate}kg next time.`;
    } else if (rir != null && rir <= 1) {
      nextReps = targetReps + 1;
      reason = `First time logging this, and you pushed near failure. Hold ${last.topW}kg and chase one more rep.`;
    } else {
      nextReps = targetReps + 1;
      reason = `Baseline logged at ${last.topW}kg. Repeat it and add a rep before you add weight.`;
    }
    return steer({ sessions, last, est1RM, status: STATUS.NEW, nextWeight, nextReps, trendPerSession: 0, reason });
  }

  // ── Fit the trend of RIR-adjusted 1RM over the recent window. The slope
  // still drives the status read (gaining / holding / slipping) and the chart,
  // but the next *target* now comes from a double-progression scheme rather
  // than a raw 1RM projection. The old projection multiplied the top weight by
  // a clamped growth factor and rounded to the nearest plate — on a shallow
  // trend that rounds straight back to the same plate every session, so the
  // recommendation got stuck on "hold the weight, bank another rep" forever and
  // the load never actually moved. ─────────────────────────────────────────
  const window = sessions.slice(-TREND_WINDOW);
  const slope = linregSlope(window.map((s, i) => [i, s.e1rm] as const)); // kg per session
  // "Holding" gets a small dead-band tied to the lift's plate so the read
  // isn't knife-edge around zero.
  const gainThresh = plate * 0.1;

  // Double progression: add a rep at the current load each session until you
  // reach the top of the rep range, then add a plate and reset to the bottom.
  // The rep floor is the fewest working reps logged at the *current* top weight
  // (where this load started); the ceiling sits a few reps above it. A low-rep
  // strength range gets a tighter window than a higher-rep hypertrophy range.
  const repsAtTopW = window
    .filter(s => Math.abs(s.topW - last.topW) < 1e-6 && s.topR > 0)
    .map(s => s.topR);
  const floor = repsAtTopW.length ? Math.min(...repsAtTopW) : (last.topR > 0 ? last.topR : 8);
  const repWindow = floor <= 5 ? 2 : 3;
  const ceiling = floor + repWindow;
  const plateUp = roundPlate(last.topW + plate);
  const rir = last.topRir;
  // A top set with reps still in the tank earns the plate early — no need to
  // grind out every rep in the range first when the load was clearly light.
  const easyHeadroom = rir != null && rir >= 3;
  const atCeiling = last.topR >= ceiling;

  let status: StatusDef;
  let nextWeight: number;
  let nextReps = targetReps;
  let reason: string;

  if (slope < -gainThresh && last.topR <= floor) {
    // Genuinely slipping and already at the bottom of the range — back the load
    // off a plate and rebuild the reps from there.
    status = STATUS.SLIPPING;
    nextWeight = Math.max(plate, roundPlate(last.topW - plate));
    nextReps = ceiling;
    reason = nextWeight < last.topW
      ? `Drifting down lately. Drop to ${nextWeight}kg and rebuild toward ${ceiling} reps before pushing on.`
      : `Drifting down lately. Hold ${last.topW}kg and own every rep before the plate goes on.`;
  } else if (atCeiling || easyHeadroom) {
    // Top of the rep range, or an easy set with headroom → progressive overload:
    // add a plate and reset the reps to the bottom of the range.
    status = slope < -gainThresh ? STATUS.SLIPPING : STATUS.GAINING;
    nextWeight = plateUp;
    nextReps = floor;
    reason = easyHeadroom && !atCeiling
      ? `That set had ~${rir} in reserve — bank the plate now. Start ${nextWeight}kg × ${floor} and build the reps back up.`
      : `You topped the range at ${last.topR} reps — plate up. Start ${nextWeight}kg × ${floor} and climb again.`;
  } else {
    // Still inside the rep range → keep the load and add a rep, working toward
    // the ceiling where the next plate goes on.
    status = slope > gainThresh ? STATUS.GAINING : slope < -gainThresh ? STATUS.SLIPPING : STATUS.HOLDING;
    nextWeight = last.topW;
    nextReps = Math.min(ceiling, last.topR + 1);
    reason = `Hold ${last.topW}kg and chase rep #${nextReps} — hit ${ceiling} and the plate goes on (→ ${plateUp}kg).`;
  }

  return steer({ sessions, last, est1RM, status, nextWeight, nextReps, trendPerSession: slope, reason });
}


// ── Cardio progression ──────────────────────────────────────────────────────

/** One cardio session, aggregated across its sets. For cardio the two logged
 * columns are duration (minutes, stored in `weight`) and distance (km, stored
 * in `reps`) — see ExerciseCard's column labels. Either may legitimately be 0
 * (run for time without tracking distance, or vice-versa). */
export interface CardioSessionSummary {
  date: string;
  /** Total minutes across the session's sets. */
  duration: number;
  /** Total kilometres across the session's sets. */
  distance: number;
}

export interface CardioAnalysisResult {
  sessions: CardioSessionSummary[];
  last: CardioSessionSummary;
  /** The metric the progression is driven on — distance when the user tracks
   * it, otherwise duration. */
  metric: "distance" | "duration";
  status: StatusDef;
  nextDuration: number;
  nextDistance: number;
  /** Change in the primary metric per session (km or min). */
  trendPerSession: number;
  reason: string;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const roundHalf = (v: number) => Math.round(v * 2) / 2;

/**
 * Cardio counterpart to {@link analyzeEx}. Strength's weight×reps / 1RM model is
 * meaningless for a run — there's no plate to add and no 1RM to estimate — so
 * cardio gets its own read: progressive overload here means covering more
 * ground or holding the same distance in less time (a quicker pace), or simply
 * lasting longer when distance isn't tracked.
 *
 * `history` is expected newest-first (the order the API returns it).
 */
export function analyzeCardio(exId: string, history: WorkoutSession[]): CardioAnalysisResult | null {
  const sessions: CardioSessionSummary[] = [];
  [...history].reverse().forEach(w => {
    const f = w.exercises.find(e => e.id === exId);
    if (!f || !f.sets.length) return;
    let duration = 0, distance = 0;
    f.sets.forEach(s => {
      const d = parseFloat(s.weight); // minutes
      const k = parseFloat(s.reps);   // kilometres
      if (Number.isFinite(d) && d > 0) duration += d;
      if (Number.isFinite(k) && k > 0) distance += k;
    });
    // Skip only the truly empty sessions — a session with just one of the two
    // columns filled (the other left at 0) is still a real, logged effort.
    if (duration <= 0 && distance <= 0) return;
    sessions.push({ date: w.date, duration: round1(duration), distance: round1(distance) });
  });
  if (!sessions.length) return null;

  const last = sessions[sessions.length - 1];
  const tracksDistance = sessions.some(s => s.distance > 0);
  const metric: "distance" | "duration" = tracksDistance ? "distance" : "duration";

  // Sensible single-step overload increments: ~10% of the last effort, floored
  // so the target always nudges forward (½ km for distance, 1 min for time).
  const distStep = Math.max(0.5, roundHalf(last.distance * 0.1));
  const durStep  = Math.max(1, Math.round(last.duration * 0.1));

  // First session: no trend yet — just seed a small step up.
  if (sessions.length === 1) {
    const nextDistance = tracksDistance ? round1(last.distance + distStep) : 0;
    const nextDuration = tracksDistance ? last.duration : last.duration + durStep;
    const reason = tracksDistance
      ? `Baseline logged. Aim for ${nextDistance}km next time${last.duration > 0 ? " — same time means a quicker pace" : ""}.`
      : `Baseline logged at ${last.duration} min. Add a few minutes next time to build your engine.`;
    return { sessions, last, metric, status: STATUS.NEW, nextDuration, nextDistance, trendPerSession: 0, reason };
  }

  const window = sessions.slice(-TREND_WINDOW);
  const slope = linregSlope(window.map((s, i) => [i, metric === "distance" ? s.distance : s.duration] as const));
  const thresh = metric === "distance" ? 0.1 : 0.5;

  let status: StatusDef;
  let nextDuration: number;
  let nextDistance: number;
  let reason: string;

  if (metric === "distance") {
    nextDistance = round1(last.distance + distStep);
    nextDuration = last.duration; // hold the time → the extra distance is a faster pace
    if (slope < -thresh) {
      status = STATUS.SLIPPING;
      nextDistance = round1(last.distance); // rebuild at the current distance first
      reason = `Distance has slipped lately. Lock in ${nextDistance}km clean before reaching further.`;
    } else if (slope > thresh) {
      status = STATUS.GAINING;
      reason = `Up ~${round1(slope)}km/session. Push to ${nextDistance}km${last.duration > 0 ? " — hold the time for a quicker pace" : ""}.`;
    } else {
      status = STATUS.HOLDING;
      reason = `Flat lately. Reach for ${nextDistance}km${last.duration > 0 ? " — same minutes, a touch faster" : ""}.`;
    }
  } else {
    nextDuration = last.duration + durStep;
    nextDistance = last.distance;
    if (slope < -thresh) {
      status = STATUS.SLIPPING;
      nextDuration = last.duration;
      reason = `Time has dropped off lately. Rebuild ${nextDuration} clean minutes before going longer.`;
    } else if (slope > thresh) {
      status = STATUS.GAINING;
      reason = `Up ~${round1(slope)} min/session. Stretch it to ${nextDuration} min.`;
    } else {
      status = STATUS.HOLDING;
      reason = `Flat lately. Add a few minutes — go for ${nextDuration} min to push the engine.`;
    }
  }

  return { sessions, last, metric, status, nextDuration, nextDistance, trendPerSession: round1(slope), reason };
}


/** Fixed load step between consecutive working sets, and the bump applied over
 * last session's opening weight. Most lifters open a touch heavier than they
 * did last time and ramp the load up set to set, so we seed the first working
 * set a step above last session's *starting* weight and add another step for
 * each set after it. */
const SET_WEIGHT_STEP = 5;

/**
 * Build a pre-populated set layout for an exercise from the user's saved
 * history, for seeding a freshly built workout.
 *
 * Strategy: find the most recent session that included this exercise and
 * reproduce its set *structure* (set count, warmup flags, per-set reps). For
 * strength lifts the working sets are seeded as a small ascending ramp — open a
 * step above last session's *opening* working weight (people start a bit
 * heavier than last time, not at last session's top/max set) and climb by a
 * fixed {@link SET_WEIGHT_STEP}kg on every set after it. Warmups, cardio, and
 * assisted lifts carry their last logged numbers forward as-is.
 *
 * Returns null when the exercise has no usable history — the caller should
 * leave it blank, exactly like a brand-new lift, so only exercises the user has
 * actually logged get pre-populated.
 *
 * `history` is expected newest-first (the order the API returns it).
 */
export function rampedSetsFromHistory(
  exId: string,
  exType: string,
  isAssisted: boolean,
  history: WorkoutSession[],
  override?: ProgressionOverride | null,
): WorkoutSet[] | null {
  const lastSession = history.find(s => s.exercises.some(e => e.id === exId));
  if (!lastSession) return null;
  const lastEx = lastSession.exercises.find(e => e.id === exId);
  if (!lastEx || lastEx.sets.length === 0) return null;

  // Only strength lifts get a ramped progression; cardio / assisted work just
  // carries the last numbers forward.
  const isStrength = exType === "strength" && !isAssisted;

  // Opening weight (and reps) for the first working set. A manual steer wins;
  // otherwise we open a step above last session's *first* working set — not its
  // heaviest — so the suggestion tracks where the user actually starts, plus a
  // nudge. When we can't read a usable opening weight, the ramp is skipped and
  // sets carry forward verbatim.
  let openWeight: number | null = null;
  let openReps: string | null = null;
  if (isStrength) {
    if (override && Number.isFinite(override.weight) && override.weight > 0) {
      openWeight = override.weight;
      openReps = String(Math.max(1, Math.round(override.reps)));
    } else {
      const firstWorking = lastEx.sets.find(s => !s.is_warmup && parseFloat(s.weight) > 0);
      const w = firstWorking ? parseFloat(firstWorking.weight) : NaN;
      if (Number.isFinite(w) && w > 0) openWeight = w + SET_WEIGHT_STEP;
    }
  }

  // Index of the current working set, so each one ramps SET_WEIGHT_STEP kg over
  // the last.
  let workingIdx = 0;

  return lastEx.sets.map(s => {
    if (openWeight != null && !s.is_warmup) {
      const weight = openWeight + SET_WEIGHT_STEP * workingIdx;
      workingIdx += 1;
      return {
        weight: String(weight),
        reps: openReps ?? s.reps,
        done: false,
        prefilled: true,
      };
    }
    return {
      weight: s.weight,
      reps: s.reps,
      done: false,
      prefilled: !!(s.weight || s.reps),
      ...(s.is_warmup ? { is_warmup: true } : {}),
    };
  });
}


// ── Regime-driven prescription ──────────────────────────────────────────────

/** Prescription for one exercise on one day, derived from its ExerciseConfig.
 * Returned by {@link prescribeExercise} and consumed by the active workout to
 * pre-populate sets (warmup ramp then working sets). */
export interface ExercisePrescription {
  /** Warmup sets, lighter weights and descending reps. */
  warmup: { weight: number; reps: number }[];
  /** Working sets — same prescription for each. */
  working: { weight: number; reps: number; count: number };
  /** Estimated 1RM derived from max_weight × max_reps via Epley. */
  est1RM: number | null;
  /** Whether the prescription was fully derived (max_weight + max_reps
   * present) or just a best-effort approximation. */
  derived: boolean;
}

/** Round to the nearest plate increment we'd actually load on a barbell. */
function roundToPlate(weight: number, exId: string): number {
  const plate = UPPER_IDS.has(exId) ? 2.5 : 5;
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  return Math.max(plate, Math.round(weight / plate) * plate);
}

/** Pick a working weight that the user could complete for `target_reps` at
 * `rpe`, given an Epley-estimated 1RM. RIR = 10 - RPE; the target set leaves
 * RIR reps in reserve, so the *to-failure* rep count equals target_reps + RIR
 * and we back out the load that would put a max effort at that rep count. */
export function weightForRpe(est1RM: number, targetReps: number, rpe: number): number {
  if (!Number.isFinite(est1RM) || est1RM <= 0) return 0;
  const rir = Math.max(0, Math.min(10, 10 - rpe));
  const effectiveReps = Math.max(1, targetReps + rir);
  // Epley reversed: load = 1RM / (1 + reps/30).
  return est1RM / (1 + effectiveReps / 30);
}

/** Map a warmup-set count to a percentage ramp of the working weight.
 * 1 set: just one 60% prime; 2 sets: 50/75; 3 sets: 40/60/80; etc. */
function warmupRamp(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0.6];
  if (n === 2) return [0.5, 0.75];
  if (n === 3) return [0.4, 0.6, 0.8];
  if (n === 4) return [0.3, 0.5, 0.7, 0.85];
  // 5+ warmups: linear from 30% up to 90%.
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(0.3 + ((0.9 - 0.3) * i) / (n - 1));
  return out;
}

/** Descending reps so the joints get warm without exhausting the user. */
function warmupReps(n: number, targetReps: number): number[] {
  if (n <= 0) return [];
  const base = Math.max(targetReps, 5);
  const seq: number[] = [];
  for (let i = 0; i < n; i++) {
    // First warmup gets 1.5× target reps, last gets ~half.
    const frac = 1.5 - (i * 0.7) / Math.max(1, n - 1);
    seq.push(Math.max(1, Math.round(base * frac)));
  }
  return seq;
}

const DEFAULT_RPE = 7;
const DEFAULT_WORKING_SETS = 3;
const DEFAULT_WORKING_REPS = 8;
const DEFAULT_WARMUP_SETS = 2;

/** Translate a regime ExerciseConfig into a concrete warmup ramp + working
 * block. Returns null when there's not enough information to prescribe
 * anything (no max, no legacy weight) — caller should fall back to the
 * usual blank/history-based prefill. */
export function prescribeExercise(
  exId: string,
  cfg: ExerciseConfig | undefined,
): ExercisePrescription | null {
  if (!cfg) return null;
  const rpe = clampRpe(cfg.rpe ?? DEFAULT_RPE);
  const workingReps = Math.max(1, cfg.working_reps ?? cfg.reps ?? DEFAULT_WORKING_REPS);
  const workingSetsCount = Math.max(1, cfg.working_sets ?? cfg.sets ?? DEFAULT_WORKING_SETS);
  const warmupCount = Math.max(0, cfg.warmup_sets ?? DEFAULT_WARMUP_SETS);

  // Derive the working weight. If the user gave us a max, compute from RPE.
  // Otherwise fall back to the legacy manual `weight` field. If neither is
  // present we can't prescribe anything useful — caller falls back.
  let workingWeight = 0;
  let est1RM: number | null = null;
  let derived = false;
  if (cfg.max_weight && cfg.max_weight > 0) {
    const mr = Math.max(1, cfg.max_reps ?? 1);
    est1RM = orm1(cfg.max_weight, mr);
    workingWeight = weightForRpe(est1RM, workingReps, rpe);
    derived = true;
  } else if (cfg.weight && cfg.weight > 0) {
    workingWeight = cfg.weight;
  } else {
    return null;
  }

  const workingRounded = roundToPlate(workingWeight, exId);
  const ramp = warmupRamp(warmupCount);
  const reps = warmupReps(warmupCount, workingReps);
  const warmup = ramp.map((pct, i) => ({
    weight: roundToPlate(workingRounded * pct, exId),
    reps: reps[i] ?? Math.max(1, workingReps),
  }));

  return {
    warmup,
    working: { weight: workingRounded, reps: workingReps, count: workingSetsCount },
    est1RM,
    derived,
  };
}

function clampRpe(rpe: number): number {
  if (!Number.isFinite(rpe)) return DEFAULT_RPE;
  return Math.max(1, Math.min(10, Math.round(rpe)));
}
