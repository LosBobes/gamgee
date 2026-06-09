import { describe, expect, it } from "vitest";
import { analyzeEx, prescribeExercise, rampedSetsFromHistory, weightForRpe } from "../../src/analysis";
import { rirToRpe } from "../../src/utils";
import type { WorkoutSession } from "../../src/types";

// Build a single-exercise session. `rir` (reps left in the tank) is stored on
// the set as its RPE complement (RIR = 10 - RPE), mirroring how the UI
// persists per-set effort.
const session = (date: string, weight: string, reps: string, rir?: number): WorkoutSession => ({
  id: date,
  date,
  duration: 0,
  exercises: [
    {
      id: "bench",
      name: "Bench Press",
      type: "strength",
      uid: `bench_${date}`,
      sets: [{ weight, reps, done: true, ...(rir != null ? { rpe: rirToRpe(rir) } : {}) }],
    },
  ],
});

// `analyzeEx` reverses its input, so callers pass newest-first (matching the
// API, which returns history ordered by date DESC). This helper just keeps the
// argument order readable: newest session first.
const history = (...sessions: WorkoutSession[]): WorkoutSession[] => sessions;

describe("analyzeEx", () => {
  it("returns null when there is no usable history for the exercise", () => {
    expect(analyzeEx("bench", [])).toBeNull();
    expect(analyzeEx("bench", [session("2026-05-01", "", "")])).toBeNull();
  });

  it("skips sets with no parsable weight", () => {
    const bad: WorkoutSession = {
      id: "x", date: "2026-05-01", duration: 0,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_x",
        sets: [{ weight: "abc", reps: "8", done: false }],
      }],
    };
    expect(analyzeEx("bench", [bad])).toBeNull();
  });

  describe("first session → BASELINE", () => {
    it("adds a plate when the user left reps in the tank", () => {
      const res = analyzeEx("bench", [session("2026-05-01", "60", "8", 3)])!;
      expect(res.status.label).toBe("BASELINE");
      expect(res.nextWeight).toBe(62.5); // bench is upper-body → 2.5kg plate
      expect(res.nextReps).toBe(8);
      expect(res.trendPerSession).toBe(0);
    });

    it("holds the weight and chases a rep when the set was near failure", () => {
      const res = analyzeEx("bench", [session("2026-05-01", "60", "8", 0)])!;
      expect(res.status.label).toBe("BASELINE");
      expect(res.nextWeight).toBe(60);
      expect(res.nextReps).toBe(9);
    });

    it("holds and adds a rep when no effort was logged", () => {
      const res = analyzeEx("bench", [session("2026-05-01", "60", "8")])!;
      expect(res.status.label).toBe("BASELINE");
      expect(res.nextWeight).toBe(60);
      expect(res.nextReps).toBe(9);
    });
  });

  it("reads a steady climb as PROGRESSING and pushes the weight up", () => {
    const res = analyzeEx(
      "bench",
      history(
        session("2026-05-07", "67.5", "8"),
        session("2026-05-05", "65", "8"),
        session("2026-05-03", "62.5", "8"),
        session("2026-05-01", "60", "8"),
      ),
    )!;
    expect(res.status.label).toBe("PROGRESSING");
    expect(res.nextWeight).toBe(70);
    expect(res.nextReps).toBe(8);
    expect(res.trendPerSession).toBeGreaterThan(0);
  });

  it("reads flat sessions as HOLDING and suggests one more rep", () => {
    const res = analyzeEx(
      "bench",
      history(
        session("2026-05-05", "60", "8"),
        session("2026-05-03", "60", "8"),
        session("2026-05-01", "60", "8"),
      ),
    )!;
    expect(res.status.label).toBe("HOLDING");
    expect(res.nextWeight).toBe(60);
    expect(res.nextReps).toBe(9);
    expect(res.trendPerSession).toBeCloseTo(0, 5);
  });

  it("reads a downward drift as BACKING OFF and eases the weight", () => {
    const res = analyzeEx(
      "bench",
      history(
        session("2026-05-08", "62.5", "8"),
        session("2026-05-05", "65", "8"),
        session("2026-05-03", "67.5", "8"),
        session("2026-05-01", "70", "8"),
      ),
    )!;
    expect(res.status.label).toBe("BACKING OFF");
    expect(res.nextWeight).toBe(60);
    expect(res.trendPerSession).toBeLessThan(0);
  });

  it("lets a fresh easy session (high RIR) pull the next target higher", () => {
    const base = analyzeEx(
      "bench",
      history(
        session("2026-05-05", "65", "8"),
        session("2026-05-03", "62.5", "8"),
        session("2026-05-01", "60", "8"),
      ),
    )!;
    // Same numbers, but the most recent set was logged with 4 reps still in the
    // tank — that headroom should steepen the trend and raise the next target.
    const easyLast = analyzeEx(
      "bench",
      history(
        session("2026-05-05", "65", "8", 4),
        session("2026-05-03", "62.5", "8"),
        session("2026-05-01", "60", "8"),
      ),
    )!;
    expect(base.status.label).toBe("PROGRESSING");
    expect(easyLast.status.label).toBe("PROGRESSING");
    expect(easyLast.nextWeight).toBeGreaterThan(base.nextWeight);
  });

  it("uses the RIR-adjusted estimate for est. 1RM", () => {
    // 100×5 to failure ≈ a 117 1RM; the same set with 3 in the tank reads as a
    // 100×8 max ≈ 127.
    expect(analyzeEx("bench", [session("2026-05-01", "100", "5", 0)])!.est1RM).toBe(117);
    expect(analyzeEx("bench", [session("2026-05-01", "100", "5", 3)])!.est1RM).toBe(127);
  });

  it("picks the heaviest set as the top set (tie-break on reps), ignoring warmups", () => {
    const s: WorkoutSession = {
      id: "ms", date: "2026-05-01", duration: 0,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_ms",
        sets: [
          { weight: "100", reps: "5", done: true, is_warmup: true }, // heavy primer, must be ignored
          { weight: "80", reps: "5", done: true },
          { weight: "80", reps: "8", done: true }, // ties on weight, wins on reps
        ],
      }],
    };
    const res = analyzeEx("bench", [s])!;
    expect(res.last.topW).toBe(80);
    expect(res.last.topR).toBe(8);
  });

  it("uses a 5kg plate for lower-body lifts", () => {
    const sq = (date: string, w: string, r: string): WorkoutSession => ({
      ...session(date, w, r),
      exercises: [
        { id: "squat", name: "Squat", type: "strength", uid: `squat_${date}`, sets: [{ weight: w, reps: r, done: true }] },
      ],
    });
    const res = analyzeEx("squat", [sq("2026-05-01", "100", "5")])!;
    expect(res.status.label).toBe("BASELINE");
    // No RIR logged → holds the weight and chases a rep rather than guessing a jump.
    expect(res.nextWeight).toBe(100);
    expect(res.nextReps).toBe(6);
  });

  it("honours a manual steer override (status flips, trend still computed)", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8"), session("2026-05-01", "60", "8")),
      { weight: 80, reps: 5 },
    )!;
    expect(res.status.label).toBe("STEERING");
    expect(res.nextWeight).toBe(80);
    expect(res.nextReps).toBe(5);
    // The underlying trend/sessions are preserved so the chart still reads true.
    expect(res.sessions.length).toBe(2);
    expect(res.trendPerSession).toBeGreaterThan(0);
  });

  it("ignores an invalid (zero/blank) steer override", () => {
    const res = analyzeEx("bench", [session("2026-05-01", "60", "8", 3)], { weight: 0, reps: 5 })!;
    expect(res.status.label).toBe("BASELINE");
    expect(res.nextWeight).toBe(62.5);
  });
});

