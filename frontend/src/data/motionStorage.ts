// LocalStorage-backed override layer for exercise motion keyframes.
//
// The editor saves edits here so the demo page and editor stay in sync
// without round-tripping through the source TS file. Use `loadMotions()`
// in place of importing MOTIONS directly to honour user edits.

import { MOTIONS, type ExerciseMotion } from "./exerciseMotions";

const STORAGE_KEY = "gamgee_motion_overrides_v1";

export type MotionOverrides = Record<string, ExerciseMotion>;

export function loadOverrides(): MotionOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOverride(id: string, motion: ExerciseMotion): void {
  const overrides = loadOverrides();
  overrides[id] = motion;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function clearOverride(id: string): void {
  const overrides = loadOverrides();
  delete overrides[id];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function clearAllOverrides(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

// Returns the motion for an id, preferring a user override over the source.
export function getMotion(id: string): ExerciseMotion | undefined {
  return loadOverrides()[id] ?? MOTIONS[id];
}

// Returns every motion id known to the system, merged baseline + overrides.
export function loadAllMotions(): Record<string, ExerciseMotion> {
  return { ...MOTIONS, ...loadOverrides() };
}

// Format a single motion as a TS literal so the user can paste it back into
// `exerciseMotions.ts` to make their edits permanent.
export function exportMotionAsTs(id: string, motion: ExerciseMotion): string {
  const fmtPt = (p: readonly [number, number]) =>
    `[${round(p[0])}, ${round(p[1])}]`;
  const fmtPose = (pose: ExerciseMotion["frames"][number]["pose"]) =>
    [
      `      head:     ${fmtPt(pose.head)},`,
      `      neck:     ${fmtPt(pose.neck)},`,
      `      shoulder: ${fmtPt(pose.shoulder)},`,
      `      elbow:    ${fmtPt(pose.elbow)},`,
      `      hand:     ${fmtPt(pose.hand)},`,
      `      hip:      ${fmtPt(pose.hip)},`,
      `      knee:     ${fmtPt(pose.knee)},`,
      `      ankle:    ${fmtPt(pose.ankle)},`,
      `      toe:      ${fmtPt(pose.toe)},`,
    ].join("\n");

  const lines: string[] = [];
  lines.push(`// ${motion.name}`);
  lines.push(`export const FRAMES_${id.toUpperCase()}: Frame[] = [`);
  for (const f of motion.frames) {
    lines.push(`  {`);
    lines.push(`    t: ${f.t},`);
    lines.push(`    pose: {`);
    lines.push(fmtPose(f.pose));
    lines.push(`    },`);
    if (f.bar) lines.push(`    bar: ${fmtPt(f.bar)},`);
    lines.push(`  },`);
  }
  lines.push(`];`);
  lines.push(``);
  lines.push(`// Index entry:`);
  const flags = [
    motion.duration != null ? `duration: ${motion.duration}` : "",
    motion.bench ? `bench: true` : "",
    motion.floor ? `floor: true` : "",
    motion.category ? `category: ${JSON.stringify(motion.category)}` : "",
  ].filter(Boolean).join(", ");
  lines.push(`// ${id}: { name: ${JSON.stringify(motion.name)}, frames: FRAMES_${id.toUpperCase()}${flags ? ", " + flags : ""} },`);
  return lines.join("\n");
}

const round = (n: number) => Math.round(n * 10) / 10;
