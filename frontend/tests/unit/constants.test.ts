import { describe, expect, it } from "vitest";
import { UPPER_IDS, getActive, muscleGroups } from "../../src/constants";
import type { ExerciseDef } from "../../src/types";

describe("UPPER_IDS", () => {
  it("contains the canonical upper-body lifts", () => {
    expect(UPPER_IDS.has("bench")).toBe(true);
    expect(UPPER_IDS.has("ohp")).toBe(true);
    expect(UPPER_IDS.has("bb_curl")).toBe(true);
  });

  it("does not include lower-body lifts", () => {
    expect(UPPER_IDS.has("squat")).toBe(false);
    expect(UPPER_IDS.has("deadlift")).toBe(false);
  });
});

describe("getActive", () => {
  const bench: ExerciseDef = { id: "bench", name: "Bench Press", type: "strength" };

  it("returns an empty map for an empty list", () => {
    expect(getActive([])).toEqual({});
  });

  it("marks primary movers as primary and secondary as secondary", () => {
    const active = getActive([bench]);
    // From EM["bench"]: primary = upper/lower pec; secondary = delts/triceps
    expect(active.upper_pec).toBe("primary");
    expect(active.lower_pec).toBe("primary");
    expect(active.front_delt).toBe("secondary");
    expect(active.tricep_lat).toBe("secondary");
  });

  it("does not downgrade a primary mover already set by a previous exercise", () => {
    const pecDeck: ExerciseDef = { id: "pec_deck", name: "Pec Deck", type: "strength" };
    const active = getActive([pecDeck, bench]);
    // pec_deck marks upper_pec as primary; bench would mark it primary too.
    // front_delt is secondary in both, so it should stay secondary.
    expect(active.upper_pec).toBe("primary");
    expect(active.front_delt).toBe("secondary");
  });

  it("ignores unknown exercise ids", () => {
    const fake: ExerciseDef = { id: "made_up", name: "Made Up", type: "strength" };
    expect(getActive([fake])).toEqual({});
  });
});

describe("muscleGroups", () => {
  it("collects display groups from primary muscles only", () => {
    const groups = muscleGroups({
      upper_pec: "primary",
      front_delt: "secondary",
    });
    expect(groups.has("Chest")).toBe(true);
    // front_delt is secondary, so its group shouldn't be added by that entry.
    expect(groups.size).toBe(1);
  });

  it("returns an empty set when nothing is active", () => {
    expect(muscleGroups({}).size).toBe(0);
  });
});
