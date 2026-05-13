import type { CSSProperties } from "react";

// Side-view stick figure renderer with optional dual-limb rigging.
// All coordinates are in a 100 x 160 viewBox (origin top-left, +y down).
//
// A `Pose` is a flat record of 2D joint positions. The renderer connects them
// with straight segments; feet are rendered as ovals from ankle → toe.
//
// `rig` config (passed in from the motion) controls extras:
//   feet:  "oval" | "line" | "none"   — default "oval"
//   arm2:  "none" | "mirror" | "independent"  — default "none"
//   leg2:  "none" | "mirror" | "independent"  — default "none"
//
//   "mirror"      draws a second limb identical to the primary, with a small
//                 horizontal offset and reduced opacity so it reads as the
//                 "far side" of a symmetric movement (squats, bench, OHP).
//   "independent" reads the second limb's joints from `pose.arm2` / `pose.leg2`
//                 — use for asymmetric motions like a walking lunge.

export type Point = readonly [number, number];

export interface Arm2 {
  shoulder?: Point;
  elbow?:    Point;
  hand?:     Point;
}

export interface Leg2 {
  hip?:   Point;
  knee?:  Point;
  ankle?: Point;
  toe?:   Point;
}

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
  arm2?:    Arm2;
  leg2?:    Leg2;
}

export type FootStyle = "oval" | "line" | "none";
export type LimbMode  = "none" | "mirror" | "independent";

export interface RigConfig {
  feet?: FootStyle;
  arm2?: LimbMode;
  leg2?: LimbMode;
  mirrorOffset?: number;  // viewBox units the "far side" limbs offset by
}

export interface StickFigureProps {
  pose: Pose;
  bar?: Point;
  plateR?: number;
  hubR?: number;
  hubColor?: string;
  bench?: boolean;
  floor?: boolean;
  rig?: RigConfig;
  width?: number | string;
  height?: number | string;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

export const VB_W = 100;
export const VB_H = 160;
export const HEAD_R = 7;
const STROKE = 2.8;
const MIRROR_OPACITY = 0.45;
const MIRROR_DX = 3;

function poly(...pts: Point[]) {
  return pts.map(p => `${p[0]},${p[1]}`).join(" ");
}

// Render a single foot as an ellipse along the ankle → toe vector.
function Foot({ ankle, toe, color, opacity = 1 }: {
  ankle: Point; toe: Point; color: string; opacity?: number;
}) {
  const cx = (ankle[0] + toe[0]) / 2;
  const cy = (ankle[1] + toe[1]) / 2;
  const dx = toe[0] - ankle[0];
  const dy = toe[1] - ankle[1];
  const len = Math.hypot(dx, dy) || 1;
  const rx = Math.max(len / 2, 4);
  const ry = 2.4;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <ellipse
      cx={cx} cy={cy} rx={rx} ry={ry}
      transform={`rotate(${angle.toFixed(2)} ${cx} ${cy})`}
      fill={color} stroke="none" opacity={opacity}
    />
  );
}

