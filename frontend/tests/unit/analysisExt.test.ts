import { describe, it, expect } from "vitest";
import { e1rmHistory, currentStreak, volumeByGroup } from "../../src/analysis";
import type { WorkoutSession } from "../../src/types";

function session(date: string, exId: string, sets: Array<[string, string, boolean]>): WorkoutSession {
  return {
    id: `s-${date}-${exId}`,
    date,
    duration: 60_000,
    focus: "push",
    exercises: [{
      id: exId, uid: "u", name: exId, type: "strength",
      sets: sets.map(([w, r, done]) => ({ weight: w, reps: r, done })),
    }],
  };
}

describe("e1rmHistory", () => {
  it("returns one point per session, best e1RM per session", () => {
    const hist: WorkoutSession[] = [
      session("2024-02-02", "bench", [["100", "5", true], ["110", "3", true]]),
      session("2024-01-01", "bench", [["80", "8", true]]),
    ];
    const pts = e1rmHistory("bench", hist);
    expect(pts).toHaveLength(2);
    expect(pts[0].date).toBe("2024-01-01");
    expect(pts[1].date).toBe("2024-02-02");
    expect(pts[0].e1rm).toBeGreaterThan(95);
    expect(pts[1].e1rm).toBeGreaterThanOrEqual(pts[0].e1rm);
  });

  it("ignores sets without valid weight/reps", () => {
    const hist: WorkoutSession[] = [
      session("2024-01-01", "bench", [["", "5", true], ["abc", "", true]]),
    ];
    expect(e1rmHistory("bench", hist)).toEqual([]);
  });

  it("skips sessions that don't contain the exercise", () => {
    const hist: WorkoutSession[] = [
      session("2024-01-01", "squat", [["100", "5", true]]),
    ];
    expect(e1rmHistory("bench", hist)).toEqual([]);
  });
});

describe("currentStreak", () => {
  it("returns 0 when there's no history", () => {
    expect(currentStreak([])).toBe(0);
  });

  it("counts consecutive training days", () => {
    const today = new Date("2024-04-04T00:00:00");
    const hist: WorkoutSession[] = [
      session("2024-04-04", "bench", [["100", "5", true]]),
      session("2024-04-03", "bench", [["100", "5", true]]),
      session("2024-04-02", "bench", [["100", "5", true]]),
    ];
    expect(currentStreak(hist, today)).toBe(3);
  });

  it("tolerates up to 2 rest days", () => {
    const today = new Date("2024-04-10T00:00:00");
    const hist: WorkoutSession[] = [
      session("2024-04-10", "bench", [["100", "5", true]]),
      session("2024-04-07", "bench", [["100", "5", true]]),
    ];
    expect(currentStreak(hist, today)).toBe(2);
  });

  it("breaks when gap is too large", () => {
    const today = new Date("2024-04-10T00:00:00");
    const hist: WorkoutSession[] = [
      session("2024-04-10", "bench", [["100", "5", true]]),
      session("2024-03-30", "bench", [["100", "5", true]]),
    ];
    expect(currentStreak(hist, today)).toBe(1);
  });
});

describe("volumeByGroup", () => {
  it("attributes set volume to primary + 50% to secondary group", () => {
    const hist: WorkoutSession[] = [
      session(new Date().toISOString().slice(0, 10), "bench",
        [["100", "5", true]]),
    ];
    const muscleMap = { bench: { p: ["upper_pec"], s: ["tri_long"] } };
    const groupMap = { upper_pec: "chest", tri_long: "arms" };
    const v = volumeByGroup(hist, muscleMap, groupMap, 4);
    expect(v.chest).toBe(500);
    expect(v.arms).toBe(250);
  });

  it("ignores sets that are not marked done", () => {
    const hist: WorkoutSession[] = [
      session(new Date().toISOString().slice(0, 10), "bench",
        [["100", "5", false]]),
    ];
    const muscleMap = { bench: { p: ["pec"], s: [] } };
    const groupMap = { pec: "chest" };
    const v = volumeByGroup(hist, muscleMap, groupMap, 4);
    expect(v.chest ?? 0).toBe(0);
  });
});
