import type { CSSProperties } from "react";

// Side-view stick figure renderer with optional dual-limb rigging and a
// pluggable equipment layer (barbells, benches, cables).
//
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
//
// `equipment` is a per-motion list of static equipment definitions (e.g. a
// 30-unit barbell, a 60-unit bench, a cable). Their geometry (length, width,
// plate radius, etc.) is fixed, but each frame can override their position /
// rotation via `frameEquip` (passed as a Record<EquipmentId, FrameEquipState>).

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

// ── Equipment ──────────────────────────────────────────────────────────────

export type EquipmentKind = "barbell" | "bench" | "wire";

export interface BarbellEquipment {
  id: string;
  kind: "barbell";
  length?: number;    // total bar length in viewBox units (default 30)
  plateR?: number;    // plate radius (default 5.5)
  hubR?: number;      // hub radius (default 2)
  thickness?: number; // bar thickness (default 1.6)
  pos?: Point;        // default center if a frame doesn't override
  angle?: number;     // default angle (degrees, 0 = horizontal)
  hubColor?: string;
}

export interface BenchEquipment {
  id: string;
  kind: "bench";
  width?: number;       // pad width (default 58)
  height?: number;      // pad height (default 5)
  legHeight?: number;   // length of each leg (default 17)
  legInset?: number;    // distance from each end to leg (default 4)
  pos?: Point;          // default top-left of pad (default [28, 86])
  angle?: number;       // default angle (degrees, 0 = flat)
  opacity?: number;     // visual opacity (default 0.5)
}

export interface WireEquipment {
  id: string;
  kind: "wire";
  thickness?: number; // line width (default 1.2)
  sag?: number;       // gravity-driven sag (default 2)
  dashed?: boolean;   // draw dashed (default false)
  from?: Point;       // default endpoint A
  to?: Point;         // default endpoint B (often follows the hand)
  opacity?: number;
}

export type Equipment = BarbellEquipment | BenchEquipment | WireEquipment;

export interface FrameEquipState {
  pos?: Point;
  angle?: number;
  from?: Point;
  to?: Point;
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
  equipment?: Equipment[];
  frameEquip?: Record<string, FrameEquipState>;
  // Optional onion-skin overlays — drawn behind the primary figure at low
  // opacity so the editor can show previous/next frames as ghosts.
  ghosts?: GhostLayer[];
  width?: number | string;
  height?: number | string;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

export interface GhostLayer {
  pose: Pose;
  bar?: Point;
  equipment?: Equipment[];
  frameEquip?: Record<string, FrameEquipState>;
  opacity?: number;
  color?: string;
}

export const VB_W = 100;
export const VB_H = 160;
export const HEAD_R = 7;
const STROKE = 2.8;
const MIRROR_OPACITY = 0.45;
const MIRROR_DX = 3;

export const DEFAULT_BARBELL_LENGTH = 30;
export const DEFAULT_BARBELL_PLATE_R = 5.5;
export const DEFAULT_BARBELL_HUB_R = 2;
export const DEFAULT_BARBELL_THICKNESS = 1.6;
export const DEFAULT_BENCH_POS: Point = [28, 86];
export const DEFAULT_BENCH_W = 58;
export const DEFAULT_BENCH_H = 5;
export const DEFAULT_BENCH_LEG_H = 17;
export const DEFAULT_BENCH_LEG_INSET = 4;
export const DEFAULT_WIRE_THICKNESS = 1.2;
export const DEFAULT_WIRE_SAG = 2;

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
  plateR = DEFAULT_BARBELL_PLATE_R,
  hubR = DEFAULT_BARBELL_HUB_R,
  hubColor = "var(--bg)",
  bench = false,
  floor = false,
  rig,
  equipment,
  frameEquip,
  ghosts,
  width,
  height,
  color = "currentColor",
  style,
  className,
}: StickFigureProps) {
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

      {/* Onion-skin ghosts behind the live figure. */}
      {ghosts && ghosts.map((g, i) => (
        <g key={`ghost-${i}`} opacity={g.opacity ?? 0.25}>
          <FigureBody
            pose={g.pose}
            bar={g.bar}
            plateR={plateR}
            hubR={hubR}
            hubColor={hubColor}
            bench={false}
            rig={rig}
            color={g.color ?? color}
            equipment={g.equipment}
            frameEquip={g.frameEquip}
            ghost
          />
        </g>
      ))}

      <FigureBody
        pose={pose}
        bar={bar}
        plateR={plateR}
        hubR={hubR}
        hubColor={hubColor}
        bench={bench}
        rig={rig}
        color={color}
        equipment={equipment}
        frameEquip={frameEquip}
      />
    </svg>
  );
}