export default function StickFigure({
  pose,
  bar,
  plateR = 5.5,
  hubR = 2,
  hubColor = "var(--bg)",
  bench = false,
  floor = false,
  rig,
  width,
  height,
  color = "currentColor",
  style,
  className,
}: StickFigureProps) {
  const feet     = rig?.feet ?? "oval";
  const arm2Mode = rig?.arm2 ?? "none";
  const leg2Mode = rig?.leg2 ?? "none";
  const dx       = rig?.mirrorOffset ?? MIRROR_DX;

  const [hx, hy] = pose.head;
  const [nx, ny] = pose.neck;

  // Trim the neck segment so it starts on the head circle.
  const ndx = nx - hx, ndy = ny - hy;
  const dist = Math.hypot(ndx, ndy) || 1;
  const neckStartX = hx + (ndx / dist) * HEAD_R;
  const neckStartY = hy + (ndy / dist) * HEAD_R;

  // Resolve the second-arm / second-leg joints.
  const arm2: { shoulder: Point; elbow: Point; hand: Point } | null = (() => {
    if (arm2Mode === "none") return null;
    if (arm2Mode === "mirror") {
      return {
        shoulder: [pose.shoulder[0] + dx, pose.shoulder[1]],
        elbow:    [pose.elbow[0]    + dx, pose.elbow[1]],
        hand:     [pose.hand[0]     + dx, pose.hand[1]],
      };
    }
    const o = pose.arm2;
    return {
      shoulder: o?.shoulder ?? pose.shoulder,
      elbow:    o?.elbow    ?? pose.elbow,
      hand:     o?.hand     ?? pose.hand,
    };
  })();

  const leg2: { hip: Point; knee: Point; ankle: Point; toe: Point } | null = (() => {
    if (leg2Mode === "none") return null;
    if (leg2Mode === "mirror") {
      return {
        hip:   [pose.hip[0]   + dx, pose.hip[1]],
        knee:  [pose.knee[0]  + dx, pose.knee[1]],
        ankle: [pose.ankle[0] + dx, pose.ankle[1]],
        toe:   [pose.toe[0]   + dx, pose.toe[1]],
      };
    }
    const o = pose.leg2;
    return {
      hip:   o?.hip   ?? pose.hip,
      knee:  o?.knee  ?? pose.knee,
      ankle: o?.ankle ?? pose.ankle,
      toe:   o?.toe   ?? pose.toe,
    };
  })();

  const farOpacity = arm2Mode === "mirror" ? MIRROR_OPACITY : 1;
  const legFarOpacity = leg2Mode === "mirror" ? MIRROR_OPACITY : 1;

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

      {/* Far-side limbs drawn first so the primary side sits on top */}
      {arm2 && (
        <g
          stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          strokeLinejoin="round" fill="none" opacity={farOpacity}
        >
          <polyline points={poly(arm2.shoulder, arm2.elbow, arm2.hand)} />
        </g>
      )}
      {leg2 && (
        <>
          <g
            stroke={color} strokeWidth={STROKE} strokeLinecap="round"
            strokeLinejoin="round" fill="none" opacity={legFarOpacity}
          >
            <polyline points={poly(leg2.hip, leg2.knee, leg2.ankle)} />
          </g>
          {feet === "oval" && (
            <Foot ankle={leg2.ankle} toe={leg2.toe} color={color} opacity={legFarOpacity} />
          )}
          {feet === "line" && (
            <line
              x1={leg2.ankle[0]} y1={leg2.ankle[1]} x2={leg2.toe[0]} y2={leg2.toe[1]}
              stroke={color} strokeWidth={STROKE} strokeLinecap="round" opacity={legFarOpacity}
            />
          )}
        </>
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
      </g>

      {/* Primary foot */}
      {feet === "oval" && <Foot ankle={pose.ankle} toe={pose.toe} color={color} />}
      {feet === "line" && (
        <line
          x1={pose.ankle[0]} y1={pose.ankle[1]} x2={pose.toe[0]} y2={pose.toe[1]}
          stroke={color} strokeWidth={STROKE} strokeLinecap="round"
        />
      )}

      {bar && (
        <g stroke="none">
          <circle cx={bar[0]} cy={bar[1]} r={plateR} fill={color} />
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

function lerpOpt(a: Point | undefined, b: Point | undefined, t: number): Point | undefined {
  if (a && b) return lerpPt(a, b, t);
  return a ?? b;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {
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
  if (a.arm2 || b.arm2) {
    out.arm2 = {
      shoulder: lerpOpt(a.arm2?.shoulder, b.arm2?.shoulder, t),
      elbow:    lerpOpt(a.arm2?.elbow,    b.arm2?.elbow,    t),
      hand:     lerpOpt(a.arm2?.hand,     b.arm2?.hand,     t),
    };
  }
  if (a.leg2 || b.leg2) {
    out.leg2 = {
      hip:   lerpOpt(a.leg2?.hip,   b.leg2?.hip,   t),
      knee:  lerpOpt(a.leg2?.knee,  b.leg2?.knee,  t),
      ankle: lerpOpt(a.leg2?.ankle, b.leg2?.ankle, t),
      toe:   lerpOpt(a.leg2?.toe,   b.leg2?.toe,   t),
    };
  }
  return out;
}
