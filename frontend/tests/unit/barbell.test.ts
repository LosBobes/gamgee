import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Vitest runs under the "node" environment for this project — no DOM, no
// localStorage. Install a tiny in-memory shim before importing the module
// under test so its `localStorage.getItem` calls resolve.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return store.size; },
  clear:   () => store.clear(),
  getItem: (k: string) => store.get(k) ?? null,
  key:     (i: number) => Array.from(store.keys())[i] ?? null,
  removeItem: (k: string) => { store.delete(k); },
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
};

import {
  BAR_WEIGHT_KG,
  COUNTS_BAR_KEY,
  isBarbellExercise,
  readCountsBar,
  writeCountsBar,
} from "../../src/data/barbell";

describe("isBarbellExercise", () => {
  it("recognises classic straight-bar lifts", () => {
    expect(isBarbellExercise("bench")).toBe(true);
    expect(isBarbellExercise("squat")).toBe(true);
    expect(isBarbellExercise("dead")).toBe(true);
    expect(isBarbellExercise("ohp")).toBe(true);
    expect(isBarbellExercise("bb_row")).toBe(true);
  });

  it("excludes machines, dumbbells, cables, and specialty bars", () => {
    expect(isBarbellExercise("smith_bench")).toBe(false);
    expect(isBarbellExercise("trap_bar_dl")).toBe(false);
    expect(isBarbellExercise("safety_sq")).toBe(false);
    expect(isBarbellExercise("landmine_press")).toBe(false);
    expect(isBarbellExercise("db_press")).toBe(false);
    expect(isBarbellExercise("cable_row")).toBe(false);
    expect(isBarbellExercise("leg_press")).toBe(false);
  });

  it("returns false for unknown ids", () => {
    expect(isBarbellExercise("")).toBe(false);
    expect(isBarbellExercise("nope_made_up")).toBe(false);
  });

  it("uses the standard Olympic bar weight", () => {
    expect(BAR_WEIGHT_KG).toBe(20);
  });
});

describe("counts-bar preference", () => {
  beforeEach(() => { localStorage.removeItem(COUNTS_BAR_KEY); });
  afterEach(()  => { localStorage.removeItem(COUNTS_BAR_KEY); });

  it("returns null when nothing is stored", () => {
    expect(readCountsBar()).toBeNull();
  });

  it("round-trips yes/no/off", () => {
    writeCountsBar("yes"); expect(readCountsBar()).toBe("yes");
    writeCountsBar("no");  expect(readCountsBar()).toBe("no");
    writeCountsBar("off"); expect(readCountsBar()).toBe("off");
  });

  it("ignores garbage values left in localStorage", () => {
    localStorage.setItem(COUNTS_BAR_KEY, "maybe");
    expect(readCountsBar()).toBeNull();
  });
});
