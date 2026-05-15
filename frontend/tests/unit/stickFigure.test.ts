import { describe, expect, it } from "vitest";
import { lerpFrameEquip, lerpPose } from "../../src/components/exercise/StickFigure";
import type { FrameEquipState, Pose } from "../../src/components/exercise/StickFigure";

const BASE_POSE: Pose = {
  head:     [50, 20],
  neck:     [50, 30],
  shoulder: [50, 35],
  elbow:    [50, 60],
  hand:     [50, 85],
  hip:      [50, 85],
  knee:     [50, 115],
  ankle:    [50, 140],
  toe:      [60, 140],
};

describe("lerpPose", () => {
  it("interpolates primary joints linearly", () => {
    const b: Pose = { ...BASE_POSE, head: [60, 20] };
    const mid = lerpPose(BASE_POSE, b, 0.5);
    expect(mid.head).toEqual([55, 20]);
    expect(mid.neck).toEqual([50, 30]); // unchanged
  });

  it("interpolates arm2 / leg2 when present on either side", () => {
    const a: Pose = { ...BASE_POSE, arm2: { shoulder: [50, 35], elbow: [50, 60], hand: [50, 85] } };
    const b: Pose = { ...BASE_POSE, arm2: { shoulder: [60, 35], elbow: [60, 60], hand: [60, 85] } };
    const mid = lerpPose(a, b, 0.25);
    expect(mid.arm2?.shoulder).toEqual([52.5, 35]);
    expect(mid.arm2?.hand).toEqual([52.5, 85]);
  });

  it("passes a one-sided arm2 through unchanged", () => {
    const a: Pose = { ...BASE_POSE, arm2: { hand: [40, 80] } };
    const b: Pose = { ...BASE_POSE };
    const mid = lerpPose(a, b, 0.5);
    expect(mid.arm2?.hand).toEqual([40, 80]);
  });
});

describe("lerpFrameEquip", () => {
  it("returns undefined when both sides have no equipment state", () => {
    expect(lerpFrameEquip(undefined, undefined, 0.5)).toBeUndefined();
  });

  it("lerps pos / from / to and angle linearly", () => {
    const a: Record<string, FrameEquipState> = { bar1: { pos: [40, 60], angle: 0 } };
    const b: Record<string, FrameEquipState> = { bar1: { pos: [60, 80], angle: 90 } };
    const mid = lerpFrameEquip(a, b, 0.5);
    expect(mid?.bar1.pos).toEqual([50, 70]);
    expect(mid?.bar1.angle).toBe(45);
  });

  it("preserves equipment that only appears on one side", () => {
    const a: Record<string, FrameEquipState> = { wire1: { from: [10, 10], to: [50, 50] } };
    const mid = lerpFrameEquip(a, undefined, 0.5);
    expect(mid?.wire1.from).toEqual([10, 10]);
    expect(mid?.wire1.to).toEqual([50, 50]);
  });

  it("merges disjoint equipment ids from both sides", () => {
    const a: Record<string, FrameEquipState> = { bar1: { pos: [10, 10] } };
    const b: Record<string, FrameEquipState> = { wire1: { from: [0, 0], to: [100, 100] } };
    const mid = lerpFrameEquip(a, b, 0.5);
    expect(Object.keys(mid ?? {}).sort()).toEqual(["bar1", "wire1"]);
    expect(mid?.bar1.pos).toEqual([10, 10]);
    expect(mid?.wire1.to).toEqual([100, 100]);
  });
});
