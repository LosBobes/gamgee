import { describe, expect, it } from "vitest";
import { MOTIONS } from "../../src/data/exerciseMotions";
import { solveMidJoint, lockPoseBones } from "../../src/components/exercise/StickFigure";
import type { Point, Pose } from "../../src/components/exercise/StickFigure";

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Bones measured on every keyframe of every motion. Within a single motion a
// bone should keep a roughly constant length — big swings read as the limb
// telescoping mid-rep. A few motions legitimately vary a bone's on-screen
// length (spinal flexion, a squeezing fist, a body folding from vertical to
// horizontal mid-burpee), so they carry explicit exemptions.
const BONES: Array<[string, (p: Pose) => number]> = [
  ["torso",   p => dist(p.shoulder, p.hip)],
  ["thigh",   p => dist(p.hip, p.knee)],
  ["shin",    p => dist(p.knee, p.ankle)],
  ["uparm",   p => dist(p.shoulder, p.elbow)],
  ["forearm", p => dist(p.elbow, p.hand)],
];

// motion id -> bones allowed to vary beyond the threshold, with a reason.
const SPREAD_EXEMPT: Record<string, string[]> = {
  captains:     ["forearm"],          // the "squeeze" is drawn as the fist closing
  cable_crunch: ["torso"],            // spinal flexion shortens the chord
  hiit:         ["torso"],            // stand → horizontal plank transition
  burpees:      ["torso"],
  cuban_press:  ["uparm", "forearm"], // hang-length arms → compressed overhead arms
  fl_raise:     ["torso"],            // hang → horizontal lever convention change
  ice_cream_maker: ["torso"],
  skin_cat:     ["torso"],
  pallof:       ["forearm"],          // folded-at-chest → pressed-out
  bird_dog:     ["thigh"],            // kneeling → extended level behind
  pike_pushup:  ["torso"],            // pike fold
  bicycle:      ["thigh"],            // tucked knee vs extended leg
};

// Motions whose bones may vary up to this much across keyframes. Everything
// intentional (overhead-arm foreshortening, tucks) sits under it; genuine
// telescoping bugs historically sat far above it.
const MAX_SPREAD = 0.5;
// No bone should ever collapse to nearly nothing.
const MIN_BONE = 5;

describe("MOTIONS data integrity", () => {
  const entries = Object.entries(MOTIONS);

  it("covers a healthy number of exercises", () => {
    expect(entries.length).toBeGreaterThan(200);
  });

  it.each(entries.map(([id, m]) => [id, m] as const))(
    "%s has well-formed, loopable frames",
    (_id, motion) => {
      const frames = motion.frames;
      expect(frames.length).toBeGreaterThanOrEqual(2);
      expect(frames[0].t).toBe(0);
      expect(frames[frames.length - 1].t).toBe(1);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i].t).toBeGreaterThan(frames[i - 1].t);
      }
      // Seamless loop: first and last keyframes share the pose.
      expect(frames[frames.length - 1].pose).toEqual(frames[0].pose);
    },
  );

  it.each(entries.map(([id, m]) => [id, m] as const))(
    "%s keeps bone lengths consistent across keyframes",
    (id, motion) => {
      const exempt = SPREAD_EXEMPT[id] ?? [];
      for (const [bone, measure] of BONES) {
        const lens = motion.frames.map(f => measure(f.pose));
        const min = Math.min(...lens);
        const max = Math.max(...lens);
        expect(min, `${id} ${bone} collapses to ${min.toFixed(1)}`).toBeGreaterThanOrEqual(MIN_BONE);
        if (exempt.includes(bone)) continue;
        const spread = (max - min) / min;
        expect(
          spread,
          `${id} ${bone} telescopes: ${min.toFixed(1)} → ${max.toFixed(1)}`,
        ).toBeLessThanOrEqual(MAX_SPREAD);
      }
    },
  );

  it.each(entries.map(([id, m]) => [id, m] as const))(
    "%s frame equipment overrides reference declared equipment",
    (_id, motion) => {
      const declared = new Set((motion.equipment ?? []).map(e => e.id));
      for (const frame of motion.frames) {
        for (const eqId of Object.keys(frame.equipment ?? {})) {
          expect(declared.has(eqId), `override for undeclared equipment "${eqId}"`).toBe(true);
        }
      }
    },
  );

  it("bakes barbell tracking (bar rides the hands, no double-rendered dot)", () => {
    const bench = MOTIONS.bench;
    const bottom = bench.frames[1];
    expect(bottom.bar).toBeUndefined();          // legacy dot dropped
    expect(bottom.equipment?.bar1?.pos).toEqual([62, 78]);
  });

  it("bakes cable tracking to the holding joint", () => {
    const pushdown = MOTIONS.tri_push.frames[2];
    expect(pushdown.equipment?.cable?.to).toEqual(pushdown.pose.hand);
    const kickback = MOTIONS.glute_kickback.frames[1];
    expect(kickback.equipment?.cable?.to).toEqual(kickback.pose.ankle);
  });

  it("keeps static rigs (flag pole, wide grip bars) unbaked", () => {
    for (const frame of MOTIONS.human_flag.frames) {
      expect(frame.equipment?.pole).toBeUndefined();
    }
    for (const frame of MOTIONS.archer_pullup.frames) {
      expect(frame.equipment?.gbar).toBeUndefined();
    }
  });

  it("draws both legs on asymmetric-rig motions that split the legs", () => {
    for (const id of ["lunges", "run", "walking_lunge", "shrimp_squat", "single_rdl"]) {
      const motion = MOTIONS[id];
      expect(
        motion.frames.some(f => f.pose.leg2),
        `${id} uses an independent second leg but never defines leg2`,
      ).toBe(true);
    }
  });
});

