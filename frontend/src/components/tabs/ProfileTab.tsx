import { useState } from "react";
import { User } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { MI } from "../../data/muscles";
import { EM } from "../../data/exercises";

interface Props {
  username:      string | null;
  history:       WorkoutSession[];
  token:         string | null;
  primaryColor:  string;
  onColorChange: (color: string) => void;
}

const PALETTE = [
  "#28D1FF", // cyan (default)
  "#4CA87C", // green
  "#8C70D8", // purple
  "#E8C547", // gold
  "#FF6B6B", // coral
  "#FF9F43", // orange
  "#5C90C0", // steel blue
  "#E879A0", // pink
];

function ColorPicker({ color, onChange, token }: { color: string; onChange: (c: string) => void; token: string | null }) {
  const [saving, setSaving] = useState(false);

  const save = async (c: string) => {
    onChange(c);
    setSaving(true);
    try {
      await fetch("/api/auth/preferences", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body:    JSON.stringify({ primary_color: c }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-card">
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {saving ? "Saving…" : "Accent color"}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {PALETTE.map(c => (
          <button
            key={c}
            onClick={() => save(c)}
            title={c}
            style={{
              width: 30, height: 30, borderRadius: "50%", background: c, padding: 0,
              border: "none", cursor: "pointer", flexShrink: 0,
              outline: c.toLowerCase() === color.toLowerCase() ? `3px solid ${c}` : "none",
              outlineOffset: 3,
              boxShadow: c.toLowerCase() === color.toLowerCase() ? "0 0 0 1px var(--border)" : "none",
              transition: "outline 0.15s, box-shadow 0.15s",
            }}
          />
        ))}
        <label
          title="Custom color"
          style={{
            width: 30, height: 30, borderRadius: "50%", border: "2px dashed var(--border)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, overflow: "hidden",
            outline: !PALETTE.some(c => c.toLowerCase() === color.toLowerCase()) ? `3px solid ${color}` : "none",
            outlineOffset: 3,
          }}
        >
          <input
            type="color"
            value={color}
            onChange={e => save(e.target.value)}
            style={{ width: 40, height: 40, border: "none", padding: 0, cursor: "pointer", opacity: 0, position: "absolute" }}
          />
          <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1, pointerEvents: "none" }}>+</span>
        </label>
      </div>
    </div>
  );
}

function ChangePasswordCard({ token }: { token: string | null }) {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setErr(""); setOk(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk(false);
    if (next !== confirm) { setErr("New passwords do not match"); return; }
    if (next.length < 8)  { setErr("New password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ current_password: current, new_password: next }),
      });
      if (!res.ok) { setErr((await res.json()).detail ?? "Failed"); return; }
      setOk(true);
      reset();
      setOpen(false);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-card" style={{ marginTop: 12 }}>
      {ok && <p style={{ color: "var(--green)", fontSize: 12, marginBottom: 8 }}>Password changed successfully.</p>}
      {!open ? (
        <button className="auth-toggle" style={{ width: "100%", textAlign: "left" }} onClick={() => { setOpen(true); setOk(false); }}>
          Change Password
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="password"
            placeholder="Current password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={next}
            onChange={e => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {err && <p className="auth-err">{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="auth-submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Saving…" : "Save"}
            </button>
            <button type="button" className="auth-toggle" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ProfileTab({ username, history, token, primaryColor, onColorChange }: Props) {
  if (history.length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon"><User size={40} /></div><div className="empty-label">Log your first workout to build your profile</div></div>
        <div className="profile-section">Appearance</div>
        <ColorPicker color={primaryColor} onChange={onColorChange} token={token} />
        <div className="profile-section">Account</div>
        <ChangePasswordCard token={token} />
      </div>
    );
  }

  const totalVolume = history.reduce((a, w) =>
    a + w.exercises.reduce((b, ex) => ex.type !== "strength" ? b :
      b + ex.sets.reduce((c, s) => c + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0), 0);

  const totalSets = history.reduce((a, w) =>
    a + w.exercises.reduce((b, ex) => b + ex.sets.length, 0), 0);

  const totalTime = history.reduce((a, w) => a + w.duration, 0);

  const memberSince = history.length > 0
    ? fmtDate(history[history.length - 1].date)
    : null;

  // Top exercises by frequency
  const exFreq: Record<string, number> = {};
  history.forEach(w => w.exercises.forEach(ex => {
    exFreq[ex.name] = (exFreq[ex.name] || 0) + 1;
  }));
  const topExercises = Object.entries(exFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Muscle group frequency
  const groupFreq: Record<string, number> = {};
  history.forEach(w => w.exercises.forEach(ex => {
    const m = EM[ex.id];
    if (!m) return;
    m.p.forEach(mid => {
      if (MI[mid]) groupFreq[MI[mid].g] = (groupFreq[MI[mid].g] || 0) + 1;
    });
  }));
  const topGroups = Object.entries(groupFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGroupCount = topGroups[0]?.[1] ?? 1;

  // Activity heatmap — last 16 weeks
  const workoutDays = new Set(history.map(w => w.date.slice(0, 10)));
  const now   = new Date();
  const weeks = Array.from({ length: 16 }, (_, wi) => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (15 - wi) * 7 - now.getDay());
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      if (workoutDays.has(day.toISOString().slice(0, 10))) count++;
    }
    return count;
  });

  const initials = username ? username.slice(0, 2).toUpperCase() : "?";

  const fmtVol = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;

  return (
    <div className="tab-anim">
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{username ?? "—"}</div>
          {memberSince && <div className="profile-since">MEMBER SINCE {memberSince.toUpperCase()}</div>}
        </div>
      </div>

      <div className="profile-stats-grid">
        {[
          { v: history.length,             l: "Workouts"    },
          { v: fmtVol(totalVolume),         l: "Vol Lifted"  },
          { v: fmtDur(totalTime),           l: "Time Logged" },
          { v: totalSets.toLocaleString(),  l: "Total Sets"  },
        ].map(({ v, l }) => (
          <div key={l} className="profile-stat">
            <div className="profile-stat-val">{v}</div>
            <div className="profile-stat-lbl">{l}</div>
          </div>
        ))}
      </div>

      <div className="profile-section">Activity — Last 16 Weeks</div>
      <div className="profile-card">
        <div className="heatmap-grid">
          {weeks.map((count, i) => {
            const shade = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
            return (
              <div key={i} className={`heatmap-cell heatmap-${shade}`} title={`${count} workout${count !== 1 ? "s" : ""}`} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "var(--muted)", fontFamily: "'Nunito',sans-serif" }}>
          <span>16 weeks ago</span><span>this week</span>
        </div>
      </div>

      {topExercises.length > 0 && (
        <>
          <div className="profile-section">Most Logged Exercises</div>
          <div className="profile-card">
            {topExercises.map(([name, count]) => (
              <div key={name} className="top-ex-row">
                <span className="top-ex-name">{name}</span>
                <span className="top-ex-count">{count}×</span>
              </div>
            ))}
          </div>
        </>
      )}

      {topGroups.length > 0 && (
        <>
          <div className="profile-section">Muscle Group Focus</div>
          <div className="profile-card">
            {topGroups.map(([group, count]) => (
              <div key={group} className="muscle-bar-row">
                <span className="muscle-bar-label">{group}</span>
                <div className="muscle-bar-track">
                  <div className="muscle-bar-fill" style={{ width: `${Math.round((count / maxGroupCount) * 100)}%` }} />
                </div>
                <span className="muscle-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="profile-section">Appearance</div>
      <ColorPicker color={primaryColor} onChange={onColorChange} token={token} />

      <div className="profile-section">Account</div>
      <ChangePasswordCard token={token} />
    </div>
  );
}
