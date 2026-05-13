import { useEffect, useMemo, useState } from "react";
import { Pause, Pencil, Play, RotateCcw } from "lucide-react";
import ExerciseAnimation from "./ExerciseAnimation";
import type { ExerciseMotion } from "../../data/exerciseMotions";
import { EXERCISE_INFO } from "../../data/exerciseInfo";
import {
  resetCache,
  loadAllMotions,
  loadOverrides,
  refreshMotions,
} from "../../data/motionStorage";

// Standalone evaluation page for the exercise motion graphics.
// Mounted at /exercise-graphics by App.tsx — no auth required.

export default function ExerciseGraphicsDemo() {
  const [motions, setMotions] = useState<Record<string, ExerciseMotion>>(() => loadAllMotions());
  const [overrideIds, setOverrideIds] = useState<Set<string>>(() => new Set(Object.keys(loadOverrides())));

  // Pull from the backend on mount and on tab refocus so edits saved by the
  // editor show up here without a full page reload.
  useEffect(() => {
    const refresh = () => {
      void refreshMotions().then(() => {
        setMotions(loadAllMotions());
        setOverrideIds(new Set(Object.keys(loadOverrides())));
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("focus", refresh); };
  }, []);

  const byCategory = useMemo(() => {
    const groups = new Map<string, [string, ExerciseMotion][]>();
    for (const [id, m] of Object.entries(motions)) {
      const cat = m.category ?? "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push([id, m]);
    }
    const order = ["Push", "Pull", "Shoulders", "Legs", "Core", "Cardio", "Other"];
    return order
      .filter(cat => groups.has(cat))
      .map(cat => [cat, groups.get(cat)!.sort((a, b) => a[1].name.localeCompare(b[1].name))] as const);
  }, [motions]);

  const onReset = () => {
    if (!confirm("Clear the local cache and re-fetch motions from the server?")) return;
    resetCache();
    void refreshMotions().then(() => {
      setMotions(loadAllMotions());
      setOverrideIds(new Set(Object.keys(loadOverrides())));
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        padding: "32px 20px 60px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 20, fontWeight: 900, letterSpacing: 3,
              textTransform: "uppercase",
            }}>
              Exercise Motion Graphics
            </h1>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6, maxWidth: 720 }}>
              Stick-figure animations rendered from pose keyframes. Tap a card to pause/play.
              Click the pencil icon to open the editor and drag joints into new positions.
              Edits are saved to this browser's localStorage and override the bundled poses.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              borderRadius: 8, padding: "8px 12px",
              fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
              cursor: "pointer",
            }}
            title="Clear local cache and re-fetch from the server"
          >
            <RotateCcw size={12} /> Refresh from server ({overrideIds.size} server-edited)
          </button>
        </header>

        {byCategory.map(([cat, entries]) => (
          <section key={cat} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 12, fontWeight: 800, letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--muted)",
              margin: "0 0 12px",
            }}>
              {cat} <span style={{ opacity: 0.6 }}>· {entries.length}</span>
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {entries.map(([id, motion]) => (
                <DemoCard key={id} id={id} motion={motion} edited={overrideIds.has(id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DemoCard({ id, motion, edited }: { id: string; motion: ExerciseMotion; edited: boolean }) {
  const info = EXERCISE_INFO[id];
  const [paused, setPaused] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        background: "var(--s1)",
        border: edited ? "1px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 14px 14px",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8, gap: 8,
      }}>
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          textTransform: "uppercase",
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {motion.name}
          {edited && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--accent)", letterSpacing: 1 }}>EDITED</span>}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setPaused(p => !p)}
            title={paused ? "Play" : "Pause"}
            style={iconBtn}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <a
            href={`/exercise-editor?id=${encodeURIComponent(id)}`}
            title="Edit keyframes"
            style={{ ...iconBtn, textDecoration: "none", color: "var(--accent)" }}
          >
            <Pencil size={12} />
          </a>
        </div>
      </div>

      <div style={{
        background: "var(--s2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 10px 4px",
        display: "flex", justifyContent: "center",
        color: "var(--accent)",
      }}>
        <ExerciseAnimation
          frames={motion.frames}
          duration={motion.duration}
          bench={motion.bench}
          floor={motion.floor}
          rig={motion.rig}
          paused={paused}
          width={180}
          height={220}
        />
      </div>

      {info && (
        <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.55, color: "var(--text)" }}>
          {info.execute}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", letterSpacing: 0.5 }}>
        id <code>{id}</code> · {motion.frames.length} keyframes · {motion.duration ?? 2400}ms
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 24, height: 24,
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--muted)",
  cursor: "pointer",
};
