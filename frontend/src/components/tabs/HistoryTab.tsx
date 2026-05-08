import { useState } from "react";
import type { WorkoutSession, PRDict } from "../../types";
import { fmtDate, fmtDur } from "../../utils";

interface Props {
  history: WorkoutSession[];
  prs:     PRDict;
}

export default function HistoryTab({ history, prs }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  if (history.length === 0) {
    return <div className="empty"><div className="empty-icon">📋</div><div className="empty-label">No sessions yet</div></div>;
  }

  return (
    <>
      {history.map(w => {
        const isOpen = expanded.has(w.id);
        const sets   = w.exercises.reduce((a, e) => a + e.sets.length, 0);
        const vol    = w.exercises.reduce((a, e) => e.type !== "strength" ? a :
          a + e.sets.reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
        return (
          <div key={w.id} className="hist-card">
            <div className="hist-hdr" onClick={() => toggleExpand(w.id)}>
              <div>
                <div className="hist-date">{fmtDate(w.date)}</div>
                <div className="hist-meta">
                  <span>⏱ {fmtDur(w.duration)}</span>
                  <span>🏋️ {w.exercises.length} ex</span>
                  <span>📊 {sets} sets</span>
                  {vol > 0 && <span>💪 {Math.round(vol)}kg</span>}
                </div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
            </div>
            {isOpen && (
              <div className="hist-body">
                {w.exercises.map(ex => (
                  <div key={ex.uid} className="hist-ex">
                    <div className="hist-ex-name">{ex.name}</div>
                    <div className="hist-chips">
                      {ex.sets.map((s, i) => {
                        const isPr = ex.type === "strength" && prs[ex.id] && prs[ex.id].weight === parseFloat(s.weight);
                        return (
                          <span key={i} className={`chip ${isPr ? "pr-chip" : ""}`}>
                            {ex.type === "cardio" ? `${s.weight}min${s.reps ? ` · ${s.reps}km` : ""}`
                              : ex.type === "timed" ? `${s.weight}s`
                              : `${s.weight}kg × ${s.reps}`}
                            {isPr ? " 🏆" : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
