import { useEffect, useRef, useState } from "react";
import StickFigure, { lerpPose, lerpPt, lerpFrameEquip } from "./StickFigure";
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

// Cosine ease-in-out — slows in/out of each keyframe for a natural rep tempo.
const ease = (t: number) => 0.5 - 0.5 * Math.cos(t * Math.PI);

function sample(frames: Frame[], t: number): {
  pose: Pose; bar?: Point; equipment?: Record<string, FrameEquipState>;
} {
  if (frames.length === 0) throw new Error("ExerciseAnimation: no frames");
  if (frames.length === 1) {
    return { pose: frames[0].pose, bar: frames[0].bar, equipment: frames[0].equipment };
  }

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i], b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const local = ease((t - a.t) / span);
      return {
        pose: lerpPose(a.pose, b.pose, local),
        bar:
          a.bar && b.bar ? lerpPt(a.bar, b.bar, local) :
          a.bar ?? b.bar,
        equipment: lerpFrameEquip(a.equipment, b.equipment, local),
      };
    }
  }
  const last = frames[frames.length - 1];
  return { pose: last.pose, bar: last.bar, equipment: last.equipment };
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
