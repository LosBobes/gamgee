import type { WorkoutSession, StatusDef } from "./types";
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

export function analyzeEx(exId: string, history: WorkoutSession[]): AnalysisResult | null {
  const sessions: SessionSummary[] = [];
  [...history].reverse().forEach(w => {
    const f = w.exercises.find(e => e.id === exId);
    if (!f || !f.sets.length) return;
    const ws = f.sets.map(s => parseFloat(s.weight)).filter(x => !isNaN(x) && x > 0);
    const rs = f.sets.map(s => parseInt(s.reps)).filter(x => !isNaN(x) && x > 0);
    if (!ws.length) return;
    sessions.push({ date: w.date, topW: Math.max(...ws), topR: rs.length ? Math.max(...rs) : 0, totalSets: f.sets.length });
  });
  if (!sessions.length) return null;

  const last  = sessions[sessions.length - 1];
  const prev  = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const back2 = sessions.length >= 3 ? sessions[sessions.length - 3] : null;
  const est1RM = last.topR > 0 ? orm1(last.topW, last.topR) : null;
  const step   = UPPER_IDS.has(exId) ? 2.5 : 5;

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
