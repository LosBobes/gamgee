import type { CSSProperties } from "react";

// Simple side-view stick figure renderer.
// All coordinates are in a 100 x 160 viewBox (origin top-left, +y down).
// A Pose is a flat record of 2D joint positions — the renderer just connects
// them with straight segments, so any new exercise is defined by writing a
// pair of poses and (optionally) interpolating between them.

export type Point = readonly [number, number];

export interface Pose {
  head:     Point;
  neck:     Point;
  shoulder: Point;
  elbow:    Point;
  hand:     Point;
  hip:      Point;
  knee:     Point;
  ankle:    Point;
  toe:      Point;
}

export interface StickFigureProps {
  pose: Pose;
  bar?: Point;          // weight-plate end — rendered as two concentric filled circles
  plateR?: number;      // outer plate radius (viewBox units)
  hubR?: number;        // inner bar-hub radius (viewBox units)
  hubColor?: string;    // inner-circle fill; defaults to var(--bg) for a "hole-in-plate" look
  bench?: boolean;      // render a horizontal bench under a lying body
  floor?: boolean;      // render a dashed floor line at the bottom
  barLine?: number;     // y-coord of a fixed horizontal bar across the frame (pull-up rig, etc.)
  width?: number | string;
  height?: number | string;
  color?: string;       // override stroke colour; defaults to currentColor
  style?: CSSProperties;
  className?: string;
}

export const VB_W = 100;
export const VB_H = 160;
export const HEAD_R = 7;
const STROKE = 2.8;

export default function StickFigure({
  pose,
  bar,
  plateR = 5.5,
  hubR = 2,
  hubColor = "var(--bg)",
  bench = false,
  floor = false,
  barLine,
  width,
  height,
  color = "currentColor",
  style,
  className,
}: StickFigureProps) {
  const [hx, hy] = pose.head;
  const [nx, ny] = pose.neck;

  // Trim the neck segment so it starts on the head circle instead of inside it.
  const dx = nx - hx, dy = ny - hy;
  const dist = Math.hypot(dx, dy) || 1;
  const neckStartX = hx + (dx / dist) * HEAD_R;
  const neckStartY = hy + (dy / dist) * HEAD_R;

  const poly = (...pts: Point[]) => pts.map(p => `${p[0]},${p[1]}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={width}
      height={height}
      className={className}
      style={style}
      preserveAspectRatio="xMidYMid meet"
    >
      {floor && (
        <line
          x1={4} y1={VB_H - 4} x2={VB_W - 4} y2={VB_H - 4}
          stroke={color} strokeWidth={1.2} strokeDasharray="2 4" opacity={0.4}
        />
      )}

      {bench && (
        <g opacity={0.5}>
          <rect x={28} y={86} width={58} height={5} rx={1.2} fill={color} stroke="none" />
          <line x1={32} y1={91} x2={32} y2={108} stroke={color} strokeWidth={2} strokeLinecap="round" />
          <line x1={82} y1={91} x2={82} y2={108} stroke={color} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}

      {barLine !== undefined && (
        <line
          x1={2} y1={barLine} x2={VB_W - 2} y2={barLine}
          stroke={color} strokeWidth={3.4} strokeLinecap="round" opacity={0.85}
        />
      )}

      <g
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Head */}
        <circle cx={hx} cy={hy} r={HEAD_R} fill={color} stroke="none" />

        {/* Neck stub from the head circle to the neck joint */}
        <line x1={neckStartX} y1={neckStartY} x2={nx} y2={ny} />

        {/* Spine: neck → shoulder → hip */}
        <polyline points={poly(pose.neck, pose.shoulder, pose.hip)} />

        {/* Arm: shoulder → elbow → hand */}
        <polyline points={poly(pose.shoulder, pose.elbow, pose.hand)} />

        {/* Leg: hip → knee → ankle */}
        <polyline points={poly(pose.hip, pose.knee, pose.ankle)} />

        {/* Foot: ankle → toe */}
        <line x1={pose.ankle[0]} y1={pose.ankle[1]} x2={pose.toe[0]} y2={pose.toe[1]} />

      </g>

      {bar && (
        <g stroke="none">
          {/* Outer plate (side-on view of a weight disc) */}
          <circle cx={bar[0]} cy={bar[1]} r={plateR} fill={color} />
          {/* Inner hub — bar end visible through the plate's centre hole */}
          <circle cx={bar[0]} cy={bar[1]} r={hubR} fill={hubColor} />
        </g>
      )}
    </svg>
  );
}

// ── Pose helpers ────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Point, b: Point, t: number): Point =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    head:     lerpPt(a.head,     b.head,     t),
    neck:     lerpPt(a.neck,     b.neck,     t),
    shoulder: lerpPt(a.shoulder, b.shoulder, t),
    elbow:    lerpPt(a.elbow,    b.elbow,    t),
    hand:     lerpPt(a.hand,     b.hand,     t),
    hip:      lerpPt(a.hip,      b.hip,      t),
    knee:     lerpPt(a.knee,     b.knee,     t),
    ankle:    lerpPt(a.ankle,    b.ankle,    t),
    toe:      lerpPt(a.toe,      b.toe,      t),
  };
}
