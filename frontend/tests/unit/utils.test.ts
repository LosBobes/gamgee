import { describe, expect, it } from "vitest";
import { fmtClock, fmtDur, orm1 } from "../../src/utils";

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
