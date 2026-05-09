import { Zap, ClipboardList, Trophy, Brain, User } from "lucide-react";
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
  const workoutStatus = active ? "ACTIVE" : wStep > 0 ? "BUILDING" : "WORKOUT";

  const tabs = [
    { key: "workout", Icon: Zap,           label: workoutStatus },
    { key: "history", Icon: ClipboardList, label: `HISTORY (${historyCount})` },
    { key: "prs",     Icon: Trophy,        label: `PRs (${prCount})` },
    { key: "coach",   Icon: Brain,         label: `COACH (${coachCount})` },
    { key: "profile", Icon: User,          label: "PROFILE" },
  ];

  return (
    <div className="hdr">
      <div className="hdr-top">
        <div>
          <img src="/logo.png" alt="Gamgee" className="logo-img" />
          <div className="logo-sub">Workout Tracker</div>
        </div>
        {active && <div className="timer-pill"><Zap size={14} />{fmtClock(elapsed)}</div>}
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
      <div className="tabs">
        {tabs.map(({ key, Icon, label }) => (
          <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            <Icon size={11} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
