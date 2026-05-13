import { useEffect, useState } from "react";
import { X, Activity, Dumbbell, Clock } from "lucide-react";
import type { LiveSession, LiveSetEvent } from "../types";
import { fmtClock } from "../utils";

interface Props {
  session: LiveSession;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  /** Bumped from outside whenever this session's data changes (parent gets SSE
   *  events, refetches the list, and increments this so we re-poll the timeline). */
  refreshKey: number;
}

export default function LiveSessionViewer({ session, authFetch, onClose, refreshKey }: Props) {
  const [events, setEvents] = useState<LiveSetEvent[]>([]);
  const canTimeline = !!session.can_see_set_timeline;

  useEffect(() => {
    if (!canTimeline) return;
    let cancelled = false;
    authFetch(`/api/live-sessions/${session.id}/set-events`)
      .then(r => r.ok ? r.json() : [])
      .then((data: LiveSetEvent[]) => { if (!cancelled) setEvents(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session.id, canTimeline, authFetch, refreshKey]);

  const elapsed = Date.now() - (session.started_at || Date.now());
  const totalSets = session.total_sets_planned ?? null;
  const progress = totalSets ? Math.min(1, session.owner_sets_done / Math.max(1, totalSets)) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 150, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{
          padding: 20, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: session.owner_primary_color || "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#000", fontWeight: 700,
              }}
            >
              {(session.owner_name || session.owner_username || "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{session.owner_name || session.owner_username}</strong>
              <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Activity size={12} />
                {session.status === "active" ? "Live now" : "Ended"}
                {session.focus && ` · ${session.focus}`}
              </div>
            </div>
          </div>
          <button className="btn-sec" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {session.note && (
          <div style={{ padding: 10, background: "var(--ad)", borderRadius: 8, fontSize: 13 }}>
            “{session.note}”
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <Stat label="Elapsed" value={fmtClock(Math.max(0, elapsed))} icon={<Clock size={12} />} />
          <Stat
            label="Sets done"
            value={`${session.owner_sets_done}${totalSets ? ` / ${totalSets}` : ""}`}
            icon={<Dumbbell size={12} />}
          />
          {session.total_exercises_planned != null && (
            <Stat label="Exercises" value={String(session.total_exercises_planned)} />
          )}
        </div>

        {progress != null && (
          <div style={{ height: 6, background: "var(--ad)", borderRadius: 99 }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
          </div>
        )}

        {/* Current + last set */}
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
            Working on
          </div>
          <div style={{ marginTop: 4, fontSize: 15 }}>
            {session.current_exercise_name || <em style={{ color: "var(--muted)" }}>Warming up…</em>}
          </div>
          {(session.last_weight != null || session.last_reps != null) && (
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
              Last set:{" "}
              {session.last_weight != null && <strong>{session.last_weight}kg</strong>}
              {session.last_weight != null && session.last_reps != null && " × "}
              {session.last_reps != null && <strong>{session.last_reps} reps</strong>}
              {session.current_set_index != null && ` (set #${session.current_set_index + 1})`}
            </div>
          )}
        </div>

        {/* Set-by-set timeline (trainer audience) */}
        {canTimeline && (
          <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              Set timeline (trainer view)
            </div>
            {events.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                No sets logged yet. They appear as your trainee marks each set done.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                {events.map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", borderRadius: 6,
                      border: "1px solid var(--ad)", fontSize: 13,
                    }}
                  >
                    <span style={{ width: 60, color: "var(--muted)", fontSize: 11 }}>
                      {new Date(ev.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <strong style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.exercise_name}
                    </strong>
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>set {ev.set_index + 1}</span>
                    {ev.weight != null && <span><strong>{ev.weight}kg</strong></span>}
                    {ev.reps != null && <span>× {ev.reps}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Participants */}
        {session.participants.length > 0 && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Joined buddies
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {session.participants.map(p => (
                <span key={p.user_id} style={{
                  padding: "4px 10px", border: "1px solid var(--ad)", borderRadius: 999, fontSize: 12,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.primary_color || "var(--accent)" }} />
                  {p.name || p.username} · {p.sets_done} sets
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 10, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
