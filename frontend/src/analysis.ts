import type { WorkoutSession, StatusDef, ProgressionSpeed, ExerciseConfig } from "./types";
import { UPPER_IDS, STATUS } from "./constants";
import { orm1 } from "./utils";

export interface SessionSummary {
  date: string;
  topW: number;
  topR: number;
  totalSets: number;
  /** Post-session perceived effort 1..10 the user rated this session at.
   * Null when they skipped the prompt; carried through so the analyzer can
   * scale the next session's progression step. */
  sessionRpe?: number | null;
  /** Per-exercise effective RPE: max of the per-set rpe values across this
   * exercise's working (non-warmup) sets. Null when no working set carried
   * an rpe. Takes precedence over `sessionRpe` for the multiplier lookup
   * because it reflects the actual effort for THIS lift rather than an
   * overall session vibe. */
  exerciseRpe?: number | null;
}
export interface AnalysisResult {
  sessions: SessionSummary[];
  last: SessionSummary;
  est1RM: number | null;
  status: StatusDef;
  nextWeight: number;
  nextReps: number;
  reason: string;
}

// Scales the default jump size when recommending the next weight. "moderate"
// keeps the legacy 2.5kg upper / 5kg lower behaviour.
const STEP_MULT: Record<ProgressionSpeed, number> = { slow: 0.5, moderate: 1, fast: 2 };

/** Default post-session RPE → next-session step multiplier table. Users
 * (and per-exercise overrides) can replace it via `RpeMultiplierTable` on
 * AnalyzeOptions; this is the fallback when nothing is supplied.
 *
 * Tuned around RPE 7 ("on point") being neutral — the user hit the planned
 * effort so we proceed with the standard jump. Lower numbers indicate the
 * session was easier than planned so we bump the jump up; higher numbers
 * mean the session was already brutal so we ease off (or back the weight
 * down outright at RPE 10). */
export const DEFAULT_RPE_STEP_MULTIPLIERS: Record<number, number> = {
  1: 1.6,
  2: 1.5,
  3: 1.35,
  4: 1.2,
  5: 1.1,
  6: 1.05,
  7: 1.0,
  8: 0.7,
  9: 0.4,
  10: 0.0,
};

/** RPE → step multiplier lookup table. Keys are "1".."10" (strings to match
 * the JSONB shape on User.rpe_multipliers) or numeric — both are accepted. */
export type RpeMultiplierTable = Record<string | number, number>;

export interface AnalyzeOptions {
  speed?: ProgressionSpeed;
  /** User-level RPE multiplier table; falls back to {@link DEFAULT_RPE_STEP_MULTIPLIERS}. */
  rpeMultipliers?: RpeMultiplierTable | null;
  /** Per-exercise override; keyed by exercise id, each value is its own
   * RPE→multiplier table. Takes precedence over `rpeMultipliers`. */
  rpeMultipliersByExercise?: Record<string, RpeMultiplierTable> | null;
}

/** Look up the step multiplier for a given session RPE, honouring per-exercise
 * overrides → user table → default table. Returns 1.0 (neutral) when the rpe
 * is null/invalid or no table has an entry for it. */
function lookupRpeMultiplier(
  exId: string,
  rpe: number | null | undefined,
  opts: AnalyzeOptions,
): number {
  if (rpe == null || !Number.isFinite(rpe)) return 1;
  const key = String(Math.round(rpe));
  const perEx = opts.rpeMultipliersByExercise?.[exId];
  if (perEx && Object.prototype.hasOwnProperty.call(perEx, key)) {
    const v = Number(perEx[key]);
    if (Number.isFinite(v) && v >= 0) return v;
  }
  const user = opts.rpeMultipliers;
  if (user && Object.prototype.hasOwnProperty.call(user, key)) {
    const v = Number(user[key]);
    if (Number.isFinite(v) && v >= 0) return v;
  }
  return DEFAULT_RPE_STEP_MULTIPLIERS[Math.round(rpe)] ?? 1;
}

