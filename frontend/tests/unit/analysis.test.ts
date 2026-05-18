import { describe, expect, it } from "vitest";
import { analyzeEx } from "../../src/analysis";
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

  it("scales the next-weight bump by the RPE multiplier", () => {
    // Baseline: bench, 60kg×8, NEW status → 62.5kg next (step 2.5 × 1.0).
    const base = [session("2026-05-01", "60", "8")];
    expect(analyzeEx("bench", base, { speed: "moderate", lastRpe: 6 })!.nextWeight).toBe(62.5);
    // RPE 2 should DOUBLE the jump (default multiplier 2.0).
    expect(analyzeEx("bench", base, { speed: "moderate", lastRpe: 2 })!.nextWeight).toBe(65);
    // RPE 10 should pin the weight (multiplier 0).
    expect(analyzeEx("bench", base, { speed: "moderate", lastRpe: 10 })!.nextWeight).toBe(60);
  });

  it("honours per-exercise RPE overrides over the global table", () => {
    const base = [session("2026-05-01", "60", "8")];
    const res = analyzeEx("bench", base, {
      speed:    "moderate",
      lastRpe:  10,
      rpeTable: { "10": 0 },             // global says "hold"
      rpePerEx: { bench: { "10": 1 } },  // but bench-specific says "normal step"
    })!;
    expect(res.nextWeight).toBe(62.5);
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
