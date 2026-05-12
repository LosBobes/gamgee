import { useState } from "react";
import { Pause, Play } from "lucide-react";
import ExerciseAnimation from "./ExerciseAnimation";
import { MOTIONS } from "../../data/exerciseMotions";
import { EXERCISE_INFO } from "../../data/exerciseInfo";

// Standalone evaluation page for the exercise motion graphics.
// Mounted at /exercise-graphics by App.tsx — no auth required.

export default function ExerciseGraphicsDemo() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        padding: "32px 20px 60px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 20, fontWeight: 900, letterSpacing: 3,
            textTransform: "uppercase",
          }}>
            Exercise Motion Graphics
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
            Stick-figure animations rendered from pose keyframes. Tap a card to
            pause/play. Edit poses in <code>frontend/src/data/exerciseMotions.ts</code>.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {Object.keys(MOTIONS).map(id => (
            <DemoCard key={id} id={id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoCard({ id }: { id: string }) {
  const motion = MOTIONS[id];
  const info = EXERCISE_INFO[id];
  const [paused, setPaused] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setPaused(p => !p)}
      style={{
        position: "relative",
        background: "var(--s1)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 14px 14px",
        cursor: "pointer",
        textAlign: "left",
        color: "inherit",
        fontFamily: "inherit",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          textTransform: "uppercase",
        }}>
          {motion.name}
        </div>
        <span style={{
          color: "var(--muted)",
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 10, letterSpacing: 1,
        }}>
          {paused ? <Play size={11} /> : <Pause size={11} />}
        </span>
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
          barLine={motion.barLine}
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
    </button>
  );
}
