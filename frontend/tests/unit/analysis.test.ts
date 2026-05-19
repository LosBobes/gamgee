import { describe, expect, it } from "vitest";
import { analyzeEx, prescribeExercise, weightForRpe } from "../../src/analysis";
import type { WorkoutSession } from "../../src/types";

const session = (date: string, weight: string, reps: string): WorkoutSession => ({
  id: date,
  date,
  duration: 0,
  exercises: [
    {
      id: "bench",
      name: "Bench Press",
      type: "strength",
      uid: `bench_${date}`,
      sets: [{ weight, reps, done: true }],
    },
  ],
});

describe("analyzeEx", () => {
  it("returns null when there is no history for the exercise", () => {
    expect(analyzeEx("bench", [])).toBeNull();
    expect(analyzeEx("bench", [session("2026-05-01", "", "")])).toBeNull();
  });

  it("flags the first session as NEW and suggests a small bump", () => {
    const res = analyzeEx("bench", [session("2026-05-01", "60", "8")])!;
    expect(res.status.label).toBe("NEW");
    // bench is in UPPER_IDS so step is 2.5kg
    expect(res.nextWeight).toBe(62.5);
    expect(res.nextReps).toBe(8);
    expect(res.est1RM).toBe(76); // 60 * (1 + 8/30) = 76
  });

  // `analyzeEx` reverses its input, so callers pass newest-first (matching
  // the API which returns history ordered by date DESC). Helper below
  // constructs that order so the first arg is the most recent session.
  const history = (...sessions: WorkoutSession[]): WorkoutSession[] => sessions;

  it("flags weight increase as PROGRESSING", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8"), session("2026-05-01", "60", "8")),
    )!;
    expect(res.status.label).toBe("PROGRESSING");
    expect(res.nextWeight).toBe(65);
  });

  it("flags rep gains under 12 as BUILDING REPS", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "60", "9"), session("2026-05-01", "60", "8")),
    )!;
    expect(res.status.label).toBe("BUILDING REPS");
    expect(res.nextWeight).toBe(60);
    expect(res.nextReps).toBe(10);
  });

  it("flags 12+ reps as READY TO JUMP", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "60", "12"), session("2026-05-01", "60", "10")),
    )!;
    expect(res.status.label).toBe("READY TO JUMP");
    expect(res.nextWeight).toBe(62.5);
  });

  it("flags identical back-to-back sessions as PLATEAU", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "60", "8"), session("2026-05-01", "60", "8")),
    )!;
    expect(res.status.label).toBe("PLATEAU");
    expect(res.nextReps).toBe(9);
  });

  it("flags weight regression as STALLED", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "60", "8"), session("2026-05-01", "62.5", "8")),
    )!;
    expect(res.status.label).toBe("STALLED");
    expect(res.nextWeight).toBe(62.5);
  });

  it("flags three identical-weight sessions as DELOAD", () => {
    const res = analyzeEx(
      "bench",
      history(
        session("2026-05-05", "60", "8"),
        session("2026-05-03", "60", "8"),
        session("2026-05-01", "60", "8"),
      ),
    )!;
    expect(res.status.label).toBe("DELOAD");
    // round(60 * 0.85 / 2.5) * 2.5 = 50
    expect(res.nextWeight).toBe(50);
    expect(res.nextReps).toBe(10);
  });

  it("uses a 5kg step for lower-body lifts", () => {
    const sq = (date: string, w: string, r: string): WorkoutSession => ({
      ...session(date, w, r),
      exercises: [
        { id: "squat", name: "Squat", type: "strength", uid: `squat_${date}`, sets: [{ weight: w, reps: r, done: true }] },
      ],
    });
    const res = analyzeEx("squat", [sq("2026-05-01", "100", "5")])!;
    expect(res.status.label).toBe("NEW");
    expect(res.nextWeight).toBe(105);
  });

  it("picks the heaviest set's reps for topR (not max-of-each-column)", () => {
    // Session has a heavy triple and a light high-rep set. The top set is
    // 100kg×3, so est1RM should be orm1(100, 3) = 110 — not orm1(100, 12).
    const multiSet: WorkoutSession = {
      id: "ms",
      date: "2026-05-01",
      duration: 0,
      exercises: [
        {
          id: "bench",
          name: "Bench Press",
          type: "strength",
          uid: "bench_ms",
          sets: [
            { weight: "100", reps: "3", done: true },
            { weight: "80", reps: "12", done: true },
          ],
        },
      ],
    };
    const res = analyzeEx("bench", [multiSet])!;
    expect(res.last.topW).toBe(100);
    expect(res.last.topR).toBe(3);
    expect(res.est1RM).toBe(110);
  });

  it("ties on weight break to the set with more reps", () => {
    const session: WorkoutSession = {
      id: "tie",
      date: "2026-05-01",
      duration: 0,
      exercises: [
        {
          id: "bench",
          name: "Bench Press",
          type: "strength",
          uid: "bench_tie",
          sets: [
            { weight: "80", reps: "5", done: true },
            { weight: "80", reps: "8", done: true },
          ],
        },
      ],
    };
    const res = analyzeEx("bench", [session])!;
    expect(res.last.topW).toBe(80);
    expect(res.last.topR).toBe(8);
  });

  it("ignores warmup sets when finding the top set", () => {
    // A heavy "warmup" shouldn't be treated as a working set.
    const s: WorkoutSession = {
      id: "wu", date: "2026-05-01", duration: 0,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_wu",
        sets: [
          { weight: "100", reps: "5", done: true, is_warmup: true },
          { weight: "80", reps: "8", done: true },
        ],
      }],
    };
    const res = analyzeEx("bench", [s])!;
    // Top set is the working 80kg×8, not the warmup 100kg×5.
    expect(res.last.topW).toBe(80);
    expect(res.last.topR).toBe(8);
  });

  it("skips sets with no parsable weight", () => {
    const empty: WorkoutSession = {
      id: "x",
      date: "2026-05-01",
      duration: 0,
      exercises: [
        {
          id: "bench",
          name: "Bench Press",
          type: "strength",
          uid: "bench_x",
          sets: [{ weight: "abc", reps: "8", done: false }],
        },
      ],
    };
    expect(analyzeEx("bench", [empty])).toBeNull();
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
