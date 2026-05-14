import { useState, useEffect, useCallback, useRef } from "react";
import { User, Bell, BellOff } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { MI } from "../../data/muscles";
import { EM } from "../../data/exercises";
import { useTxt, useToneMode, type ToneMode } from "../../context/ToneContext";
import {
  pushSupported, fetchPushPublicKey, getExistingSubscription,
  subscribePush, unsubscribePush,
} from "../../push";

interface Props {
  username:        string | null;
  name:            string | null;
  email:           string | null;
  history:         WorkoutSession[];
  token:           string | null;
  primaryColor:    string;
  onColorChange:   (color: string) => void;
  onProfileUpdate: (name: string | null, email: string | null) => void;
  toneMode:        ToneMode;
  onToneChange:    (mode: ToneMode) => void;
  isAdmin?:        boolean;
  authFetch:       (url: string, opts?: RequestInit) => Promise<Response>;
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

function ToneToggle({ toneMode, onToneChange }: { toneMode: ToneMode; onToneChange: (m: ToneMode) => void }) {
  const proLabel = toneMode === "pro" ? "Professional"
                 : toneMode === "bro" ? "Boring Mode"
                 :                       "Neutral";
  const tones: Array<{ id: ToneMode; label: string }> = [
    { id: "pro", label: proLabel },
    { id: "bro", label: "BroScience" },
    { id: "grl", label: "Grl Pwr"  },
  ];
  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        App Tone
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {tones.map(({ id, label }) => {
          const active = toneMode === id;
          return (
            <button
              key={id}
              onClick={() => onToneChange(id)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#000" : "var(--muted)",
                border: active ? "none" : "1px solid var(--border)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorPicker({ color, onChange, token }: { color: string; onChange: (c: string) => void; token: string | null }) {
  const [saving, setSaving] = useState(false);
  const t = useTxt();

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
        {saving ? "Saving…" : t("Accent color", "Your vibe", "Your aura")}
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

function EditProfileCard({ name, email, token, onSave }: {
  name: string | null;
  email: string | null;
  token: string | null;
  onSave: (name: string | null, email: string | null) => void;
}) {
  const [nameVal,  setNameVal]  = useState(name ?? "");
  const [emailVal, setEmailVal] = useState(email ?? "");
  const [err,      setErr]      = useState("");
  const [saving,   setSaving]   = useState(false);
  const [ok,       setOk]       = useState(false);

  useEffect(() => { setNameVal(name ?? ""); }, [name]);
  useEffect(() => { setEmailVal(email ?? ""); }, [email]);

  const changed = nameVal.trim() !== (name ?? "") || emailVal.trim() !== (email ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body:    JSON.stringify({ name: nameVal.trim(), email: emailVal.trim() || null }),
      });
      if (!res.ok) { setErr((await res.json()).detail ?? "Failed"); return; }
      const data = await res.json();
      onSave(data.name ?? null, data.email ?? null);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-card">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          className="field-input"
          type="text"
          placeholder="Display name"
          value={nameVal}
          onChange={e => { setNameVal(e.target.value); setOk(false); }}
          maxLength={100}
          required
        />
        <input
          className="field-input"
          type="email"
          placeholder="Email address"
          value={emailVal}
          onChange={e => { setEmailVal(e.target.value); setOk(false); }}
          maxLength={254}
        />
        {err && <p className="auth-err">{err}</p>}
        {ok  && <p style={{ color: "var(--green)", fontSize: 12, margin: 0 }}>Saved.</p>}
        <button
          type="submit"
          className="btn-primary"
          disabled={!changed || saving || !nameVal.trim()}
          style={{ width: "auto" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
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
    if (next.length < 12) { setErr("New password must be at least 12 characters"); return; }
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
            className="field-input"
            type="password"
            placeholder="Current password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
          <input
            className="field-input"
            type="password"
            placeholder="New password (min 12 chars)"
            value={next}
            onChange={e => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
          <input
            className="field-input"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {err && <p className="auth-err">{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, width: "auto" }}>
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

function PushToggleCard({ authFetch }: { authFetch: Props["authFetch"] }) {
  const t = useTxt();
  // null = still probing; otherwise concrete state.
  const [enabled,   setEnabled]   = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        if (!cancelled) { setAvailable(false); setEnabled(false); }
        return;
      }
      const [{ enabled: serverOn }, sub] = await Promise.all([
        fetchPushPublicKey(authFetch),
        getExistingSubscription(),
      ]);
      if (cancelled) return;
      setAvailable(serverOn);
      setEnabled(!!sub && serverOn);
    })().catch(() => {
      if (!cancelled) { setAvailable(false); setEnabled(false); }
    });
    return () => { cancelled = true; };
  }, [authFetch]);

  const toggle = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribePush(authFetch);
        setEnabled(false);
      } else {
        await subscribePush(authFetch);
        setEnabled(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update push settings.");
    } finally {
      setBusy(false);
    }
  };

  if (available === false) {
    return (
      <div className="profile-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BellOff size={16} style={{ color: "var(--muted)" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {t("Push notifications", "Push notifications", "Push notifications")}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {pushSupported()
                ? "Not enabled on this server"
                : "Your browser doesn't support push"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {enabled ? <Bell size={16} style={{ color: "var(--primary)" }} /> : <BellOff size={16} style={{ color: "var(--muted)" }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {t("Push notifications", "Push notifications", "Push notifications")}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {enabled
                ? t("On for this device", "Lit on this device", "Live on this device")
                : t("Get pinged when buddies lift, motivate, or set PRs",
                    "Get pinged when bros lift, hype, or hit PRs",
                    "Get pinged when besties lift, hype, or hit PRs")}
            </div>
          </div>
        </div>
        <button
          className={enabled ? "auth-toggle" : "btn-primary"}
          style={{ whiteSpace: "nowrap" }}
          onClick={toggle}
          disabled={busy || enabled === null}
        >
          {busy ? "…" : enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {err && <p className="auth-err" style={{ marginTop: 8, marginBottom: 0 }}>{err}</p>}
    </div>
  );
}


export default function ProfileTab({ username, name, email, history, token, primaryColor, onColorChange, onProfileUpdate, toneMode, onToneChange, isAdmin, authFetch }: Props) {
  const t = useTxt();

  if (history.length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon"><User size={40} /></div><div className="empty-label">{t("Log your first workout to build your profile", "Drop your first session and this page goes hard", "Log your first session, bestie. This page goes off.")}</div></div>
        <div className="profile-section">{t("Profile", "Profile")}</div>
        <EditProfileCard name={name} email={email} token={token} onSave={onProfileUpdate} />
        <div className="profile-section">{t("Appearance", "Appearance")}</div>
        <ToneToggle toneMode={toneMode} onToneChange={onToneChange} />
        <ColorPicker color={primaryColor} onChange={onColorChange} token={token} />
        <div className="profile-section">{t("Notifications", "Notifications")}</div>
        <PushToggleCard authFetch={authFetch} />
        <div className="profile-section">{t("Account", "Account")}</div>
        <ChangePasswordCard token={token} />
        <Duck isAdmin={isAdmin} />
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

  const displayName = name ?? username ?? "—";
  const initials = displayName !== "—" ? displayName.slice(0, 2).toUpperCase() : "?";

  const fmtVol = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;

  return (
    <div className="tab-anim">
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{displayName}</div>
          {username && <div className="profile-username">@{username}</div>}
          {memberSince && <div className="profile-since">MEMBER SINCE {memberSince.toUpperCase()}</div>}
        </div>
      </div>

      <div className="profile-stats-grid">
        {[
          { v: history.length,             l: t("Workouts",    "Sessions",    "Sessions Served") },
          { v: fmtVol(totalVolume),         l: t("Vol Lifted",  "Iron Moved",  "Volume Slayed")   },
          { v: fmtDur(totalTime),           l: t("Time Logged", "Time In",     "Time Thriving")   },
          { v: totalSets.toLocaleString(),  l: t("Total Sets",  "Sets Fired",  "Sets Served")     },
        ].map(({ v, l }) => (
          <div key={l} className="profile-stat">
            <div className="profile-stat-val">{v}</div>
            <div className="profile-stat-lbl">{l}</div>
          </div>
        ))}
      </div>

      <div className="profile-section">{t("Activity: Last 16 Weeks", "Grind Log: Last 16 Weeks", "Glow-Up Log: Last 16 Weeks")}</div>
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
          <div className="profile-section">{t("Most Logged Exercises", "Your Go-To Moves", "Your Signature Moves")}</div>
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
          <div className="profile-section">{t("Muscle Group Focus", "Where You Put In Work", "Where the Gains Live")}</div>
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

      <div className="profile-section">{t("Profile", "Profile")}</div>
      <EditProfileCard name={name} email={email} token={token} onSave={onProfileUpdate} />

      <div className="profile-section">{t("Appearance", "Appearance")}</div>
      <ToneToggle toneMode={toneMode} onToneChange={onToneChange} />
      <ColorPicker color={primaryColor} onChange={onColorChange} token={token} />

      <div className="profile-section">{t("Notifications", "Notifications")}</div>
      <PushToggleCard authFetch={authFetch} />

      <div className="profile-section">{t("Account", "Account")}</div>
      <ChangePasswordCard token={token} />

      <Duck isAdmin={isAdmin} />
    </div>
  );
}

const DUCK_MSGS = [
  "QUACK",
  "You found the duck. +1 to all lifts.",
  "The duck has spoken. Lift heavy.",
  "QUACK QUACK (that's bro for 'good job')",
  "The Swoly Bible has a duck chapter. Thou shalt quack.",
  "Rubber ducky, you're the one making gains so much fun.",
  "The iron duck never lies.",
  "Disciples of the Swoly Duck do not skip leg day.",
  "Every rep is a quack for the person you want to be.",
];

const GRL_DUCK_MSGS = [
  "QUACK, bestie.",
  "You found the duck. Her aura just went up.",
  "Duck math: every quack = +1 PR.",
  "The duck girlbossed too close to the sun. Now she's here.",
  "Iconic duck behavior. Carry on.",
  "She's not just a duck. She's the moment.",
  "Manifesting heavier lifts and softer rest days.",
  "Duck says: hydrate, lift, glow.",
  "Plot twist: the duck was the main character.",
];

function Duck({ isAdmin }: { isAdmin?: boolean }) {
  const mode = useToneMode();
  const [msg, setMsg]       = useState<string | null>(null);
  const [bounce, setBounce] = useState(false);
  const msgTimer    = useRef<number | null>(null);
  const bounceTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (msgTimer.current)    window.clearTimeout(msgTimer.current);
    if (bounceTimer.current) window.clearTimeout(bounceTimer.current);
  }, []);

  const handleDuck = useCallback(() => {
    const pool = mode === "grl" ? GRL_DUCK_MSGS : DUCK_MSGS;
    setMsg(pool[Math.floor(Math.random() * pool.length)]);
    setBounce(true);
    if (bounceTimer.current) window.clearTimeout(bounceTimer.current);
    if (msgTimer.current)    window.clearTimeout(msgTimer.current);
    bounceTimer.current = window.setTimeout(() => setBounce(false), 500);
    msgTimer.current    = window.setTimeout(() => setMsg(null), 6000);
  }, [mode]);

  return (
    <div style={{ textAlign: "center" }}>
      {msg && <div className="health-toast">{msg}</div>}
      <button className={`duck-btn${isAdmin ? " admin" : ""}${bounce ? " bounce" : ""}`} onClick={handleDuck} aria-label="duck">
        <DuckIcon size={22} />
      </button>
    </div>
  );
}

function DuckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="var(--primary)" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      {/* body */}
      <path d="M2 18C2 14 6 12 11 12C16 12 20 14 20 18C20 21 16 23 11 23C6 23 2 21 2 18Z" />
      {/* tail curving up at back */}
      <path d="M2 15C1 12 2 9 4 8" />
      {/* head */}
      <circle cx="17" cy="9" r="3" />
      {/* beak */}
      <path d="M20 8.5L23 9L20 10.5" />
      {/* eye */}
      <circle cx="18.5" cy="8" r=".5" fill="var(--primary)" stroke="none" />
      {/* wing */}
      <path d="M6 18C9 16 13 16 16 18" />
    </svg>
  );
}
