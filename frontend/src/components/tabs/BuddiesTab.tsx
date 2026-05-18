import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserPlus, Search, Check, X as XIcon, Trash2, Send,
  Trophy, Flame, Zap, Bell, Play, LogOut,
} from "lucide-react";
import type {
  Buddy, UserSearchResult, ScoreboardRow, MotivatePreset, LiveSession,
} from "../../types";
import { useTxt } from "../../context/ToneContext";
import PublicProfileModal from "../PublicProfileModal";

type Sub = "scoreboard" | "buddies" | "live" | "find";

interface Props {
  authFetch:        (url: string, opts?: RequestInit) => Promise<Response>;
  buddies:          Buddy[];
  liveSessions:     LiveSession[];
  myLiveSession:    LiveSession | null;
  workoutActive:    boolean;
  workoutFocus:     string | null;
  workoutDoneSets:  number;
  refreshBuddies:   () => Promise<void>;
  refreshLive:      () => Promise<void>;
  startLiveSession: (note: string) => Promise<void>;
  endLiveSession:   () => Promise<void>;
  joinLiveSession:  (id: string) => Promise<void>;
}

export default function BuddiesTab({
  authFetch, buddies, liveSessions, myLiveSession,
  workoutActive, workoutFocus, workoutDoneSets,
  refreshBuddies, refreshLive,
  startLiveSession, endLiveSession, joinLiveSession,
}: Props) {
  const t = useTxt();
  const [sub, setSub] = useState<Sub>("scoreboard");
  const [scoreboard, setScoreboard] = useState<ScoreboardRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const openProfile = useCallback((userId: number) => setProfileUserId(userId), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const loadScoreboard = useCallback(async () => {
    try {
      const r = await authFetch("/api/buddies/scoreboard");
      if (r.ok) setScoreboard(await r.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => {
    if (sub === "scoreboard") loadScoreboard();
  }, [sub, loadScoreboard]);

  // ── Subnav ──
  const tabs: Array<{ key: Sub; label: string; Icon: typeof Trophy; badge: number | null }> = [
    { key: "scoreboard", label: t("Scoreboard", "Leaderboard", "Leaderboard"), Icon: Trophy, badge: null },
    { key: "buddies",    label: t("Buddies", "The Crew", "The Bestie List"),   Icon: Users,  badge: buddies.length || null },
    { key: "live",       label: t("Live", "Live Squad", "Live Squad"),         Icon: Zap,    badge: liveSessions.length || null },
    { key: "find",       label: t("Find", "Recruit", "Add"),                   Icon: Search, badge: null },
  ];

  const incoming = buddies.filter(b => b.status === "pending_in");

  return (
    <div className="tab-anim">
      {toast && <div className="health-toast">{toast}</div>}

      <div className="buddy-subnav">
        {tabs.map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            className={`buddy-subnav-btn${sub === key ? " active" : ""}`}
            onClick={() => setSub(key)}
          >
            <Icon size={13} />
            <span>{label}</span>
            {badge !== null && <span className="tab-badge">{badge}</span>}
          </button>
        ))}
      </div>

      {incoming.length > 0 && sub !== "find" && (
        <IncomingRequests
          incoming={incoming}
          authFetch={authFetch}
          refresh={refreshBuddies}
          onToast={showToast}
        />
      )}

      {sub === "scoreboard" && (
        <ScoreboardView rows={scoreboard} loading={loading} onOpenProfile={openProfile} />
      )}

      {sub === "buddies" && (
        <BuddiesList
          buddies={buddies}
          authFetch={authFetch}
          refresh={refreshBuddies}
          onToast={showToast}
          onLoading={setLoading}
          onOpenProfile={openProfile}
        />
      )}

      {sub === "live" && (
        <LiveView
          sessions={liveSessions}
          mine={myLiveSession}
          workoutActive={workoutActive}
          workoutFocus={workoutFocus}
          workoutDoneSets={workoutDoneSets}
          refreshLive={refreshLive}
          startLiveSession={startLiveSession}
          endLiveSession={endLiveSession}
          joinLiveSession={joinLiveSession}
          onToast={showToast}
          onOpenProfile={openProfile}
        />
      )}

      {sub === "find" && (
        <FindBuddies
          authFetch={authFetch}
          refresh={refreshBuddies}
          onToast={showToast}
          onOpenProfile={openProfile}
        />
      )}

      {profileUserId !== null && (
        <PublicProfileModal
          userId={profileUserId}
          authFetch={authFetch}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  );
}

// ─── Scoreboard ────────────────────────────────────────────────────────────

function ScoreboardView({ rows, loading, onOpenProfile }: {
  rows: ScoreboardRow[]; loading: boolean;
  onOpenProfile: (userId: number) => void;
}) {
  const t = useTxt();
  if (loading) {
    return <div className="empty"><div className="empty-label">Loading…</div></div>;
  }
  if (rows.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><Trophy size={40} /></div>
        <div className="empty-label">{t("No data yet — log a workout to appear here", "Log a session to climb the leaderboard", "Log a session, bestie. The leaderboard misses you.")}</div>
      </div>
    );
  }
  const maxWeek = Math.max(...rows.map(r => r.workouts_week), 1);
  return (
    <>
      <div className="buddy-intro">{t(
        "Rolling 7-day stats across you and your accepted buddies. Sorted by workouts this week.",
        "Last 7 days. Lift more or get clowned.",
        "Last 7 days, bestie. Show up or get out-glowed."
      )}</div>
      {rows.map((r, i) => {
        const accent = r.primary_color ?? "var(--primary)";
        const initials = (r.name ?? r.username).slice(0, 2).toUpperCase();
        return (
          <div
            key={r.user_id}
            className={`score-card clickable${r.is_self ? " is-self" : ""}`}
            onClick={() => onOpenProfile(r.user_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenProfile(r.user_id); }}
          >
            <div className="score-rank">#{i + 1}</div>
            <div className="score-avatar" style={{ background: accent }}>{initials}</div>
            <div className="score-main">
              <div className="score-name">
                {r.name ?? r.username}
                {r.is_self && <span className="score-self-tag">YOU</span>}
                {r.current_streak > 0 && (
                  <span className="score-streak"><Flame size={11} />{r.current_streak}</span>
                )}
              </div>
              <div className="score-meta">@{r.username}</div>
              <div className="score-bar">
                <div className="score-bar-fill" style={{
                  width: `${Math.round((r.workouts_week / maxWeek) * 100)}%`,
                  background: accent,
                }} />
              </div>
            </div>
            <div className="score-stats">
              <div className="score-stat">
                <span className="score-stat-val">{r.workouts_week}</span>
                <span className="score-stat-lbl">wk</span>
              </div>
              <div className="score-stat">
                <span className="score-stat-val">{fmtVol(r.volume_week)}</span>
                <span className="score-stat-lbl">vol</span>
              </div>
              <div className="score-stat">
                <span className="score-stat-val">{r.pr_count}</span>
                <span className="score-stat-lbl">PRs</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function fmtVol(kg: number): string {
  if (!kg) return "0";
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

// ─── Incoming requests banner ─────────────────────────────────────────────

function IncomingRequests({ incoming, authFetch, refresh, onToast }: {
  incoming: Buddy[];
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
  onToast: (m: string) => void;
}) {
  const accept = async (id: number) => {
    const r = await authFetch(`/api/buddies/requests/${id}/accept`, { method: "POST" });
    if (r.ok) { onToast("Buddy added"); await refresh(); }
  };
  const decline = async (id: number) => {
    const r = await authFetch(`/api/buddies/${id}`, { method: "DELETE" });
    if (r.ok) { onToast("Declined"); await refresh(); }
  };
  return (
    <div className="profile-card buddy-incoming">
      <div className="profile-section" style={{ margin: "0 0 8px" }}>Pending Requests</div>
      {incoming.map(b => (
        <div key={b.id} className="buddy-row">
          <div className="score-avatar" style={{ background: b.primary_color ?? "var(--primary)" }}>
            {(b.name ?? b.username).slice(0, 2).toUpperCase()}
          </div>
          <div className="buddy-row-main">
            <div className="buddy-row-name">{b.name ?? b.username}</div>
            <div className="buddy-row-handle">@{b.username}</div>
          </div>
          <button className="buddy-pill-btn accept" onClick={() => accept(b.id)}>
            <Check size={14} /> Accept
          </button>
          <button className="buddy-pill-btn decline" onClick={() => decline(b.id)}>
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Buddies list ─────────────────────────────────────────────────────────

function BuddiesList({ buddies, authFetch, refresh, onToast, onLoading, onOpenProfile }: {
  buddies: Buddy[];
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
  onToast: (m: string) => void;
  onLoading: (l: boolean) => void;
  onOpenProfile: (userId: number) => void;
}) {
  const t = useTxt();
  const accepted = buddies.filter(b => b.status === "accepted");
  const pending = buddies.filter(b => b.status === "pending_out");
  const [motivateBuddy, setMotivateBuddy] = useState<Buddy | null>(null);

  if (accepted.length === 0 && pending.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><Users size={40} /></div>
        <div className="empty-label">{t("No buddies yet. Find someone to lift with.", "No squad yet. Recruit someone.", "No besties yet. Adopt one.")}</div>
      </div>
    );
  }

  return (
    <>
      {accepted.map(b => (
        <BuddyCard
          key={b.id}
          buddy={b}
          authFetch={authFetch}
          refresh={refresh}
          onToast={onToast}
          onLoading={onLoading}
          onMotivate={() => setMotivateBuddy(b)}
          onOpenProfile={() => onOpenProfile(b.user_id)}
        />
      ))}
      {pending.length > 0 && (
        <div className="profile-section">Sent Requests</div>
      )}
      {pending.map(b => (
        <div key={b.id} className="buddy-row">
          <div className="score-avatar" style={{ background: b.primary_color ?? "var(--primary)" }}>
            {(b.name ?? b.username).slice(0, 2).toUpperCase()}
          </div>
          <div className="buddy-row-main">
            <div className="buddy-row-name">{b.name ?? b.username}</div>
            <div className="buddy-row-handle">@{b.username} · pending…</div>
          </div>
          <button className="buddy-pill-btn decline" onClick={async () => {
            const r = await authFetch(`/api/buddies/${b.id}`, { method: "DELETE" });
            if (r.ok) { onToast("Cancelled"); await refresh(); }
          }}>
            <XIcon size={14} />
          </button>
        </div>
      ))}

      {motivateBuddy && (
        <MotivateDialog
          buddy={motivateBuddy}
          authFetch={authFetch}
          onClose={() => setMotivateBuddy(null)}
          onToast={onToast}
        />
      )}
    </>
  );
}

function BuddyCard({ buddy, authFetch, refresh, onToast, onLoading, onMotivate, onOpenProfile }: {
  buddy: Buddy;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
  onToast: (m: string) => void;
  onLoading: (l: boolean) => void;
  onMotivate: () => void;
  onOpenProfile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const accent = buddy.primary_color ?? "var(--primary)";
  const initials = (buddy.name ?? buddy.username).slice(0, 2).toUpperCase();

  const togglePref = async (key: "notify_workout" | "notify_pr" | "notify_motivate" | "notify_live") => {
    onLoading(true);
    const r = await authFetch(`/api/buddies/${buddy.id}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !buddy[key] }),
    });
    if (r.ok) await refresh();
    onLoading(false);
  };

  const remove = async () => {
    if (!confirm(`Remove ${buddy.name ?? buddy.username} as buddy?`)) return;
    const r = await authFetch(`/api/buddies/${buddy.id}`, { method: "DELETE" });
    if (r.ok) { onToast("Buddy removed"); await refresh(); }
  };

  return (
    <div className="profile-card buddy-card">
      <div className="buddy-row">
        <button
          type="button"
          className="buddy-row-clickable"
          onClick={onOpenProfile}
          aria-label={`View ${buddy.name ?? buddy.username}'s profile`}
        >
          <div className="score-avatar" style={{ background: accent }}>{initials}</div>
          <div className="buddy-row-main">
            <div className="buddy-row-name">{buddy.name ?? buddy.username}</div>
            <div className="buddy-row-handle">@{buddy.username}</div>
          </div>
        </button>
        <button className="buddy-pill-btn motivate" onClick={onMotivate}>
          <Send size={13} /> Motivate
        </button>
        <button className="buddy-icon-btn" onClick={() => setOpen(o => !o)} aria-label="Settings">
          <Bell size={14} />
        </button>
      </div>
      {open && (
        <div className="buddy-prefs">
          <div className="buddy-prefs-title">Notify me when this buddy…</div>
          <PrefToggle label="Finishes a workout" on={buddy.notify_workout} onClick={() => togglePref("notify_workout")} />
          <PrefToggle label="Sets a new PR" on={buddy.notify_pr} onClick={() => togglePref("notify_pr")} />
          <PrefToggle label="Sends me motivation" on={buddy.notify_motivate} onClick={() => togglePref("notify_motivate")} />
          <PrefToggle label="Starts/ends a live session" on={buddy.notify_live} onClick={() => togglePref("notify_live")} />
          <button className="buddy-remove-btn" onClick={remove}>
            <Trash2 size={13} /> Remove buddy
          </button>
        </div>
      )}
    </div>
  );
}

function PrefToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`pref-toggle${on ? " on" : ""}`}
      onClick={onClick}
    >
      <span className="pref-radio" aria-hidden="true" />
      <span className="pref-toggle-body">
        <span className="pref-toggle-label">{label}</span>
      </span>
    </button>
  );
}

// ─── Motivate dialog ──────────────────────────────────────────────────────

function MotivateDialog({ buddy, authFetch, onClose, onToast }: {
  buddy: Buddy;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [presets, setPresets] = useState<MotivatePreset[]>([]);
  const [picked, setPicked]   = useState<string | null>(null);
  const [custom, setCustom]   = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr]         = useState("");

  useEffect(() => {
    authFetch("/api/buddies/motivate/presets")
      .then(r => r.ok ? r.json() : [])
      .then((d: MotivatePreset[]) => setPresets(d))
      .catch(() => {});
  }, [authFetch]);

  const message = useMemo(() => {
    if (custom.trim()) return custom.trim();
    if (picked) return presets.find(p => p.id === picked)?.message ?? "";
    return "";
  }, [custom, picked, presets]);

  const send = async () => {
    if (!message) return;
    setSending(true); setErr("");
    const r = await authFetch(`/api/buddies/${buddy.id}/motivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, preset: custom.trim() ? null : picked }),
    });
    setSending(false);
    if (r.ok) {
      onToast(`Sent to ${buddy.name ?? buddy.username}`);
      onClose();
    } else {
      const body = await r.json().catch(() => ({}));
      setErr(body.detail ?? "Failed to send");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <Send size={16} /> Motivate {buddy.name ?? buddy.username}
        </div>
        <div className="modal-sub">Tap a preset or write your own.</div>
        <div className="motivate-presets">
          {presets.map(p => (
            <button
              key={p.id}
              className={`motivate-preset${picked === p.id ? " active" : ""}`}
              onClick={() => { setPicked(p.id); setCustom(""); }}
            >
              {p.message}
            </button>
          ))}
        </div>
        <textarea
          className="field-input field-textarea"
          placeholder="Custom encouragement…"
          value={custom}
          maxLength={240}
          onChange={e => { setCustom(e.target.value); setPicked(null); }}
          rows={3}
        />
        {err && <p className="auth-err">{err}</p>}
        <div className="modal-actions">
          <button className="auth-toggle" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!message || sending} onClick={send}>
            <Send size={14} /> {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Find users ───────────────────────────────────────────────────────────

function FindBuddies({ authFetch, refresh, onToast, onOpenProfile }: {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
  onToast: (m: string) => void;
  onOpenProfile: (userId: number) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await authFetch(`/api/buddies/search?q=${encodeURIComponent(q.trim())}`);
        if (r.ok) setResults(await r.json());
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, authFetch]);

  const sendRequest = async (username: string) => {
    const r = await authFetch("/api/buddies/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (r.ok) {
      onToast("Request sent");
      await refresh();
      setResults(prev => prev.map(p => p.username === username ? { ...p, relationship: "pending_out" } : p));
    } else {
      const body = await r.json().catch(() => ({}));
      onToast(body.detail ?? "Failed");
    }
  };

  return (
    <div className="profile-card">
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
        <input
          className="field-input"
          style={{ paddingLeft: 32 }}
          placeholder="Search by username or name"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoFocus
        />
      </div>
      {loading && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Searching…</div>}
      <div style={{ marginTop: 12 }}>
        {results.length === 0 && q.trim() && !loading && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>No users found</div>
        )}
        {results.map(r => {
          const canOpen = r.relationship === "accepted" || r.relationship === "self";
          return (
          <div key={r.id} className="buddy-row">
            {canOpen ? (
              <button
                type="button"
                className="buddy-row-clickable"
                onClick={() => onOpenProfile(r.id)}
                aria-label={`View ${r.name ?? r.username}'s profile`}
              >
                <div className="score-avatar" style={{ background: r.primary_color ?? "var(--primary)" }}>
                  {(r.name ?? r.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="buddy-row-main">
                  <div className="buddy-row-name">{r.name ?? r.username}</div>
                  <div className="buddy-row-handle">@{r.username}</div>
                </div>
              </button>
            ) : (
              <>
                <div className="score-avatar" style={{ background: r.primary_color ?? "var(--primary)" }}>
                  {(r.name ?? r.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="buddy-row-main">
                  <div className="buddy-row-name">{r.name ?? r.username}</div>
                  <div className="buddy-row-handle">@{r.username}</div>
                </div>
              </>
            )}
            {r.relationship === "self" && (
              <span className="buddy-status-tag">YOU</span>
            )}
            {r.relationship === "accepted" && (
              <span className="buddy-status-tag accepted">BUDDY</span>
            )}
            {r.relationship === "pending_out" && (
              <span className="buddy-status-tag pending">PENDING</span>
            )}
            {r.relationship === "pending_in" && (
              <span className="buddy-status-tag pending">INCOMING</span>
            )}
            {r.relationship === "none" && (
              <button className="buddy-pill-btn accept" onClick={() => sendRequest(r.username)}>
                <UserPlus size={13} /> Add
              </button>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live (co-working out) ────────────────────────────────────────────────

function LiveView({
  sessions, mine, workoutActive, workoutFocus, workoutDoneSets,
  refreshLive, startLiveSession, endLiveSession, joinLiveSession, onToast,
  onOpenProfile,
}: {
  sessions: LiveSession[];
  mine: LiveSession | null;
  workoutActive: boolean;
  workoutFocus: string | null;
  workoutDoneSets: number;
  refreshLive: () => Promise<void>;
  startLiveSession: (note: string) => Promise<void>;
  endLiveSession: () => Promise<void>;
  joinLiveSession: (id: string) => Promise<void>;
  onToast: (m: string) => void;
  onOpenProfile: (userId: number) => void;
}) {
  const t = useTxt();
  const [note, setNote] = useState("");

  const buddyHosted = sessions.filter(s => !mine || s.id !== mine.id);

  return (
    <>
      <div className="buddy-intro">{t(
        "Broadcast your workout so buddies can join. Their sets count next to yours in real time.",
        "Broadcast the grind. Buddies in, sets stack up.",
        "Broadcast the grind, bestie. Squad sets stack up live."
      )}</div>

      {mine ? (
        <div className="profile-card live-mine">
          <div className="live-mine-hdr">
            <span className="live-dot" />
            <span>You're broadcasting</span>
            {mine.focus && <span className="live-focus-tag">{mine.focus}</span>}
          </div>
          {mine.note && <div className="live-note">"{mine.note}"</div>}
          <div className="live-progress-row">
            <div className="live-progress-block">
              <div className="live-progress-val">{mine.owner_sets_done}</div>
              <div className="live-progress-lbl">your sets</div>
            </div>
            {mine.participants.map(p => (
              <div key={p.user_id} className="live-progress-block">
                <div className="score-avatar small" style={{ background: p.primary_color ?? "var(--primary)" }}>
                  {(p.name ?? p.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="live-progress-val">{p.sets_done}</div>
                <div className="live-progress-lbl">{p.name ?? p.username}</div>
              </div>
            ))}
            {mine.participants.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--muted)", flex: 1, textAlign: "center" }}>
                Waiting for buddies to join…
              </div>
            )}
          </div>
          <button className="btn-primary live-end-btn" onClick={async () => {
            await endLiveSession();
            onToast("Live session ended");
          }}>
            <LogOut size={14} /> End live session
          </button>
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-section" style={{ margin: "0 0 8px" }}>Start a live session</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
            {workoutActive
              ? `Currently logging a ${workoutFocus ?? "workout"} — broadcast to your buddies.`
              : "Start a workout first (or right after), then click below to broadcast."}
          </div>
          <input
            className="field-input"
            placeholder="Add a note (e.g. 'Push day @ Iron Gym')"
            value={note}
            maxLength={140}
            onChange={e => setNote(e.target.value)}
          />
          <button
            className="btn-primary"
            style={{ marginTop: 10 }}
            onClick={async () => {
              await startLiveSession(note);
              setNote("");
              onToast("You're live!");
            }}
          >
            <Play size={14} /> Go live
          </button>
        </div>
      )}

      {workoutActive && mine && mine.owner_sets_done !== workoutDoneSets && (
        <div style={{ fontSize: 11, color: "var(--muted)", padding: "4px 12px" }}>
          (your live count auto-syncs with your active workout)
        </div>
      )}

      <div className="profile-section">Buddy broadcasts</div>
      {buddyHosted.length === 0 ? (
        <div className="empty" style={{ paddingTop: 0 }}>
          <div className="empty-label" style={{ fontSize: 12 }}>
            No buddies are live right now.
          </div>
        </div>
      ) : (
        buddyHosted.map(s => (
          <BuddyLiveCard
            key={s.id}
            session={s}
            onJoin={async () => {
              await joinLiveSession(s.id);
              await refreshLive();
              onToast(`Joined ${s.owner_name ?? s.owner_username}`);
            }}
            onOpenProfile={() => onOpenProfile(s.owner_id)}
          />
        ))
      )}
    </>
  );
}

function BuddyLiveCard({ session: s, onJoin, onOpenProfile }: {
  session: LiveSession;
  onJoin: () => Promise<void>;
  onOpenProfile: () => void;
}) {
  const accent = s.owner_primary_color ?? "var(--primary)";
  const initials = (s.owner_name ?? s.owner_username).slice(0, 2).toUpperCase();
  return (
    <div className="profile-card">
      <div className="buddy-row">
        <button
          type="button"
          className="buddy-row-clickable"
          onClick={onOpenProfile}
          aria-label={`View ${s.owner_name ?? s.owner_username}'s profile`}
        >
          <div className="score-avatar" style={{ background: accent }}>{initials}</div>
          <div className="buddy-row-main">
            <div className="buddy-row-name">
              <span className="live-dot" /> {s.owner_name ?? s.owner_username}
              {s.focus && <span className="live-focus-tag">{s.focus}</span>}
            </div>
            {s.note && <div className="buddy-row-handle">"{s.note}"</div>}
          </div>
        </button>
        <button className="buddy-pill-btn accept" onClick={onJoin}>
          <Play size={13} /> Join
        </button>
      </div>
      <div className="live-progress-row tight">
        <div className="live-progress-block">
          <div className="live-progress-val">{s.owner_sets_done}</div>
          <div className="live-progress-lbl">{s.owner_username} sets</div>
        </div>
        {s.participants.map(p => (
          <div key={p.user_id} className="live-progress-block">
            <div className="live-progress-val">{p.sets_done}</div>
            <div className="live-progress-lbl">{p.name ?? p.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

