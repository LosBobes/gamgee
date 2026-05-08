import { fmtClock } from "../utils";

interface Props {
  active:       boolean;
  elapsed:      number;
  wStep:        number;
  historyCount: number;
  prCount:      number;
  coachCount:   number;
  tab:          string;
  setTab:       (t: string) => void;
  onLogout:     () => void;
}

export default function AppHeader({ active, elapsed, wStep, historyCount, prCount, coachCount, tab, setTab, onLogout }: Props) {
  const workoutLabel = active ? "⚡ ACTIVE" : wStep > 0 ? "⚡ BUILDING" : "⚡ WORKOUT";

  const tabs = [
    { key: "workout", label: workoutLabel },
    { key: "history", label: `📋 HISTORY (${historyCount})` },
    { key: "prs",     label: `🏆 PRs (${prCount})` },
    { key: "coach",   label: `🧠 COACH (${coachCount})` },
  ];

  return (
    <div className="hdr">
      <div className="hdr-top">
        <div>
          <div className="logo">⚡ IRON LOG</div>
          <div className="logo-sub">Workout Tracker</div>
        </div>
        {active && <div className="timer-pill">{fmtClock(elapsed)}</div>}
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
      <div className="tabs">
        {tabs.map(({ key, label }) => (
          <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
