import { describe, expect, it } from "vitest";
import { fmtClock, fmtDur, orm1, e1rmWithRir, rpeToRir, rirToRpe } from "../../src/utils";

describe("fmtClock", () => {
  it("formats sub-hour durations as mm:ss", () => {
    expect(fmtClock(0)).toBe("00:00");
    expect(fmtClock(5_000)).toBe("00:05");
    expect(fmtClock(65_000)).toBe("01:05");
    expect(fmtClock(59 * 60_000 + 59_000)).toBe("59:59");
  });

  it("switches to hh:mm:ss once it crosses one hour", () => {
    expect(fmtClock(60 * 60_000)).toBe("01:00:00");
    expect(fmtClock(2 * 60 * 60_000 + 5 * 60_000 + 9_000)).toBe("02:05:09");
  });
});

describe("fmtDur", () => {
  it("returns minutes for sub-hour durations", () => {
    expect(fmtDur(0)).toBe("0m");
    expect(fmtDur(30 * 60_000)).toBe("30m");
    expect(fmtDur(59 * 60_000)).toBe("59m");
  });

  it("returns hours+minutes once it crosses one hour", () => {
    expect(fmtDur(60 * 60_000)).toBe("1h 0m");
    expect(fmtDur(75 * 60_000)).toBe("1h 15m");
    expect(fmtDur(2 * 60 * 60_000 + 30 * 60_000)).toBe("2h 30m");
  });
});

describe("orm1 (Epley 1RM)", () => {
  it("returns the lifted weight at 1 rep", () => {
    expect(orm1(100, 1)).toBe(100);
  });

  it("rounds Epley to the nearest integer", () => {
    // 100 * (1 + 5/30) = 116.66...
    expect(orm1(100, 5)).toBe(117);
    // 80 * (1 + 8/30) = 101.33...
    expect(orm1(80, 8)).toBe(101);
  });
});

describe("e1rmWithRir", () => {
  it("collapses to plain Epley when nothing is left in the tank (rir 0)", () => {
    expect(e1rmWithRir(100, 5, 0)).toBe(orm1(100, 5));
    expect(e1rmWithRir(80, 8, 0)).toBe(orm1(80, 8));
  });

  it("estimates a higher 1RM when reps were left in reserve", () => {
    // 5 reps with 3 in the tank ≈ an 8-rep max → a higher estimate than a
    // 5-rep grind at the same load.
    expect(e1rmWithRir(100, 5, 3)).toBeGreaterThan(e1rmWithRir(100, 5, 0));
    expect(e1rmWithRir(100, 5, 3)).toBe(orm1(100, 8));
  });
});

describe("RIR ↔ RPE conversion", () => {
  it("maps RIR to its RPE complement and back", () => {
    expect(rirToRpe(0)).toBe(10); // to failure
    expect(rirToRpe(2)).toBe(8);
    expect(rirToRpe(4)).toBe(6);
    expect(rpeToRir(10)).toBe(0);
    expect(rpeToRir(8)).toBe(2);
    expect(rpeToRir(6)).toBe(4);
  });

  it("returns null RIR for an unrated set", () => {
    expect(rpeToRir(null)).toBeNull();
    expect(rpeToRir(undefined)).toBeNull();
  });
});