describe("solveMidJoint (two-bone IK)", () => {
  it("reproduces a consistent authored joint exactly", () => {
    // shoulder [0,0], elbow [3,4] (l1=5), hand [6,8] (l2=5)
    const mid = solveMidJoint([0, 0], [6, 8], 5, 5, [3, 4]);
    expect(mid[0]).toBeCloseTo(3, 5);
    expect(mid[1]).toBeCloseTo(4, 5);
  });

  it("bends toward the hinted side", () => {
    const up = solveMidJoint([0, 0], [20, 0], 15, 15, [10, -5]);
    const down = solveMidJoint([0, 0], [20, 0], 15, 15, [10, 5]);
    expect(up[1]).toBeLessThan(0);
    expect(down[1]).toBeGreaterThan(0);
    expect(Math.hypot(up[0], up[1])).toBeCloseTo(15, 5);
  });

  it("degrades to a proportional straight chain when out of reach", () => {
    const mid = solveMidJoint([0, 0], [40, 0], 10, 10, [20, 5]);
    expect(mid).toEqual([20, 0]);
  });
});

describe("lockPoseBones", () => {
  const pose = (over: Partial<Pose>): Pose => ({
    head: [50, 20], neck: [50, 30], shoulder: [50, 35],
    elbow: [50, 60], hand: [50, 85],
    hip: [50, 85], knee: [50, 115], ankle: [50, 140], toe: [60, 140],
    ...over,
  });

  it("restores the authored bone length on a telescoped interior joint", () => {
    const a = pose({});
    const b = pose({ hand: [75, 60], elbow: [50, 60] });
    // A splined sample whose elbow drifted: forearm/uparm off-length.
    const drifted = pose({ elbow: [52, 66], hand: [63, 73] });
    const locked = lockPoseBones(drifted, a, b, 0.5);
    const uparm = Math.hypot(locked.elbow[0] - 50, locked.elbow[1] - 35);
    expect(uparm).toBeCloseTo(25, 1);   // both keyframes have uparm 25
    // Contacts unchanged:
    expect(locked.hand).toEqual(drifted.hand);
    expect(locked.shoulder).toEqual(drifted.shoulder);
  });

  it("passes keyframes through exactly at t=0", () => {
    const a = pose({});
    const b = pose({ hand: [75, 60] });
    const locked = lockPoseBones(a, a, b, 0);
    expect(locked.elbow[0]).toBeCloseTo(a.elbow[0], 5);
    expect(locked.elbow[1]).toBeCloseTo(a.elbow[1], 5);
    expect(locked.knee[0]).toBeCloseTo(a.knee[0], 5);
  });
});
