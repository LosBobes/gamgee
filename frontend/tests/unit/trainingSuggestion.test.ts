import { describe, expect, it } from "vitest";
import { buildSuggestion, haversineMeters } from "../../src/trainingSuggestion";
import type { GymPrefs, WorkoutSession, WeeklyPlan } from "../../src/types";

// Jan 5 2026 is a Monday; use it as a stable "now" so weekday math is
// deterministic regardless of when the suite runs.
const MONDAY_6PM = new Date(2026, 0, 5, 18, 0, 0);

function session(date: Date, focus: string): WorkoutSession {
  return { id: `${date.getTime()}`, date: date.toISOString(), duration: 3_600_000, focus, exercises: [] };
}

const gymAt = (lat: number, lng: number, extra: Partial<GymPrefs> = {}): GymPrefs => ({
  name: "Iron Temple", latitude: lat, longitude: lng, radiusM: 200, remindersEnabled: true, ...extra,
});

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters(48, 16, 48, 16)).toBe(0);
  });
  it("approximates a short real-world distance", () => {
    // ~0.001° of latitude ≈ 111 m
    const d = haversineMeters(48.0, 16.0, 48.001, 16.0);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe("buildSuggestion — time of week", () => {
  it("fires when the user usually trains this weekday around now", () => {
    const history = [
      session(new Date(2025, 11, 29, 18, 0), "push"), // prior Monday 6pm
      session(new Date(2025, 11, 22, 18, 30), "push"), // prior Monday 6:30pm
    ];
    const s = buildSuggestion({ history, weeklyPlan: null, gym: null, coords: null, now: MONDAY_6PM });
    expect(s).not.toBeNull();
    expect(s!.reason).toBe("time");
    expect(s!.focus).toBe("push");
  });

  it("does not fire off-hours when history is at a different time", () => {
    const history = [
      session(new Date(2025, 11, 29, 7, 0), "push"), // Mondays at 7am
      session(new Date(2025, 11, 22, 7, 0), "push"),
    ];
    const s = buildSuggestion({ history, weeklyPlan: null, gym: null, coords: null, now: MONDAY_6PM });
    expect(s).toBeNull();
  });

  it("requires at least two prior sessions on the weekday", () => {
    const history = [session(new Date(2025, 11, 29, 18, 0), "push")];
    const s = buildSuggestion({ history, weeklyPlan: null, gym: null, coords: null, now: MONDAY_6PM });
    expect(s).toBeNull();
  });

  it("prefers the weekly-plan focus and returns its day plan", () => {
    const history = [
      session(new Date(2025, 11, 29, 18, 0), "push"),
      session(new Date(2025, 11, 22, 18, 0), "push"),
    ];
    const weeklyPlan: WeeklyPlan = {
      mon: { focus: "legs", exerciseIds: ["squat"], enabled: true },
    };
    const s = buildSuggestion({ history, weeklyPlan, gym: null, coords: null, now: MONDAY_6PM });
    expect(s).not.toBeNull();
    expect(s!.focus).toBe("legs");
    expect(s!.dayPlan).not.toBeNull();
    expect(s!.dayPlan!.exerciseIds).toEqual(["squat"]);
  });
});

describe("buildSuggestion — location", () => {
  it("fires when the device is within the gym radius", () => {
    const s = buildSuggestion({
      history: [], weeklyPlan: null,
      gym: gymAt(48.0, 16.0),
      coords: { latitude: 48.0001, longitude: 16.0001 },
      now: MONDAY_6PM,
    });
    expect(s).not.toBeNull();
    expect(s!.reason).toBe("location");
    expect(s!.distanceM).toBeLessThan(200);
  });

  it("does not fire when the device is outside the radius", () => {
    const s = buildSuggestion({
      history: [], weeklyPlan: null,
      gym: gymAt(48.0, 16.0),
      coords: { latitude: 48.5, longitude: 16.5 },
      now: MONDAY_6PM,
    });
    expect(s).toBeNull();
  });

  it("reports reason 'both' when location and time both fire", () => {
    const history = [
      session(new Date(2025, 11, 29, 18, 0), "push"),
      session(new Date(2025, 11, 22, 18, 0), "push"),
    ];
    const s = buildSuggestion({
      history, weeklyPlan: null,
      gym: gymAt(48.0, 16.0),
      coords: { latitude: 48.0, longitude: 16.0 },
      now: MONDAY_6PM,
    });
    expect(s!.reason).toBe("both");
  });
});

describe("buildSuggestion — guards", () => {
  it("returns null when the user already trained today", () => {
    const history = [
      session(new Date(2025, 11, 29, 18, 0), "push"),
      session(new Date(2025, 11, 22, 18, 0), "push"),
      session(new Date(2026, 0, 5, 9, 0), "push"), // earlier today
    ];
    const s = buildSuggestion({
      history, weeklyPlan: null,
      gym: gymAt(48.0, 16.0),
      coords: { latitude: 48.0, longitude: 16.0 },
      now: MONDAY_6PM,
    });
    expect(s).toBeNull();
  });

  it("returns null when reminders are disabled", () => {
    const s = buildSuggestion({
      history: [], weeklyPlan: null,
      gym: gymAt(48.0, 16.0, { remindersEnabled: false }),
      coords: { latitude: 48.0, longitude: 16.0 },
      now: MONDAY_6PM,
    });
    expect(s).toBeNull();
  });

  it("returns null when no signal fires", () => {
    const s = buildSuggestion({ history: [], weeklyPlan: null, gym: null, coords: null, now: MONDAY_6PM });
    expect(s).toBeNull();
  });
});
