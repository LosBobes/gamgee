import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { MI } from "../../data/muscles";
import { EM } from "../../data/exercises";

interface Props {
  username: string | null;
  history:  WorkoutSession[];
}

export default function ProfileTab({ username, history }: Props) {
  if (history.length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon">👤</div><div className="empty-label">Log your first workout to build your profile</div></div>
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
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace" }}>
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
    </div>
  );
}
