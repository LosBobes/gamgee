import type { WorkoutSession, StatusDef, ExerciseConfig } from "./types";
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

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

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
 */
export function analyzeEx(exId: string, history: WorkoutSession[]): AnalysisResult | null {
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
    return { sessions, last, est1RM, status: STATUS.NEW, nextWeight, nextReps, trendPerSession: 0, reason };
  }

  // ── Fit the trend of RIR-adjusted 1RM over the recent window. ─────────────
  const window = sessions.slice(-TREND_WINDOW);
  const slope = linregSlope(window.map((s, i) => [i, s.e1rm] as const)); // kg per session
  const lastE1 = last.e1rm || last.topW;
  // Project one session forward, then clamp the growth to a sane band so a
  // single freak session can't recommend a wild jump (or a steep drop).
  const predicted = clamp(lastE1 + slope, lastE1 * 0.95, lastE1 * 1.08);
  const growth = lastE1 > 0 ? predicted / lastE1 : 1;
  // "Holding" gets a small dead-band tied to the lift's plate so the read
  // isn't knife-edge around zero.
  const gainThresh = plate * 0.1;

  let status: StatusDef;
  let nextWeight: number;
  let nextReps = targetReps;
  let reason: string;

  if (slope > gainThresh) {
    status = STATUS.GAINING;
    nextWeight = roundPlate(last.topW * growth);
    if (nextWeight > last.topW) {
      reason = `Trending up ~${slope.toFixed(1)}kg/session. Step up to ${nextWeight}kg for ${nextReps}.`;
    } else {
      // Positive trend, but not enough yet to round up a plate — bank a rep.
      nextWeight = last.topW;
      nextReps = targetReps + 1;
      reason = `Climbing steadily. Hold ${last.topW}kg and bank rep #${nextReps} — the next plate is close.`;
    }
  } else if (slope < -gainThresh) {
    status = STATUS.SLIPPING;
    nextWeight = roundPlate(last.topW * growth); // growth < 1 here → a small back-off
    reason = nextWeight < last.topW
      ? `Drifting down lately. Reset to ${nextWeight}kg, own every rep, then build back up.`
      : `Drifting down lately. Stay at ${last.topW}kg and rebuild your reps before pushing on.`;
  } else {
    status = STATUS.HOLDING;
    nextWeight = last.topW;
    nextReps = targetReps + 1;
    reason = `Flat across your last ${window.length} sessions. Same ${last.topW}kg — chase rep #${nextReps} to crack it open.`;
  }

  return { sessions, last, est1RM, status, nextWeight, nextReps, trendPerSession: slope, reason };
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