describe("weightForRpe", () => {
  it("returns the 1RM at RPE 10 with target_reps 1", () => {
    // 1RM × 1.0, no RIR, 1 rep: load = 1RM / (1 + 1/30) = 0.968 × 1RM.
    // Close enough to the 1RM — RPE 10 single is "to failure at 1 rep".
    const w = weightForRpe(100, 1, 10);
    expect(w).toBeGreaterThan(95);
    expect(w).toBeLessThan(100);
  });

  it("backs off with lower RPE", () => {
    const max = 100;
    const r10 = weightForRpe(max, 5, 10);
    const r8  = weightForRpe(max, 5, 8);
    const r6  = weightForRpe(max, 5, 6);
    expect(r10).toBeGreaterThan(r8);
    expect(r8).toBeGreaterThan(r6);
  });

  it("returns 0 for invalid 1RM", () => {
    expect(weightForRpe(0, 5, 8)).toBe(0);
    expect(weightForRpe(NaN, 5, 8)).toBe(0);
  });
});

describe("prescribeExercise", () => {
  it("returns null when nothing useful is configured", () => {
    expect(prescribeExercise("bench", undefined)).toBeNull();
    expect(prescribeExercise("bench", { rpe: 7 })).toBeNull();  // no max, no weight
  });

  it("builds a warmup ramp + working set block from max", () => {
    const presc = prescribeExercise("bench", {
      rpe: 7,
      max_weight: 100, max_reps: 5,
      warmup_sets: 2, working_sets: 3, working_reps: 8,
    })!;
    expect(presc.derived).toBe(true);
    expect(presc.warmup.length).toBe(2);
    expect(presc.working.count).toBe(3);
    expect(presc.working.reps).toBe(8);
    // Warmups should ramp up, working weight greater than any warmup.
    presc.warmup.forEach(w => expect(w.weight).toBeLessThan(presc.working.weight));
    expect(presc.warmup[0].weight).toBeLessThan(presc.warmup[1].weight);
    // est_1RM from 100 × 5 ≈ 100 × (1 + 5/30) ≈ 117 (orm1 rounds to integer).
    expect(presc.est1RM).toBe(117);
  });

  it("rounds working weight to 2.5kg increments for upper-body lifts", () => {
    const presc = prescribeExercise("bench", {
      rpe: 8, max_weight: 100, max_reps: 5,
      warmup_sets: 0, working_sets: 3, working_reps: 5,
    })!;
    // Bench is in UPPER_IDS → 2.5kg plate.
    expect(presc.working.weight % 2.5).toBe(0);
  });

  it("rounds working weight to 5kg increments for lower-body lifts", () => {
    const presc = prescribeExercise("squat", {
      rpe: 8, max_weight: 120, max_reps: 5,
      warmup_sets: 0, working_sets: 3, working_reps: 5,
    })!;
    expect(presc.working.weight % 5).toBe(0);
  });

  it("falls back to legacy weight when max isn't set", () => {
    const presc = prescribeExercise("bench", {
      rpe: 7, weight: 80, sets: 3, reps: 8,
    })!;
    expect(presc.derived).toBe(false);
    expect(presc.working.weight).toBe(80);
    expect(presc.working.count).toBe(3);
    expect(presc.working.reps).toBe(8);
  });

  it("uses a denser warmup ramp when warmup_sets is high", () => {
    const presc = prescribeExercise("bench", {
      rpe: 7, max_weight: 100, max_reps: 5,
      warmup_sets: 4, working_sets: 3, working_reps: 5,
    })!;
    expect(presc.warmup.length).toBe(4);
    // 4 warmups: 30/50/70/85% — ascending pattern.
    const ws = presc.warmup.map(w => w.weight);
    for (let i = 1; i < ws.length; i++) expect(ws[i]).toBeGreaterThanOrEqual(ws[i - 1]);
  });
});