// Draws everything but the outer <svg> and the floor line. Exported so the
// keyframe editor can embed the figure inside its own SVG (with handles laid
// over the top) without duplicating the body-rendering logic.
export function FigureBody({
  pose, bar, plateR, hubR, hubColor, bench, rig, color,
  equipment, frameEquip, ghost = false,
}: {
  pose: Pose;
  bar?: Point;
  plateR: number;
  hubR: number;
  hubColor: string;
  bench: boolean;
  rig?: RigConfig;
  color: string;
  equipment?: Equipment[];
  frameEquip?: Record<string, FrameEquipState>;
  ghost?: boolean;
}) {
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

  // Split equipment by kind. Benches & wires render behind the figure,
  // barbells render on top so the hands appear to grip them.
  const benches  = (equipment ?? []).filter(e => e.kind === "bench")   as BenchEquipment[];
  const wires    = (equipment ?? []).filter(e => e.kind === "wire")    as WireEquipment[];
  const barbells = (equipment ?? []).filter(e => e.kind === "barbell") as BarbellEquipment[];

  return (
    <>
      {/* Legacy bench (rendered when motion.bench === true and no bench equipment is supplied). */}
      {bench && benches.length === 0 && (
        <g opacity={0.5}>
          <rect x={28} y={86} width={58} height={5} rx={1.2} fill={color} stroke="none" />
          <line x1={32} y1={91} x2={32} y2={108} stroke={color} strokeWidth={2} strokeLinecap="round" />
          <line x1={82} y1={91} x2={82} y2={108} stroke={color} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}

      {/* Bench equipment (new system) — rendered behind the figure. */}
      {benches.map(b => (
        <BenchRender key={b.id} eq={b} state={frameEquip?.[b.id]} color={color} />
      ))}

      {/* Wires — also behind the figure. */}
      {wires.map(w => (
        <WireRender key={w.id} eq={w} state={frameEquip?.[w.id]} color={color} />
      ))}

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

      {/* Legacy single barbell — kept so older motions render unchanged. */}
      {bar && (
        <g stroke="none">
          <circle cx={bar[0]} cy={bar[1]} r={plateR} fill={color} />
          <circle cx={bar[0]} cy={bar[1]} r={hubR} fill={hubColor} />
        </g>
      )}

      {/* New-system barbells — rendered on top of the figure so hands grip them. */}
      {barbells.map(b => (
        <BarbellRender
          key={b.id} eq={b} state={frameEquip?.[b.id]}
          color={color} hubColor={hubColor} ghost={ghost}
        />
      ))}
    </>
  );
}

// ── Equipment renderers ────────────────────────────────────────────────────

function BarbellRender({
  eq, state, color, hubColor, ghost,
}: { eq: BarbellEquipment; state?: FrameEquipState; color: string; hubColor: string; ghost?: boolean }) {
  const pos    = state?.pos   ?? eq.pos   ?? [50, 60];
  const angle  = state?.angle ?? eq.angle ?? 0;
  const length = eq.length   ?? DEFAULT_BARBELL_LENGTH;
  const plateR = eq.plateR   ?? DEFAULT_BARBELL_PLATE_R;
  const hubR   = eq.hubR     ?? DEFAULT_BARBELL_HUB_R;
  const thick  = eq.thickness ?? DEFAULT_BARBELL_THICKNESS;
  const half   = length / 2;
  return (
    <g transform={`translate(${pos[0]} ${pos[1]}) rotate(${angle})`} stroke="none">
      <rect
        x={-half} y={-thick / 2} width={length} height={thick}
        rx={thick / 2}
        fill={color}
      />
      <circle cx={-half} cy={0} r={plateR} fill={color} />
      <circle cx={ half} cy={0} r={plateR} fill={color} />
      {!ghost && (
        <>
          <circle cx={-half} cy={0} r={hubR} fill={eq.hubColor ?? hubColor} />
          <circle cx={ half} cy={0} r={hubR} fill={eq.hubColor ?? hubColor} />
        </>
      )}
    </g>
  );
}

function BenchRender({
  eq, state, color,
}: { eq: BenchEquipment; state?: FrameEquipState; color: string }) {
  const pos     = state?.pos   ?? eq.pos   ?? DEFAULT_BENCH_POS;
  const angle   = state?.angle ?? eq.angle ?? 0;
  const w       = eq.width    ?? DEFAULT_BENCH_W;
  const h       = eq.height   ?? DEFAULT_BENCH_H;
  const legH    = eq.legHeight ?? DEFAULT_BENCH_LEG_H;
  const inset   = eq.legInset  ?? DEFAULT_BENCH_LEG_INSET;
  const opacity = eq.opacity   ?? 0.5;
  const padBottom = h;
  return (
    <g
      transform={`translate(${pos[0]} ${pos[1]}) rotate(${angle})`}
      opacity={opacity}
    >
      <rect x={0} y={0} width={w} height={h} rx={Math.min(1.2, h / 4)} fill={color} stroke="none" />
      <line x1={inset} y1={padBottom} x2={inset} y2={padBottom + legH}
            stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1={w - inset} y1={padBottom} x2={w - inset} y2={padBottom + legH}
            stroke={color} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function WireRender({
  eq, state, color,
}: { eq: WireEquipment; state?: FrameEquipState; color: string }) {
  const from = state?.from ?? eq.from ?? [50, 10];
  const to   = state?.to   ?? eq.to   ?? [50, 80];
  const thick = eq.thickness ?? DEFAULT_WIRE_THICKNESS;
  const sag   = eq.sag       ?? DEFAULT_WIRE_SAG;
  const opacity = eq.opacity ?? 0.85;
  // Draw as a quadratic curve sagging downward by `sag` units at the midpoint.
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2 + sag;
  return (
    <path
      d={`M ${from[0]} ${from[1]} Q ${mx} ${my} ${to[0]} ${to[1]}`}
      fill="none"
      stroke={color}
      strokeWidth={thick}
      strokeLinecap="round"
      strokeDasharray={eq.dashed ? "2 2" : undefined}
      opacity={opacity}
    />
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

// ── Smooth (Catmull-Rom) interpolation ──────────────────────────────────────
//
// The linear helpers above (paired with the old per-segment cosine ease) brake
// to a dead stop at *every* keyframe — robotic — and chord straight across the
// curved arcs a limb traces, which shortens ("telescopes") the bones mid-rep.
// The path below instead threads a Catmull-Rom curve through the keyframe poses
// so velocity stays continuous (the figure only slows where a rep naturally
// reverses), then a bone-length lock reprojects each segment to its true length
// so nothing telescopes. Keyframes are still hit exactly.

/** Uniform Catmull-Rom on a scalar. p1→p2 is the live segment; p0/p3 are the
 * neighbouring control points (clamp them to p1/p2 at the sequence ends). */
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
export const catmullPt = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point =>
  [catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)];

/** Catmull-Rom for an optional point. Needs the two inner control points; with
 * only one present it passes that through (matching the linear helper), so a
 * bar that appears mid-motion doesn't snap from undefined. */
export function splineOptPt(
  p0: Point | undefined, p1: Point | undefined, p2: Point | undefined, p3: Point | undefined, t: number,
): Point | undefined {
  if (p1 && p2) return catmullPt(p0 ?? p1, p1, p2, p3 ?? p2, t);
  return p1 ?? p2;
}

/** Catmull-Rom pose interpolation across four control poses for the p1→p2
 * segment at local t in [0,1]. Secondary limbs (arm2/leg2) are linearly blended
 * between the two inner poses — they're rare and don't need the curve. */
export function splinePose(p0: Pose, p1: Pose, p2: Pose, p3: Pose, t: number): Pose {
  const out: Pose = {
    head:     catmullPt(p0.head,     p1.head,     p2.head,     p3.head,     t),
    neck:     catmullPt(p0.neck,     p1.neck,     p2.neck,     p3.neck,     t),
    shoulder: catmullPt(p0.shoulder, p1.shoulder, p2.shoulder, p3.shoulder, t),
    elbow:    catmullPt(p0.elbow,    p1.elbow,    p2.elbow,    p3.elbow,    t),
    hand:     catmullPt(p0.hand,     p1.hand,     p2.hand,     p3.hand,     t),
    hip:      catmullPt(p0.hip,      p1.hip,      p2.hip,      p3.hip,      t),
    knee:     catmullPt(p0.knee,     p1.knee,     p2.knee,     p3.knee,     t),
    ankle:    catmullPt(p0.ankle,    p1.ankle,    p2.ankle,    p3.ankle,    t),
    toe:      catmullPt(p0.toe,      p1.toe,      p2.toe,      p3.toe,      t),
  };
  if (p1.arm2 || p2.arm2) {
    out.arm2 = {
      shoulder: lerpOpt(p1.arm2?.shoulder, p2.arm2?.shoulder, t),
      elbow:    lerpOpt(p1.arm2?.elbow,    p2.arm2?.elbow,    t),
      hand:     lerpOpt(p1.arm2?.hand,     p2.arm2?.hand,     t),
    };
  }
  if (p1.leg2 || p2.leg2) {
    out.leg2 = {
      hip:   lerpOpt(p1.leg2?.hip,   p2.leg2?.hip,   t),
      knee:  lerpOpt(p1.leg2?.knee,  p2.leg2?.knee,  t),
      ankle: lerpOpt(p1.leg2?.ankle, p2.leg2?.ankle, t),
      toe:   lerpOpt(p1.leg2?.toe,   p2.leg2?.toe,   t),
    };
  }
  return out;
}

// ── Bone-length lock ────────────────────────────────────────────────────────
//
// The spline above threads each *joint* independently, so between keyframes the
// distance elbow↔shoulder (etc.) drifts off the authored bone length — limbs
// visibly telescope mid-rep. The lock below re-solves the interior joint of
// each two-bone chain (elbow, knee) with a standard two-bone IK step: the chain
// endpoints (shoulder/hand, hip/ankle) stay exactly on their splined paths —
// they're the contact points (grips, planted feet) — while the interior joint
// is placed to honour the bone lengths interpolated from the two surrounding
// keyframes, bending toward whichever side the splined joint already favoured.
// At the keyframes themselves the interpolated lengths *are* the authored
// lengths, so the solve reproduces the authored pose exactly and only the
// in-between frames change.

const segLen = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Two-bone IK: place the mid joint of root→mid→end so |root,mid| = l1 and
 * |mid,end| = l2, bending toward `hint`. Endpoints too far apart degrade to a
 * proportionally-stretched straight chain; endpoints closer than |l1−l2|
 * (limbs folding back on themselves) put the mid joint at full bone length
 * past the endpoints so the limb visibly folds instead of collapsing. */
export function solveMidJoint(
  root: Point, end: Point, l1: number, l2: number, hint: Point,
): Point {
  const dx = end[0] - root[0], dy = end[1] - root[1];
  const d = Math.hypot(dx, dy);
  const total = l1 + l2;
  if (d < 1e-6) return hint;
  const ux = dx / d, uy = dy / d;
  if (d >= total) {
    const f = total > 0 ? l1 / total : 0.5;
    return [root[0] + dx * f, root[1] + dy * f];
  }
  if (d <= Math.abs(l1 - l2)) {
    return [root[0] + ux * l1, root[1] + uy * l1];
  }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const bx = root[0] + ux * a, by = root[1] + uy * a;
  // Perpendicular pointing toward the splined (hinted) joint.
  const side = (hint[0] - bx) * -uy + (hint[1] - by) * ux >= 0 ? 1 : -1;
  return [bx + -uy * h * side, by + ux * h * side];
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Re-fix the splined pose's bone lengths against the two inner keyframes.
 * `a`/`b` are the live segment's keyframe poses and `t` the local time. */
export function lockPoseBones(pose: Pose, a: Pose, b: Pose, t: number): Pose {
  const out: Pose = { ...pose };
  out.elbow = solveMidJoint(
    pose.shoulder, pose.hand,
    mix(segLen(a.shoulder, a.elbow), segLen(b.shoulder, b.elbow), t),
    mix(segLen(a.elbow, a.hand),     segLen(b.elbow, b.hand),     t),
    pose.elbow,
  );
  out.knee = solveMidJoint(
    pose.hip, pose.ankle,
    mix(segLen(a.hip, a.knee),   segLen(b.hip, b.knee),   t),
    mix(segLen(a.knee, a.ankle), segLen(b.knee, b.ankle), t),
    pose.knee,
  );
  const a2 = pose.arm2, aa2 = a.arm2, ba2 = b.arm2;
  if (a2?.shoulder && a2.elbow && a2.hand &&
      aa2?.shoulder && aa2.elbow && aa2.hand &&
      ba2?.shoulder && ba2.elbow && ba2.hand) {
    out.arm2 = {
      ...a2,
      elbow: solveMidJoint(
        a2.shoulder, a2.hand,
        mix(segLen(aa2.shoulder, aa2.elbow), segLen(ba2.shoulder, ba2.elbow), t),
        mix(segLen(aa2.elbow, aa2.hand),     segLen(ba2.elbow, ba2.hand),     t),
        a2.elbow,
      ),
    };
  }
  const l2 = pose.leg2, al2 = a.leg2, bl2 = b.leg2;
  if (l2?.hip && l2.knee && l2.ankle &&
      al2?.hip && al2.knee && al2.ankle &&
      bl2?.hip && bl2.knee && bl2.ankle) {
    out.leg2 = {
      ...l2,
      knee: solveMidJoint(
        l2.hip, l2.ankle,
        mix(segLen(al2.hip, al2.knee),   segLen(bl2.hip, bl2.knee),   t),
        mix(segLen(al2.knee, al2.ankle), segLen(bl2.knee, bl2.ankle), t),
        l2.knee,
      ),
    };
  }
  return out;
}

// Interpolate two per-frame equipment maps. Properties that only exist in one
// frame are passed through unchanged so a barbell that "appears" mid-motion
// doesn't silently snap from undefined.
export function lerpFrameEquip(
  a: Record<string, FrameEquipState> | undefined,
  b: Record<string, FrameEquipState> | undefined,
  t: number,
): Record<string, FrameEquipState> | undefined {
  if (!a && !b) return undefined;
  const ids = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  const out: Record<string, FrameEquipState> = {};
  for (const id of ids) {
    const sa = a?.[id];
    const sb = b?.[id];
    const merged: FrameEquipState = {};
    merged.pos   = lerpOpt(sa?.pos,   sb?.pos,   t);
    merged.from  = lerpOpt(sa?.from,  sb?.from,  t);
    merged.to    = lerpOpt(sa?.to,    sb?.to,    t);
    if (sa?.angle !== undefined && sb?.angle !== undefined) {
      merged.angle = lerp(sa.angle, sb.angle, t);
    } else {
      merged.angle = sa?.angle ?? sb?.angle;
    }
    out[id] = merged;
  }
  return out;
}

/** Catmull-Rom counterpart of {@link lerpFrameEquip}: splines pos/from/to so a
 * bar tracks the (splined) hands instead of drifting off them mid-rep; angle
 * stays linear. `e1`→`e2` is the live pair; `e0`/`e3` are the neighbours. */
export function splineFrameEquip(
  e0: Record<string, FrameEquipState> | undefined,
  e1: Record<string, FrameEquipState> | undefined,
  e2: Record<string, FrameEquipState> | undefined,
  e3: Record<string, FrameEquipState> | undefined,
  t: number,
): Record<string, FrameEquipState> | undefined {
  if (!e1 && !e2) return undefined;
  const ids = new Set([...Object.keys(e1 ?? {}), ...Object.keys(e2 ?? {})]);
  const out: Record<string, FrameEquipState> = {};
  for (const id of ids) {
    const a = e1?.[id], b = e2?.[id], pre = e0?.[id], post = e3?.[id];
    out[id] = {
      pos:   splineOptPt(pre?.pos,  a?.pos,  b?.pos,  post?.pos,  t),
      from:  splineOptPt(pre?.from, a?.from, b?.from, post?.from, t),
      to:    splineOptPt(pre?.to,   a?.to,   b?.to,   post?.to,   t),
      angle: a?.angle !== undefined && b?.angle !== undefined ? lerp(a.angle, b.angle, t) : a?.angle ?? b?.angle,
    };
  }
  return out;
}
