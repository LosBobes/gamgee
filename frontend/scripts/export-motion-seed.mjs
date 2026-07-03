// Export the bundled exercise motions to the backend's JSON seed.
//
// The canonical motion set is authored in src/data/exerciseMotions.ts (it's
// also the frontend's offline fallback). The backend seeds the same rows into
// the exercise_motions table on first boot so the admin editor starts from
// the full library. Whenever the TS file changes, regenerate the seed with:
//
//   cd frontend && node scripts/export-motion-seed.mjs
//
// Rows are written in the same shape the admin editor saves (`MotionRow`):
// stage equipment rides inside the `rig` JSONB blob, per-frame equipment
// overrides stay on the frames.

import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(here, "..");
const outPath = path.resolve(
  frontendDir, "..", "backend", "app", "data", "exercise_motions_seed.json",
);

// esbuild is a transitive dependency (via vite); resolve it through vite so
// this works under pnpm's isolated node_modules.
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("vite", { paths: [frontendDir] }))("esbuild");

const bundle = await esbuild.build({
  entryPoints: [path.join(frontendDir, "src/data/exerciseMotions.ts")],
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
  logLevel: "silent",
});

const mod = { exports: {} };
new Function("module", "exports", bundle.outputFiles[0].text)(mod, mod.exports);
const MOTIONS = mod.exports.MOTIONS;

const rows = Object.entries(MOTIONS).map(([exerciseId, m]) => {
  const baseRig = m.rig ?? { feet: "oval", arm2: "none", leg2: "none" };
  const rig = m.equipment && m.equipment.length > 0
    ? { ...baseRig, equipment: m.equipment }
    : baseRig;
  return {
    exercise_id: exerciseId,
    name: m.name,
    category: m.category ?? null,
    duration: m.duration ?? null,
    bench: !!m.bench,
    floor: !!m.floor,
    rig,
    frames: m.frames,
  };
});

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows, null, 1) + "\n");
console.log(`Wrote ${rows.length} motions to ${outPath}`);
