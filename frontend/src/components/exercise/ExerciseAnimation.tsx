import { useEffect, useRef, useState } from "react";
import StickFigure, { splinePose, splineOptPt, splineFrameEquip, lockPoseBones } from "./StickFigure";
import type { Pose, Point, RigConfig, Equipment, FrameEquipState } from "./StickFigure";

export interface Frame {
  t: number;         // 0..1 — position within a single cycle
  pose: Pose;
  bar?: Point;
  // Per-frame equipment state — keyed by Equipment.id from the motion's
  // top-level `equipment` array. Anything not in this map keeps its default
  // pos/angle/from/to from the equipment definition.
  equipment?: Record<string, FrameEquipState>;
}

export interface ExerciseAnimationProps {
  frames: Frame[];           // ascending t; the last frame should be the loop point
  duration?: number;         // total cycle ms (default 2400)
  paused?: boolean;
  bench?: boolean;
  floor?: boolean;
  rig?: RigConfig;
  equipment?: Equipment[];
  width?: number | string;
  height?: number | string;
  color?: string;
}

// Index of the segment containing `t`: the largest i in [0, len-2] whose frame
// starts at or before t. (Linear scan from the end; keyframe lists are short.)
function segmentIndex(frames: Frame[], t: number): number {
  for (let i = frames.length - 2; i >= 0; i--) {
    if (t >= frames[i].t) return i;
  }
  return 0;
}

function sample(frames: Frame[], t: number): {
  pose: Pose; bar?: Point; equipment?: Record<string, FrameEquipState>;
} {
  if (frames.length === 0) throw new Error("ExerciseAnimation: no frames");
  if (frames.length === 1) {
    return { pose: frames[0].pose, bar: frames[0].bar, equipment: frames[0].equipment };
  }

  // Catmull-Rom through the keyframe poses. `a`→`b` is the live segment;
  // `p0`/`p3` are the neighbouring control frames (clamped at the ends). No
  // per-segment easing — the spline carries velocity smoothly through the
  // interior keyframes and only reverses where the rep itself turns around,
  // and because it follows the limb's arc instead of chording across it the
  // bones no longer telescope the way straight-line interpolation made them.
  const N = frames.length;
  const i = segmentIndex(frames, t);
  const a = frames[i], b = frames[i + 1];
  const span = b.t - a.t || 1;
  const local = Math.min(1, Math.max(0, (t - a.t) / span));
  const p0 = frames[Math.max(0, i - 1)];
  const p3 = frames[Math.min(N - 1, i + 2)];

  // Bone-length lock: the spline threads each joint independently, so between
  // keyframes the limb segments drift off their authored lengths. Re-solve the
  // interior joints (elbow/knee) against the keyframe-interpolated lengths —
  // contacts (hands, feet) stay exactly on their splined paths.
  const splined = splinePose(p0.pose, a.pose, b.pose, p3.pose, local);
  return {
    pose: lockPoseBones(splined, a.pose, b.pose, local),
    bar: splineOptPt(p0.bar, a.bar, b.bar, p3.bar, local),
    equipment: splineFrameEquip(p0.equipment, a.equipment, b.equipment, p3.equipment, local),
  };
}

export default function ExerciseAnimation({
  frames,
  duration = 2400,
  paused = false,
  bench,
  floor,
  rig,
  equipment,
  width,
  height,
  color,
}: ExerciseAnimationProps) {
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (paused) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / duration;
      setT(elapsed % 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, paused]);

  const { pose, bar, equipment: frameEquip } = sample(frames, t);

  return (
    <StickFigure
      pose={pose}
      bar={bar}
      bench={bench}
      floor={floor}
      rig={rig}
      equipment={equipment}
      frameEquip={frameEquip}
      width={width}
      height={height}
      color={color}
    />
  );
}
