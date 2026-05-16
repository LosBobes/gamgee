import { describe, it, expect } from "vitest";
import { defaultPlates, defaultBarWeight, loadout, summarize } from "../../src/plate";

describe("plate calculator", () => {
  it("returns bar-only when target equals bar weight", () => {
    const r = loadout(20, 20, defaultPlates("kg"));
    expect(r.perSide).toEqual([]);
    expect(r.used).toBe(20);
  });

  it("loads standard 100kg as 25 + 15 per side", () => {
    const r = loadout(100, 20, defaultPlates("kg"));
    expect(r.used).toBe(100);
    expect(r.remaining).toBeLessThan(1);
    expect(r.perSide.reduce((a, b) => a + b, 0)).toBe(40);
  });

  it("loads 225 lb as 90/side: 45+25+20", () => {
    const r = loadout(225, defaultBarWeight("lb"), defaultPlates("lb"));
    expect(r.used).toBe(225);
    expect(r.perSide.reduce((a, b) => a + b, 0)).toBe(90);
  });

  it("returns 'Bar only' summary when empty", () => {
    const r = loadout(20, 20, defaultPlates("kg"));
    expect(summarize(r)).toBe("Bar only");
  });

  it("collapses duplicate plates in summary", () => {
    const r = loadout(140, 20, defaultPlates("kg"));
    const s = summarize(r);
    expect(s).toContain("/ side");
  });

  it("doesn't overshoot the target", () => {
    const r = loadout(101.3, 20, defaultPlates("kg"));
    expect(r.used).toBeLessThanOrEqual(101.3);
  });
});
