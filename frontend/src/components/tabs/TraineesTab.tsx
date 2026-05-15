import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Send, UserPlus, MessageSquare, Activity, X, Check } from "lucide-react";
import type { TrainerLink, Regime, RegimeAssignment, LiveSession } from "../../types";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  trainerLinks: TrainerLink[];
  liveSessions: LiveSession[];
  refreshTrainers: () => Promise<void>;
  onOpenChat: (username: string) => void;
  onOpenLive: (session: LiveSession) => void;
}

export default function TraineesTab({
  authFetch, trainerLinks, liveSessions, refreshTrainers, onOpenChat, onOpenLive,
}: Props) {
  const [regimes, setRegimes] = useState<Regime[]>([]);
  const [assignments, setAssignments] = useState<RegimeAssignment[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<{ traineeId: number; username: string } | null>(null);
  const [assignNote, setAssignNote] = useState("");
  const [selectedRegime, setSelectedRegime] = useState<number | null>(null);

  const refresh = async () => {
    const [reg, asn] = await Promise.all([
      authFetch("/api/regimes").then(r => r.ok ? r.json() : []),
      authFetch("/api/assignments/mine").then(r => r.ok ? r.json() : []),
    ]);
    setRegimes(reg);
    setAssignments(asn);
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const myTrainees = trainerLinks.filter(l => l.role === "trainer");
  const traineeLiveByOwner: Record<number, LiveSession> = useMemo(() => {
    const map: Record<number, LiveSession> = {};
    for (const s of liveSessions) {
      if (s.status === "active") map[s.owner_id] = s;
    }
    return map;
  }, [liveSessions]);

  const inviteTrainee = async () => {
    setInviteErr(null);
    const username = inviteUsername.trim();
    if (!username) return;
    try {
      const r = await authFetch("/api/trainers/links/invite-trainee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, note: inviteNote || undefined }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setInviteErr(e.detail || "Couldn't send invite");
        return;
      }
      setInviteUsername("");
      setInviteNote("");
      setInviteOpen(false);
      refreshTrainers();
    } catch { setInviteErr("Network error"); }
  };

  const removeLink = async (id: number) => {
    await authFetch(`/api/trainers/links/${id}`, { method: "DELETE" });
    refreshTrainers();
  };

  const acceptLink = async (id: number) => {
    await authFetch(`/api/trainers/links/${id}/accept`, { method: "POST" });
    refreshTrainers();
  };

  const assignRegime = async () => {
    if (!assigningTo || !selectedRegime) return;
    try {
      const r = await authFetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainee_id: assigningTo.traineeId,
          regime_id: selectedRegime,
          note: assignNote || undefined,
        }),
      });
      if (r.ok) {
        setAssigningTo(null);
        setAssignNote("");
        setSelectedRegime(null);
        refresh();
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="trainees-tab tab-anim" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <GraduationCap size={16} /> MY TRAINEES
        </h2>
        <button className="btn-pri" onClick={() => setInviteOpen(true)}>
          <UserPlus size={14} /> Invite trainee
        </button>
      </div>

      {inviteOpen && (
        <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <strong>Invite a user to be your trainee</strong>
          <input
            value={inviteUsername}
            onChange={e => setInviteUsername(e.target.value)}
            placeholder="username"
          />
          <textarea
            value={inviteNote}
            onChange={e => setInviteNote(e.target.value)}
            placeholder="Optional message"
            rows={3}
          />
          {inviteErr && <div style={{ color: "var(--red)", fontSize: 12 }}>{inviteErr}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-sec" onClick={() => { setInviteOpen(false); setInviteErr(null); }}>Cancel</button>
            <button className="btn-pri" onClick={inviteTrainee} disabled={!inviteUsername.trim()}>Send invite</button>
          </div>
        </div>
      )}

      {myTrainees.length === 0 ? (
        <div className="card" style={{ padding: 16, color: "var(--muted)" }}>
          No trainees yet. Invite a user above, or wait for someone to find your public profile.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {myTrainees.map(l => {
            const live = traineeLiveByOwner[l.other_user_id];
            return (
              <div key={l.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: l.other_primary_color || "var(--accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#000", fontWeight: 700,
                    }}
                  >
                    {(l.other_name || l.other_username).slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{l.other_name || l.other_username}</strong>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      @{l.other_username}
                      {l.status === "pending_trainer" && " · awaiting their reply"}
                      {l.status === "pending_trainee" && " · they requested you — accept below"}
                    </div>
                  </div>
                  {live && (
                    <button
                      className="btn-pri"
                      onClick={() => onOpenLive(live)}
                      style={{ background: "var(--accent)" }}
                    >
                      <Activity size={14} /> Watch live
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {l.status === "pending_trainee" && (
                    <button className="btn-pri" onClick={() => acceptLink(l.id)}>
                      <Check size={14} /> Accept
                    </button>
                  )}
                  {l.status === "accepted" && (
                    <>
                      <button className="btn-sec" onClick={() => onOpenChat(l.other_username)}>
                        <MessageSquare size={14} /> Message
                      </button>
                      <button
                        className="btn-pri"
                        onClick={() => setAssigningTo({ traineeId: l.other_user_id, username: l.other_username })}
                      >
                        <Send size={14} /> Assign plan
                      </button>
                    </>
                  )}
                  <button className="btn-sec" onClick={() => removeLink(l.id)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignments I have sent */}
      {assignments.length > 0 && (
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Plans I've assigned</h3>
          {assignments
            .filter(a => myTrainees.some(t => t.other_user_id === a.trainee_id))
            .map(a => (
              <div key={a.id} className="card" style={{ padding: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{a.regime.name}</strong>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    → {a.trainee_name || a.trainee_username}
                  </div>
                </div>
                <button
                  className="btn-sec"
                  onClick={async () => {
                    await authFetch(`/api/assignments/${a.id}`, { method: "DELETE" });
                    refresh();
                  }}
                >
                  <X size={14} /> Revoke
                </button>
              </div>
            ))}
        </div>
      )}

      {assigningTo && (
        <div
          onClick={() => setAssigningTo(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ padding: 20, maxWidth: 460, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <h3 style={{ margin: 0 }}>Assign a plan to {assigningTo.username}</h3>
            {regimes.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                You haven't built any regimes yet. Open the Regimes tab to generate one.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                  {regimes.map(r => (
                    <label
                      key={r.id}
                      className="card"
                      style={{
                        padding: 10, display: "flex", alignItems: "center", gap: 8,
                        border: selectedRegime === r.id ? "1px solid var(--accent)" : "1px solid var(--ad)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        checked={selectedRegime === r.id}
                        onChange={() => setSelectedRegime(r.id)}
                      />
                      <div>
                        <strong>{r.name}</strong>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {r.days_per_week} days/week · {r.goal || "general"}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={assignNote}
                  onChange={e => setAssignNote(e.target.value)}
                  placeholder="Optional note for your trainee"
                />
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-sec" onClick={() => setAssigningTo(null)}>Cancel</button>
              <button className="btn-pri" onClick={assignRegime} disabled={!selectedRegime}>
                Send plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
