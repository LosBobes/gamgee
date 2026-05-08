import { useState } from "react";
import type { WorkoutSession, PRDict } from "../../types";
import { fmtDate, fmtDur } from "../../utils";

interface Props {
  history: WorkoutSession[];
  prs:     PRDict;
}

const DAYS = ["S","M","T","W","T","F","S"];

export default function HistoryTab({ history, prs }: Props) {
  const [view,         setView]         = useState<"list" | "calendar">("list");
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());
  const [calMonth,     setCalMonth]     = useState(() => new Date());
  const [selectedDay,  setSelectedDay]  = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const workoutByDay: Record<string, WorkoutSession[]> = {};
  history.forEach(w => {
    const d = w.date.slice(0, 10);
    (workoutByDay[d] = workoutByDay[d] || []).push(w);
  });

  const today    = new Date().toISOString().slice(0, 10);
  const year     = calMonth.getFullYear();
  const month    = calMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMo = new Date(year, month + 1, 0).getDate();
  const monthLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  const prevMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const calCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMo }, (_, i) => i + 1),
  ];

  const selectedSessions = selectedDay ? (workoutByDay[selectedDay] ?? []) : [];

  if (history.length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon">📋</div><div className="empty-label">No sessions yet</div></div>
      </div>
    );
  }

  return (
    <div className="tab-anim">
      <div className="hist-view-toggle">
        <button className={`hist-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>LIST</button>
        <button className={`hist-view-btn ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>CALENDAR</button>
      </div>

      {view === "list" && history.map(w => {
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

      {view === "calendar" && (
        <div className="cal-wrap">
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth}>← PREV</button>
            <span className="cal-month-label">{monthLabel}</span>
            <button className="cal-nav-btn" onClick={nextMonth}>NEXT →</button>
          </div>
          <div className="cal-dow">
            {DAYS.map((d, i) => <div key={i} className="cal-dow-lbl">{d}</div>)}
          </div>
          <div className="cal-grid">
            {calCells.map((day, i) => {
              if (!day) return <div key={i} className="cal-cell empty" />;
              const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasW    = !!workoutByDay[iso];
              const isToday = iso === today;
              const isSel   = iso === selectedDay;
              let cls = "cal-cell";
              if (isSel)        cls += " selected";
              else if (hasW)    cls += " has-workout";
              else              cls += " no-workout";
              if (isToday && !isSel) cls += " today";
              return (
                <div
                  key={i} className={cls}
                  onClick={() => hasW && setSelectedDay(isSel ? null : iso)}
                  title={hasW ? `${workoutByDay[iso].length} workout(s)` : ""}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {selectedSessions.length > 0 && (
            <div className="cal-session">
              {selectedSessions.map(w => {
                const sets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
                const vol  = w.exercises.reduce((a, e) => e.type !== "strength" ? a :
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
                      <span style={{ color: "var(--muted)", fontSize: 14 }}>{expanded.has(w.id) ? "▲" : "▼"}</span>
                    </div>
                    {expanded.has(w.id) && (
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