export function analyzeEx(
  exId: string,
  history: WorkoutSession[],
  speedOrOpts: ProgressionSpeed | AnalyzeOptions = "moderate",
): AnalysisResult | null {
  const opts: AnalyzeOptions = typeof speedOrOpts === "string" ? { speed: speedOrOpts } : speedOrOpts;
  const speed = opts.speed ?? "moderate";

  const sessions: SessionSummary[] = [];
  [...history].reverse().forEach(w => {
    const f = w.exercises.find(e => e.id === exId);
    if (!f || !f.sets.length) return;
    // Pick the top set as a single unit (heaviest weight, tie-break on most
    // reps) so topW and topR always come from the same actual set. Warmup
    // sets are excluded so a 2-plate warmup doesn't masquerade as the top set.
    const workingSets = f.sets.filter(s => !s.is_warmup);
    const pairs = workingSets
      .map(s => ({ w: parseFloat(s.weight), r: parseInt(s.reps) }))
      .filter(p => !isNaN(p.w) && p.w !== 0)
      .map(p => ({ w: p.w, r: !isNaN(p.r) && p.r > 0 ? p.r : 0 }));
    if (!pairs.length) return;
    const top = pairs.reduce((a, b) => {
      if (b.w !== a.w) return b.w > a.w ? b : a;
      return b.r > a.r ? b : a;
    });
    // Max per-set RPE across this exercise's working sets — represents the
    // peak effort the user reached on this lift, which is what we want to
    // feed the multiplier (a single hard set says more about progression
    // headroom than an average).
    const perSetRpes = workingSets
      .map(s => (typeof s.rpe === "number" && Number.isFinite(s.rpe) ? s.rpe : null))
      .filter((r): r is number => r !== null);
    const exerciseRpe = perSetRpes.length ? Math.max(...perSetRpes) : null;
    sessions.push({
      date: w.date,
      topW: top.w,
      topR: top.r,
      totalSets: f.sets.length,
      sessionRpe: w.rpe ?? null,
      exerciseRpe,
    });
  });
  if (!sessions.length) return null;

  const last  = sessions[sessions.length - 1];
  const prev  = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const back2 = sessions.length >= 3 ? sessions[sessions.length - 3] : null;
  const est1RM = last.topR > 0 ? orm1(last.topW, last.topR) : null;
  // Apply the RPE multiplier on top of the speed-driven base step: an "easy"
  // last session bumps the jump up, a "brutal" one eases off. Per-exercise
  // RPE (max of working sets) takes precedence over the post-session overall
  // RPE — actual effort on THIS lift is more informative than a session vibe.
  const effectiveRpe = last.exerciseRpe ?? last.sessionRpe;
  const rpeMult = lookupRpeMultiplier(exId, effectiveRpe, opts);
  const step = (UPPER_IDS.has(exId) ? 2.5 : 5) * STEP_MULT[speed] * rpeMult;
  // Round to the nearest plate-pair we'd actually load on a barbell.
  const plate    = UPPER_IDS.has(exId) ? 2.5 : 5;
  const roundUp  = (raw: number) => Math.max(plate, Math.round(raw / plate) * plate);

  let status: StatusDef;
  let nextWeight: number;
  let nextReps: number;
  let reason: string;

  if (sessions.length === 1) {
    status = STATUS.NEW;
    nextWeight = step > 0 ? last.topW + step : last.topW;
    nextReps = last.topR || 8;
    reason = `First session at ${last.topW}kg. Felt manageable? Add ${step}kg next time and match that rep count.`;
  } else {
    const wD = last.topW - prev!.topW;
    const rD = last.topR - prev!.topR;
    const stalled3 = back2 && back2.topW === last.topW && prev!.topW === last.topW;
    if (stalled3) {
      status = STATUS.DELOAD;
      const refStep = step > 0 ? step : plate;
      nextWeight = Math.round(last.topW * 0.85 / refStep) * refStep;
      nextReps = last.topR + 2;
      reason = `Three sessions at the same weight. Drop to ${nextWeight}kg (~85%), nail the reps with perfect form, then attack it fresh next block.`;
    } else if (wD > 0) {
      status = STATUS.GAINING;
      nextWeight = last.topW + step;
      nextReps = last.topR;
      reason = `Up ${wD}kg from last session. Keep adding ${step}kg while it's moving.`;
    } else if (wD === 0 && rD > 0) {
      if (last.topR >= 12) {
        status = STATUS.READY;
        nextWeight = roundUp(last.topW + step);
        nextReps = Math.max(6, last.topR - 4);
        reason = `${last.topR} reps at ${last.topW}kg. Time to bump. Move to ${nextWeight}kg, expect ~${nextReps} reps. That's the deal.`;
      } else {
        status = STATUS.BUILDING; nextWeight = last.topW; nextReps = last.topR + 1;
        reason = `Reps up to ${last.topR}. Keep milking this weight. Push for ${last.topR + 1} before touching the plates.`;
      }
    } else if (wD === 0 && rD === 0) {
      status = STATUS.PLATEAUED; nextWeight = last.topW; nextReps = last.topR + 1;
      reason = `Same numbers twice in a row. Longer rest (3 min), tighter setup, one more rep.`;
    } else {
      status = STATUS.STALLED; nextWeight = prev!.topW; nextReps = last.topR + 2;
      reason = `Weight dropped from ${prev!.topW}kg to ${last.topW}kg. Step back, nail it, re-earn it.`;
    }
  }
  return { sessions, last, est1RM, status, nextWeight, nextReps, reason };
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
