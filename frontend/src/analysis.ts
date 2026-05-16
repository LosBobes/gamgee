import type { WorkoutSession, StatusDef, ProgressionSpeed } from "./types";
import { UPPER_IDS, STATUS } from "./constants";
import { orm1 } from "./utils";

export interface E1RMPoint { date: string; e1rm: number; topW: number; topR: number; }

/**
 * For each session in `history` that contains `exId`, compute the best e1RM
 * across that session's sets (Epley). Returns oldest-first so a chart can
 * render left-to-right without re-sorting.
 */
export function e1rmHistory(exId: string, history: WorkoutSession[]): E1RMPoint[] {
  const points: E1RMPoint[] = [];
  [...history].reverse().forEach(w => {
    const ex = w.exercises.find(e => e.id === exId);
    if (!ex) return;
    let best: E1RMPoint | null = null;
    for (const set of ex.sets) {
      const wt = parseFloat(set.weight);
      const rp = parseInt(set.reps);
      if (!Number.isFinite(wt) || !Number.isFinite(rp) || wt <= 0 || rp <= 0) continue;
      const est = orm1(wt, rp);
      if (!best || est > best.e1rm) {
        best = { date: w.date, e1rm: Math.round(est * 10) / 10, topW: wt, topR: rp };
      }
    }
    if (best) points.push(best);
  });
  return points;
}

/**
 * Weekly volume per muscle group over the past `weeks` weeks. Each set
 * contributes (weight * reps) to its primary muscle group, weighted at 100%,
 * and to its secondary group at 50%.
 */
export function volumeByGroup(
  history: WorkoutSession[],
  muscleMap: Record<string, { p: string[]; s: string[] }>,
  groupMap: Record<string, string>,  // muscle id -> group id
  weeks: number = 4,
): Record<string, number> {
  const cutoff = Date.now() - weeks * 7 * 24 * 3600 * 1000;
  const totals: Record<string, number> = {};
  for (const session of history) {
    const ts = Date.parse(session.date);
    if (Number.isFinite(ts) && ts < cutoff) continue;
    for (const ex of session.exercises) {
      const muscles = muscleMap[ex.id];
      if (!muscles) continue;
      let exVolume = 0;
      for (const set of ex.sets) {
        if (!set.done) continue;
        const w = parseFloat(set.weight);
        const r = parseInt(set.reps);
        if (Number.isFinite(w) && Number.isFinite(r) && w > 0 && r > 0) {
          exVolume += w * r;
        }
      }
      if (exVolume <= 0) continue;
      for (const mid of muscles.p || []) {
        const g = groupMap[mid];
        if (!g) continue;
        totals[g] = (totals[g] ?? 0) + exVolume;
      }
      for (const mid of muscles.s || []) {
        const g = groupMap[mid];
        if (!g) continue;
        totals[g] = (totals[g] ?? 0) + exVolume * 0.5;
      }
    }
  }
  return totals;
}

/**
 * Compute a current streak counted in "training days within the last N days",
 * tolerant of REST_TOLERANCE rest days between sessions. Mirrors the
 * server-side computation in /api/streaks but operates on cached history so
 * the UI can render before the network round-trip.
 */
const REST_TOLERANCE = 2;
export function currentStreak(history: WorkoutSession[], today: Date = new Date()): number {
  const dates = [...new Set(
    history.map(h => h.date && h.date.slice(0, 10)).filter(Boolean) as string[]
  )].sort();
  if (!dates.length) return 0;
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  const gapToToday = Math.floor((today.getTime() - last.getTime()) / 86400000);
  if (gapToToday > REST_TOLERANCE + 1) return 0;
  let run = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const a = new Date(dates[i - 1] + "T00:00:00").getTime();
    const b = new Date(dates[i] + "T00:00:00").getTime();
    const gap = Math.round((b - a) / 86400000);
    if (gap <= REST_TOLERANCE + 1) {
      run++;
    } else {
      break;
    }
  }
  return run;
}

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