describe("rampedSetsFromHistory", () => {
  it("returns null for an exercise with no history (treated as brand-new)", () => {
    expect(rampedSetsFromHistory("bench", "strength", false, [])).toBeNull();
    // History exists but not for this exercise.
    expect(rampedSetsFromHistory("squat", "strength", false, [session("2026-05-01", "60", "8")])).toBeNull();
  });

  it("reproduces the last set count and ramps the working weight up", () => {
    const last: WorkoutSession = {
      id: "s1", date: "2026-05-01", duration: 0,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_s1",
        sets: [
          { weight: "60", reps: "8", done: true, rpe: rirToRpe(3) },
          { weight: "60", reps: "8", done: true, rpe: rirToRpe(3) },
          { weight: "60", reps: "8", done: true, rpe: rirToRpe(3) },
        ],
      }],
    };
    const sets = rampedSetsFromHistory("bench", "strength", false, [last])!;
    expect(sets).toHaveLength(3);
    // Baseline with 3 RIR adds a 2.5kg plate → every working set ramps to 62.5.
    sets.forEach(s => {
      expect(s.weight).toBe("62.5");
      expect(s.reps).toBe("8");
      expect(s.prefilled).toBe(true);
      expect(s.done).toBe(false);
    });
  });

  it("carries warmups forward verbatim and only ramps the working sets", () => {
    const last: WorkoutSession = {
      id: "s2", date: "2026-05-01", duration: 0,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_s2",
        sets: [
          { weight: "40", reps: "5", done: true, is_warmup: true },
          { weight: "60", reps: "8", done: true, rpe: rirToRpe(3) },
        ],
      }],
    };
    const sets = rampedSetsFromHistory("bench", "strength", false, [last])!;
    expect(sets).toHaveLength(2);
    // Warmup is untouched.
    expect(sets[0]).toMatchObject({ weight: "40", reps: "5", is_warmup: true });
    // Working set ramped.
    expect(sets[1]).toMatchObject({ weight: "62.5", reps: "8", prefilled: true });
    expect(sets[1].is_warmup).toBeUndefined();
  });

  it("carries values forward without ramping for assisted lifts", () => {
    const last: WorkoutSession = {
      id: "s3", date: "2026-05-01", duration: 0,
      exercises: [{
        id: "dips", name: "Dips", type: "strength", is_assisted: true, uid: "dips_s3",
        sets: [{ weight: "20", reps: "8", done: true }],
      }],
    };
    const sets = rampedSetsFromHistory("dips", "strength", true, [last])!;
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ weight: "20", reps: "8", prefilled: true });
  });
});
