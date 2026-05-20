import { describe, expect, it } from "vitest";
import { analyzeEx, DEFAULT_RPE_STEP_MULTIPLIERS, prescribeExercise, weightForRpe } from "../../src/analysis";
import type { WorkoutSession } from "../../src/types";

const session = (date: string, weight: string, reps: string, rpe?: number | null): WorkoutSession => ({
  id: date,
  date,
  duration: 0,
  rpe: rpe ?? null,
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

  it("scales the next-session step by the last session's RPE multiplier", () => {
    // Two sessions where the user GAINED weight — analyzer flags PROGRESSING
    // and recommends adding `step` kg. With session RPE 3 ("easy day") the
    // multiplier 1.35× bumps the 2.5kg base step to ~3.375kg.
    const easy = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 3), session("2026-05-01", "60", "8")),
    )!;
    // 2.5 * 1.35 = 3.375 added on top of 62.5 → 65.875
    expect(easy.nextWeight).toBeCloseTo(62.5 + 2.5 * DEFAULT_RPE_STEP_MULTIPLIERS[3], 4);

    // RPE 9 ("brutal") shrinks the step to ~0.4×, so the jump is barely 1kg.
    const brutal = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 9), session("2026-05-01", "60", "8")),
    )!;
    expect(brutal.nextWeight).toBeCloseTo(62.5 + 2.5 * DEFAULT_RPE_STEP_MULTIPLIERS[9], 4);
    expect(brutal.nextWeight).toBeLessThan(easy.nextWeight);
  });

  it("at RPE 10 holds the weight (step multiplier is 0)", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 10), session("2026-05-01", "60", "8")),
    )!;
    expect(res.nextWeight).toBe(62.5);
  });

  it("ignores RPE on older sessions — only the most recent one drives the step", () => {
    // Latest session rated 9 (brutal), the one before was rated 3 — the
    // analyzer should use the 9 because that's the post-session state we
    // care about for next-session progression.
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 9), session("2026-05-01", "60", "8", 3)),
    )!;
    expect(res.nextWeight).toBeCloseTo(62.5 + 2.5 * DEFAULT_RPE_STEP_MULTIPLIERS[9], 4);
  });

  it("honours a per-exercise multiplier override over the default table", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 9), session("2026-05-01", "60", "8")),
      {
        speed: "moderate",
        rpeMultipliersByExercise: { bench: { "9": 2.0 } },
      },
    )!;
    // 2.5 * 2.0 = 5kg bump on top of 62.5
    expect(res.nextWeight).toBe(67.5);
  });

  it("honours a user-level multiplier override (no per-exercise entry)", () => {
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 9), session("2026-05-01", "60", "8")),
      {
        speed: "moderate",
        rpeMultipliers: { "9": 0.0 },
      },
    )!;
    // User said RPE 9 = hold the line.
    expect(res.nextWeight).toBe(62.5);
  });

  it("leaves NEW sessions unaffected when no RPE was set", () => {
    // Sanity: existing behavior preserved when the session has rpe == null.
    const res = analyzeEx("bench", [session("2026-05-01", "60", "8")])!;
    expect(res.nextWeight).toBe(62.5);
  });

  it("prefers per-set RPE over the post-session overall RPE", () => {
    // Last session: 62.5x8 with two working sets rated RPE 9 and RPE 8, but
    // the overall session RPE is "easy" (3). The per-set max (9) should win.
    const last: WorkoutSession = {
      id: "ps", date: "2026-05-03", duration: 0, rpe: 3,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_ps",
        sets: [
          { weight: "62.5", reps: "8", done: true, rpe: 8 },
          { weight: "62.5", reps: "8", done: true, rpe: 9 },
        ],
      }],
    };
    const res = analyzeEx("bench", [last, session("2026-05-01", "60", "8")])!;
    // Per-set max RPE is 9, multiplier 0.4 → step 1.0 → next 63.5.
    expect(res.nextWeight).toBeCloseTo(62.5 + 2.5 * DEFAULT_RPE_STEP_MULTIPLIERS[9], 4);
  });

  it("ignores per-set RPE on warmup sets", () => {
    // A warmup set with a high RPE shouldn't be considered — only working
    // sets count toward the exercise's effective RPE.
    const last: WorkoutSession = {
      id: "wuRpe", date: "2026-05-03", duration: 0,
      exercises: [{
        id: "bench", name: "Bench Press", type: "strength", uid: "bench_wuRpe",
        sets: [
          { weight: "30", reps: "5", done: true, is_warmup: true, rpe: 10 },
          { weight: "62.5", reps: "8", done: true, rpe: 5 },
        ],
      }],
    };
    const res = analyzeEx("bench", [last, session("2026-05-01", "60", "8")])!;
    // Per-set max across working sets is 5, not 10. Multiplier 1.1.
    expect(res.nextWeight).toBeCloseTo(62.5 + 2.5 * DEFAULT_RPE_STEP_MULTIPLIERS[5], 4);
  });

  it("falls back to session RPE when no working set carries a per-set RPE", () => {
    // Working sets exist but none are rated — the session-level rpe drives it.
    const res = analyzeEx(
      "bench",
      history(session("2026-05-03", "62.5", "8", 9), session("2026-05-01", "60", "8")),
    )!;
    expect(res.nextWeight).toBeCloseTo(62.5 + 2.5 * DEFAULT_RPE_STEP_MULTIPLIERS[9], 4);
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
