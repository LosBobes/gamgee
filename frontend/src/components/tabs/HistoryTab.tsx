import { useState } from "react";
import { ClipboardList, Timer, Dumbbell, Layers, Activity, Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { WorkoutSession, PRDict } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { ALL_EX } from "../../data/exercises";
import EditWorkoutModal from "./EditWorkoutModal";
import { useTxt } from "../../context/ToneContext";

interface Props {
  history: WorkoutSession[];
  prs:     PRDict;
  bodyweight: number | null;
  onDelete: (id: string) => void;
  onUpdate: (session: WorkoutSession) => void;
}

const DAYS = ["S","M","T","W","T","F","S"];

// Render a strength set's weight chip. Assisted exercises log an offset from
// bodyweight; show the effective lifted weight when known, else just the offset.
function fmtAssistedSet(w: number, reps: string, bodyweight: number | null): string {
  if (bodyweight != null) {
    const eff = Math.round((bodyweight + w) * 10) / 10;
    return w === 0 ? `${eff}kg (BW) × ${reps}` : `${eff}kg (BW − ${Math.abs(w)}) × ${reps}`;
  }
  if (w === 0) return `BW × ${reps}`;
  return `BW ${w < 0 ? "−" : "+"} ${Math.abs(w)}kg × ${reps}`;
}

export default function HistoryTab({ history, prs, bodyweight, onDelete, onUpdate }: Props) {
  const t = useTxt();
  const [view,           setView]           = useState<"list" | "calendar">("list");
  const [expanded,       setExpanded]       = useState<Set<string>>(new Set());
  const [calMonth,       setCalMonth]       = useState(() => new Date());
  const [selectedDay,    setSelectedDay]    = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);

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

  const handleSave = (updated: WorkoutSession) => {
    onUpdate(updated);
    setEditingSession(null);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setEditingSession(null);
  };

  if (history.length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon"><ClipboardList size={40} /></div><div className="empty-label">{t("No sessions yet", "No sessions yet. Your legend starts today.", "No sessions yet. Your villain origin starts today.")}</div></div>
      </div>
    );
  }

  const renderSession = (w: WorkoutSession, expandable = true) => {
    const isOpen = expanded.has(w.id);
    const sets   = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    const vol    = w.exercises.reduce((a, e) => e.type !== "strength" ? a :
      a + e.sets.reduce((b, s) => {
        const w = parseFloat(s.weight) || 0;
        // Assisted exercises log negative weight; skip them in tonnage so they
        // don't subtract from total volume.
        if (w <= 0) return b;
        return b + w * (parseInt(s.reps) || 0);
      }, 0), 0);
    return (
      <div key={w.id} className="hist-card">
        <div className="hist-hdr" onClick={() => expandable && toggleExpand(w.id)}>
          <div>
            <div className="hist-date">{fmtDate(w.date)}</div>
            <div className="hist-meta">
              <span><Timer size={11} /> {fmtDur(w.duration)}</span>
              <span><Dumbbell size={11} /> {w.exercises.length} ex</span>
              <span><Layers size={11} /> {sets} sets</span>
              {vol > 0 && <span><Activity size={11} /> {Math.round(vol)}kg</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              className="hist-edit-btn"
              onClick={e => { e.stopPropagation(); setEditingSession(w); }}
              title="Edit session"
            >
              <Pencil size={13} />
            </button>
            <span style={{ color: "var(--muted)" }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>
        </div>
        {isOpen && (
          <div className="hist-body">
            {w.exercises.map(ex => (
              <div key={ex.uid} className="hist-ex">
                <div className="hist-ex-name">{ex.name}</div>
                <div className="hist-chips">
                  {ex.sets.map((s, i) => {
                    const w = parseFloat(s.weight);
                    const isPr = ex.type === "strength" && prs[ex.id] && prs[ex.id].weight === w;
                    const isAssisted = !!ex.is_assisted || !!ALL_EX.find(e => e.id === ex.id)?.is_assisted;
                    const strengthLabel = isAssisted
                      ? fmtAssistedSet(w, s.reps, bodyweight)
                      : `${s.weight}kg × ${s.reps}`;
                    return (
                      <span key={i} className={`chip ${isPr ? "pr-chip" : ""}`}>
                        {ex.type === "cardio" ? `${s.weight}min${s.reps ? ` · ${s.reps}km` : ""}`
                          : ex.type === "timed" ? `${s.weight}s`
                          : strengthLabel}
                        {isPr && <Trophy size={10} style={{ verticalAlign: "middle", marginLeft: 3 }} />}
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
  };

  return (
    <div className="tab-anim">
      <div className="hist-view-toggle">
        <button className={`hist-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>LIST</button>
        <button className={`hist-view-btn ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>CALENDAR</button>
      </div>

      {view === "list" && history.map(w => renderSession(w))}

      {view === "calendar" && (
        <div className="cal-wrap">
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month"><ChevronLeft size={14} /><span className="cal-nav-text">PREV</span></button>
            <span className="cal-month-label">{monthLabel}</span>
            <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month"><span className="cal-nav-text">NEXT</span><ChevronRight size={14} /></button>
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
              {selectedSessions.map(w => renderSession(w))}
            </div>
          )}
        </div>
      )}

      {editingSession && (
        <EditWorkoutModal
          session={editingSession}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  );
}
