import type { WorkoutSession, StatusDef, ProgressionSpeed, RpeMultipliers, RpePerExerciseMultipliers } from "./types";
import { DEFAULT_RPE_MULTIPLIERS } from "./types";
import { UPPER_IDS, STATUS } from "./constants";
import { orm1 } from "./utils";

export interface SessionSummary { date: string; topW: number; topR: number; totalSets: number; }
export interface AnalysisResult {
  sessions: SessionSummary[];
  last: SessionSummary;
  est1RM: number | null;
  status: StatusDef;
  nextWeight: number;
  nextReps: number;
  reason: string;
  /** RPE the user reported on the most recent session, if any. Useful for the
   * UI so it can explain why the recommendation is bigger or smaller than
   * the user's progression-speed setting alone would imply. */
  lastRpe: number | null;
}

// Scales the default jump size when recommending the next weight. "moderate"
// keeps the legacy 2.5kg upper / 5kg lower behaviour.
const STEP_MULT: Record<ProgressionSpeed, number> = { slow: 0.5, moderate: 1, fast: 2 };

export interface AnalyzeOptions {
  speed?:        ProgressionSpeed;
  /** RPE (1..10) the user reported for this specific exercise in the most
   * recent session that included it. Callers usually compute this with
   * {@link lastExerciseRpe} so progression scales from per-exercise effort,
   * not the overall session feeling. */
  lastRpe?:      number | null;
  /** Global RPE → step-multiplier table. Defaults to {@link DEFAULT_RPE_MULTIPLIERS}. */
  rpeTable?:     RpeMultipliers;
  /** Optional per-exercise overrides for individual RPE levels. */
  rpePerEx?:     RpePerExerciseMultipliers;
}

/** Find the most recent per-exercise effort rating for `exId` by walking
 * history newest-first. Returns null when the user hasn't rated this
 * exercise yet. */
export function lastExerciseRpe(exId: string, history: WorkoutSession[]): number | null {
  for (const w of history) {
    const ex = w.exercises.find(e => e.id === exId);
    if (ex && ex.rpe != null && Number.isFinite(ex.rpe)) return ex.rpe;
  }
  return null;
}

/** Pull the multiplier for the given RPE, preferring a per-exercise override
 * when present and falling back to the global table, then the defaults. */
export function rpeMultiplier(
  exId: string,
  rpe:  number | null | undefined,
  table:    RpeMultipliers          = DEFAULT_RPE_MULTIPLIERS,
  perEx:    RpePerExerciseMultipliers = {},
): number {
  if (rpe == null || !Number.isFinite(rpe)) return 1;
  const level    = String(Math.max(1, Math.min(10, Math.round(rpe))));
  const override = perEx[exId]?.[level];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  const global = table[level];
  if (typeof global === "number" && Number.isFinite(global)) return global;
  return DEFAULT_RPE_MULTIPLIERS[level] ?? 1;
}

export function analyzeEx(
  exId: string,
  history: WorkoutSession[],
  speedOrOpts: ProgressionSpeed | AnalyzeOptions = "moderate",
): AnalysisResult | null {
  const opts: AnalyzeOptions = typeof speedOrOpts === "string" ? { speed: speedOrOpts } : speedOrOpts;
  const speed     = opts.speed     ?? "moderate";
  const lastRpe   = opts.lastRpe   ?? null;
  const rpeTable  = opts.rpeTable  ?? DEFAULT_RPE_MULTIPLIERS;
  const rpePerEx  = opts.rpePerEx  ?? {};

  const sessions: SessionSummary[] = [];
  [...history].reverse().forEach(w => {
    const f = w.exercises.find(e => e.id === exId);
    if (!f || !f.sets.length) return;
    // Pick the top set as a single unit (heaviest weight, tie-break on most
    // reps) so topW and topR always come from the same actual set. Computing
    // them with independent Math.max calls used to mix sets — e.g. a session
    // with [100kg×3, 80kg×12] would report topW=100, topR=12 and an est1RM
    // of orm1(100, 12)=140kg that never happened.
    const pairs = f.sets
      .map(s => ({ w: parseFloat(s.weight), r: parseInt(s.reps) }))
      .filter(p => !isNaN(p.w) && p.w > 0)
      .map(p => ({ w: p.w, r: !isNaN(p.r) && p.r > 0 ? p.r : 0 }));
    if (!pairs.length) return;
    const top = pairs.reduce((a, b) => {
      if (b.w !== a.w) return b.w > a.w ? b : a;
      return b.r > a.r ? b : a;
    });
    sessions.push({ date: w.date, topW: top.w, topR: top.r, totalSets: f.sets.length });
  });
  if (!sessions.length) return null;

  const last  = sessions[sessions.length - 1];
  const prev  = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const back2 = sessions.length >= 3 ? sessions[sessions.length - 3] : null;
  const est1RM = last.topR > 0 ? orm1(last.topW, last.topR) : null;
  const baseStep = (UPPER_IDS.has(exId) ? 2.5 : 5) * STEP_MULT[speed];
  // Apply RPE scaling on top of the user's progression speed so e.g. "fast"
  // + RPE 9 still backs off, while "slow" + RPE 2 still adds plenty.
  const rpeMult = rpeMultiplier(exId, lastRpe, rpeTable, rpePerEx);
  const step    = baseStep * rpeMult;
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
    reason = step > 0
      ? `First session at ${last.topW}kg. Felt manageable? Add ${step}kg next time and match that rep count.`
      : `First session at ${last.topW}kg. Match the reps next time — that RPE says no extra load yet.`;
  } else {
    const wD = last.topW - prev!.topW;
    const rD = last.topR - prev!.topR;
    const stalled3 = back2 && back2.topW === last.topW && prev!.topW === last.topW;
    if (stalled3) {
      status = STATUS.DELOAD;
      const refStep = baseStep > 0 ? baseStep : plate;
      nextWeight = Math.round(last.topW * 0.85 / refStep) * refStep;
      nextReps = last.topR + 2;
      reason = `Three sessions at the same weight. Drop to ${nextWeight}kg (~85%), nail the reps with perfect form, then attack it fresh next block.`;
    } else if (wD > 0) {
      status = STATUS.GAINING;
      nextWeight = step > 0 ? last.topW + step : last.topW;
      nextReps = last.topR;
      reason = step > 0
        ? `Up ${wD}kg from last session. Keep adding ${step}kg while it's moving.`
        : `Up ${wD}kg from last session — but RPE was max. Hold this weight and own it.`;
    } else if (wD === 0 && rD > 0) {
      if (last.topR >= 12) {
        status = STATUS.READY;
        nextWeight = step > 0 ? roundUp(last.topW + step) : last.topW;
        nextReps = Math.max(6, last.topR - 4);
        reason = step > 0
          ? `${last.topR} reps at ${last.topW}kg. Time to bump. Move to ${nextWeight}kg, expect ~${nextReps} reps. That's the deal.`
          : `${last.topR} reps at ${last.topW}kg, but last RPE was brutal — repeat the weight, target ${nextReps} clean reps.`;
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
  return { sessions, last, est1RM, status, nextWeight, nextReps, reason, lastRpe };
}
