import { describe, expect, it } from "vitest";
import {
  lerpFrameEquip, lerpPose, catmullPt, splineOptPt, splinePose, splineFrameEquip,
} from "../../src/components/exercise/StickFigure";
import type { FrameEquipState, Point, Pose } from "../../src/components/exercise/StickFigure";

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

const closeTo = (pt: Point | undefined, [x, y]: [number, number]) => {
  expect(pt![0]).toBeCloseTo(x, 5);
  expect(pt![1]).toBeCloseTo(y, 5);
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

describe("catmullPt", () => {
  it("passes through the inner control points at the segment ends", () => {
    const p0: Point = [0, 0], p1: Point = [10, 10], p2: Point = [30, 5], p3: Point = [40, 40];
    expect(catmullPt(p0, p1, p2, p3, 0)).toEqual([10, 10]);
    expect(catmullPt(p0, p1, p2, p3, 1)).toEqual([30, 5]);
  });

  it("stays on the line for collinear, evenly-spaced control points", () => {
    const p0: Point = [0, 0], p1: Point = [10, 0], p2: Point = [20, 0], p3: Point = [30, 0];
    closeTo(catmullPt(p0, p1, p2, p3, 0.5), [15, 0]);
  });
});

describe("splineOptPt", () => {
  it("passes a single-sided point through unchanged", () => {
    expect(splineOptPt(undefined, [5, 5], undefined, undefined, 0.5)).toEqual([5, 5]);
    expect(splineOptPt(undefined, undefined, [7, 7], undefined, 0.5)).toEqual([7, 7]);
  });
});

describe("splinePose", () => {
  it("reproduces the two inner control poses exactly at t=0 and t=1", () => {
    const p1: Pose = { ...BASE_POSE, hand: [40, 70] };
    const p2: Pose = { ...BASE_POSE, hand: [60, 50] };
    const p0: Pose = { ...BASE_POSE, hand: [30, 85] };
    const p3: Pose = { ...BASE_POSE, hand: [70, 40] };
    expect(splinePose(p0, p1, p2, p3, 0).hand).toEqual([40, 70]);
    expect(splinePose(p0, p1, p2, p3, 1).hand).toEqual([60, 50]);
  });
});

describe("splineFrameEquip", () => {
  it("passes through the inner pos at the ends and lerps angle", () => {
    const e1: Record<string, FrameEquipState> = { bar1: { pos: [40, 60], angle: 0 } };
    const e2: Record<string, FrameEquipState> = { bar1: { pos: [60, 80], angle: 90 } };
    const start = splineFrameEquip(undefined, e1, e2, undefined, 0);
    const end = splineFrameEquip(undefined, e1, e2, undefined, 1);
    expect(start?.bar1.pos).toEqual([40, 60]);
    expect(end?.bar1.pos).toEqual([60, 80]);
    const mid = splineFrameEquip(undefined, e1, e2, undefined, 0.5);
    expect(mid?.bar1.angle).toBe(45);
  });
});
