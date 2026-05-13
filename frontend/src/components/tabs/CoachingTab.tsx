import { useEffect, useState } from "react";
import { Search, Check, X, MessageSquare, GraduationCap, Award, ClipboardList } from "lucide-react";
import type { TrainerPublic, TrainerLink, RegimeAssignment } from "../../types";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  trainerLinks: TrainerLink[];
  assignments: RegimeAssignment[];
  refreshTrainers: () => Promise<void>;
  onOpenChat: (username: string) => void;
  onApplyRegime: (assignment: RegimeAssignment) => void;
}

export default function CoachingTab({
  authFetch, trainerLinks, assignments, refreshTrainers, onOpenChat, onApplyRegime,
}: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TrainerPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [openTrainer, setOpenTrainer] = useState<TrainerPublic | null>(null);

  // Initial trainer list
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authFetch("/api/trainers")
      .then(r => r.ok ? r.json() : [])
      .then((data: TrainerPublic[]) => { if (!cancelled) setResults(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authFetch]);

  // Search trainers when q changes
  useEffect(() => {
    const t = setTimeout(() => {
      const url = q.trim() ? `/api/trainers?q=${encodeURIComponent(q.trim())}` : "/api/trainers";
      authFetch(url)
        .then(r => r.ok ? r.json() : [])
        .then((data: TrainerPublic[]) => setResults(data))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, authFetch]);

  const requestTrainer = async (username: string) => {
    setRequesting(username);
    try {
      const r = await authFetch("/api/trainers/links/request-trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, note: note || undefined }),
      });
      if (r.ok) {
        await refreshTrainers();
        setNote("");
        setOpenTrainer(null);
        // Refresh local results
        const url = q.trim() ? `/api/trainers?q=${encodeURIComponent(q.trim())}` : "/api/trainers";
        const refresh = await authFetch(url);
        if (refresh.ok) setResults(await refresh.json());
      }
    } finally {
      setRequesting(null);
    }
  };

  const acceptLink = async (id: number) => {
    await authFetch(`/api/trainers/links/${id}/accept`, { method: "POST" });
    refreshTrainers();
  };
  const removeLink = async (id: number) => {
    await authFetch(`/api/trainers/links/${id}`, { method: "DELETE" });
    refreshTrainers();
  };

  // From the trainee's perspective, links where they are the trainee
  const myCoaches = trainerLinks.filter(l => l.role === "trainee");

  return (
    <div className="coaching-tab" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 1 }}>COACHING</h2>

      {/* My coaches */}
      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <GraduationCap size={16} /> My coaches
        </h3>
        {myCoaches.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            You aren't connected to a trainer yet. Browse the directory below to find one.
          </div>
        )}
        {myCoaches.map(l => (
          <div key={l.id} className="card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%",
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
                {l.status === "accepted" && "Coaching active"}
                {l.status === "pending_trainee" && "Awaiting trainer to accept your request"}
                {l.status === "pending_trainer" && "Invitation received — accept to start coaching"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {l.status === "accepted" && (
                <button className="btn-sec" onClick={() => onOpenChat(l.other_username)} title="Message">
                  <MessageSquare size={14} />
                </button>
              )}
              {l.status === "pending_trainer" && (
                <button className="btn-pri" onClick={() => acceptLink(l.id)}>
                  <Check size={14} /> Accept
                </button>
              )}
              <button className="btn-sec" onClick={() => removeLink(l.id)} title="Remove">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assigned regimes */}
      {assignments.filter(a => a.trainer_id !== a.trainee_id).length > 0 && (
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList size={16} /> Plans from your coach
          </h3>
          {assignments
            .filter(a => a.trainee_username && a.regime)
            .map(a => (
              <div key={a.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                  <strong>{a.regime.name}</strong>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    from {a.trainer_name || a.trainer_username}
                  </span>
                </div>
                {a.regime.description && (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.regime.description}</div>
                )}
                {a.note && (
                  <div style={{ fontSize: 12, padding: 8, background: "var(--ad)", borderRadius: 6 }}>
                    “{a.note}”
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button className="btn-pri" onClick={() => onApplyRegime(a)}>
                    Apply to my week
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Trainer directory */}
      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} /> Find a trainer
        </h3>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, username, or specialty"
          style={{ width: "100%" }}
        />
        {loading && <div style={{ color: "var(--muted)" }}>Loading…</div>}
        {results.length === 0 && !loading && (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            No trainers found. Be the first — sign up with a trainer account from the login screen.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {results.map(t => (
            <div key={t.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: t.primary_color || "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#000", fontWeight: 700,
                  }}
                >
                  {(t.name || t.username).slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{t.name || t.username}</strong>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>@{t.username} · {t.trainee_count} trainees</div>
                </div>
                {t.trainer_years_experience != null && (
                  <span title="Years of experience" style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 2 }}>
                    <Award size={12} /> {t.trainer_years_experience}y
                  </span>
                )}
              </div>
              {t.trainer_bio && (
                <div style={{ fontSize: 12, color: "var(--muted)", maxHeight: 60, overflow: "hidden" }}>
                  {t.trainer_bio}
                </div>
              )}
              {t.trainer_specialties && t.trainer_specialties.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {t.trainer_specialties.slice(0, 4).map(s => (
                    <span key={s} style={{ padding: "2px 8px", border: "1px solid var(--ad)", borderRadius: 999, fontSize: 11 }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                {t.link_status === "self" && <span style={{ fontSize: 12, color: "var(--muted)" }}>This is you</span>}
                {t.link_status === "accepted" && <span style={{ fontSize: 12, color: "var(--accent)" }}>Coaching active</span>}
                {t.link_status === "pending_trainee" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Awaiting reply</span>}
                {t.link_status === "pending_trainer" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Pending — they invited you</span>}
                {t.link_status === "none" && (
                  <button className="btn-pri" onClick={() => setOpenTrainer(t)}>
                    Ask to coach me
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {openTrainer && (
        <div
          onClick={() => setOpenTrainer(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ padding: 20, maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <h3 style={{ margin: 0 }}>Ask {openTrainer.name || openTrainer.username} to coach you</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              Optional message — tell them what you're working on.
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="Hi, I want to focus on my deadlift over the next 3 months…"
              style={{ width: "100%", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-sec" onClick={() => setOpenTrainer(null)}>Cancel</button>
              <button
                className="btn-pri"
                onClick={() => requestTrainer(openTrainer.username)}
                disabled={requesting === openTrainer.username}
              >
                Send request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
