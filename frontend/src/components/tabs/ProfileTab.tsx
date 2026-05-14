import { useState, useEffect, useCallback, useRef } from "react";
import { User, Settings } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { MI } from "../../data/muscles";
import { EM } from "../../data/exercises";
import { useTxt, useToneMode } from "../../context/ToneContext";

interface Props {
  username:     string | null;
  name:         string | null;
  history:      WorkoutSession[];
  isAdmin?:     boolean;
  onOpenSettings: () => void;
}

export default function ProfileTab({ username, name, history, isAdmin, onOpenSettings }: Props) {
  const t = useTxt();

  const settingsButton = (
    <button
      type="button"
      className="auth-toggle"
      onClick={onOpenSettings}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      <Settings size={14} />
      <span>{t("Open Settings", "Open Settings", "Open Settings")}</span>
    </button>
  );

  if (history.length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty">
          <div className="empty-icon"><User size={40} /></div>
          <div className="empty-label">
            {t(
              "Log your first workout to build your profile",
              "Drop your first session and this page goes hard",
              "Log your first session, bestie. This page goes off.",
            )}
          </div>
        </div>
        <div className="profile-card">{settingsButton}</div>
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

      <div className="profile-section">{t("Settings", "Settings", "Settings")}</div>
      <div className="profile-card">{settingsButton}</div>

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
