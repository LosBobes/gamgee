// Backend-backed motion store with localStorage caching.
//
// Until v1 the editor wrote edits to localStorage and the user had to paste a
// TS literal back into `exerciseMotions.ts` to make it permanent. Now motions
// live in the database (`exercise_motions` table, served by
// `/api/content/motions`). The static MOTIONS table here is kept as a
// seed/fallback so the app works before the first fetch resolves and survives
// the backend being unreachable.

import { MOTIONS, type ExerciseMotion } from "./exerciseMotions";
import { Content, ContentAdmin, motionFromRow, type AuthFetch, type MotionRow } from "./contentApi";

const CACHE_KEY = "gamgee_motion_cache_v1";

type MotionMap = Record<string, ExerciseMotion>;

let _memory: MotionMap | null = null;

function readCache(): MotionMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

function writeCache(map: MotionMap): void {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(map)); }
  catch { /* quota exceeded — non-fatal */ }
}

// Synchronous read for components rendered before the first fetch resolves.
// Preference order: in-memory → localStorage cache → bundled MOTIONS.
export function snapshotAllMotions(): MotionMap {
  return _memory ?? readCache() ?? MOTIONS;
}

export function snapshotMotion(id: string): ExerciseMotion | undefined {
  return snapshotAllMotions()[id];
}

// Fetch fresh motions from the backend. Returned map is the static MOTIONS
// table with server rows layered on top. Cached for instant next-load reads.
export async function refreshMotions(): Promise<MotionMap> {
  try {
    const rows = await Content.motions();
    const map: MotionMap = { ...MOTIONS };
    for (const row of rows) {
      map[row.exercise_id] = motionFromRow(row);
    }
    _memory = map;
    writeCache(map);
    return map;
  } catch (err) {
    console.warn("refreshMotions: API unreachable, using cache/static:", err);
    return snapshotAllMotions();
  }
}

// Persist an edited motion to the backend (admin only). Updates the local
// snapshot on success so the editor / demo see the change immediately.
export async function saveMotion(
  authFetch: AuthFetch,
  id: string,
  motion: ExerciseMotion,
): Promise<void> {
  const row: MotionRow = {
    exercise_id: id,
    name: motion.name,
    category: motion.category ?? null,
    duration: motion.duration ?? null,
    bench: !!motion.bench,
    floor: !!motion.floor,
    rig: motion.rig ?? { feet: "oval", arm2: "none", leg2: "none" },
    frames: motion.frames,
  };
  await ContentAdmin.upsertMotion(authFetch, row);
  await refreshMotions();
}

export async function deleteMotionRow(authFetch: AuthFetch, id: string): Promise<void> {
  await ContentAdmin.deleteMotion(authFetch, id);
  await refreshMotions();
}

// Wipe the local cache and force the next read to fall back to bundled
// defaults until a refresh succeeds. Server rows are untouched.
export function resetCache(): void {
  _memory = null;
  try { window.localStorage.removeItem(CACHE_KEY); }
  catch { /* empty */ }
}

// ── Editor / demo compatibility shims ───────────────────────────────────────

export function loadAllMotions(): MotionMap {
  return snapshotAllMotions();
}

export function getMotion(id: string): ExerciseMotion | undefined {
  return snapshotMotion(id);
}

// TS-literal export — useful for manual paste-back, but the editor now
// persists to the database via `saveMotion` instead.
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
  return lines.join("\n");
}

// Legacy stubs kept so existing imports compile; both routes through the
// backend now via `saveMotion` / `refreshMotions`.
export async function saveOverride(
  authFetch: AuthFetch, id: string, motion: ExerciseMotion,
): Promise<void> {
  await saveMotion(authFetch, id, motion);
}

export async function clearOverride(authFetch: AuthFetch, id: string): Promise<void> {
  await deleteMotionRow(authFetch, id);
}

export function loadOverrides(): MotionMap {
  // Anything in the current snapshot that differs from MOTIONS is treated as
  // an override for display purposes.
  const snap = snapshotAllMotions();
  const out: MotionMap = {};
  for (const [id, motion] of Object.entries(snap)) {
    if (motion !== MOTIONS[id]) out[id] = motion;
  }
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;
