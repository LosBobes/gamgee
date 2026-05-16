import type { WorkoutSession, StatusDef, ProgressionSpeed } from "./types";
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
}

// Scales the default jump size when recommending the next weight. "moderate"
// keeps the legacy 2.5kg upper / 5kg lower behaviour.
const STEP_MULT: Record<ProgressionSpeed, number> = { slow: 0.5, moderate: 1, fast: 2 };

export function analyzeEx(exId: string, history: WorkoutSession[], speed: ProgressionSpeed = "moderate"): AnalysisResult | null {
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
  const step   = (UPPER_IDS.has(exId) ? 2.5 : 5) * STEP_MULT[speed];

  let status: StatusDef;
  let nextWeight: number;
  let nextReps: number;
  let reason: string;

  if (sessions.length === 1) {
    status = STATUS.NEW; nextWeight = last.topW + step; nextReps = last.topR || 8;
    reason = `First session at ${last.topW}kg. Felt manageable? Add ${step}kg next time and match that rep count.`;
  } else {
    const wD = last.topW - prev!.topW;
    const rD = last.topR - prev!.topR;
    const stalled3 = back2 && back2.topW === last.topW && prev!.topW === last.topW;
    if (stalled3) {
      status = STATUS.DELOAD; nextWeight = Math.round(last.topW * 0.85 / step) * step; nextReps = last.topR + 2;
      reason = `Three sessions at the same weight. Drop to ${nextWeight}kg (~85%), nail the reps with perfect form, then attack it fresh next block.`;
    } else if (wD > 0) {
      status = STATUS.GAINING; nextWeight = last.topW + step; nextReps = last.topR;
      reason = `Up ${wD}kg from last session. Keep adding ${step}kg while it's moving.`;
    } else if (wD === 0 && rD > 0) {
      if (last.topR >= 12) {
        status = STATUS.READY; nextWeight = last.topW + step; nextReps = Math.max(6, last.topR - 4);
        reason = `${last.topR} reps at ${last.topW}kg. Time to bump. Move to ${last.topW + step}kg, expect ~${Math.max(6, last.topR - 4)} reps. That's the deal.`;
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
