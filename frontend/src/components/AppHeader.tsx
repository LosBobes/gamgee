import { useState } from "react";
import { Zap, ClipboardList, Trophy, Heart, Brain, User, LogOut, Menu, X, Shield, Wrench } from "lucide-react";
import { fmtClock } from "../utils";
import { useTxt } from "../context/ToneContext";

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
  isAdmin?:     boolean;
}

export default function AppHeader({ active, elapsed, wStep, historyCount, prCount, coachCount, tab, setTab, onLogout, isAdmin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTxt();
  const workoutLabel = active ? "ACTIVE" : wStep > 0 ? "BUILD" : "WORKOUT";

  const tabs = [
    { key: "workout",   Icon: Zap,           label: workoutLabel,  badge: null },
    { key: "history",   Icon: ClipboardList, label: "HISTORY",     badge: historyCount || null },
    { key: "prs",       Icon: Trophy,        label: "PRs",         badge: prCount || null },
    { key: "health",    Icon: Heart,         label: "HEALTH",      badge: null },
    { key: "coach",     Icon: Brain,         label: "COACH",       badge: coachCount || null },
    { key: "exercises", Icon: Wrench,        label: "EXERCISES",   badge: null },
    { key: "profile",   Icon: User,          label: "PROFILE",     badge: null },
  ];

  const handleTabSelect = (key: string) => {
    setTab(key);
    setMenuOpen(false);
  };

  const activeTabDef = tabs.find(t => t.key === tab);

  return (
    <>
      <div className="hdr">
        <div className="hdr-top">
          <div className="hdr-brand">
            <div className="logo-img" role="img" aria-label="Gamgee" />
            <div className="hdr-brand-text">
              <div className="logo-name">GAMGEE</div>
              <div className="logo-sub">{t("Workout Tracker", "Built Different (Allegedly)")}</div>
            </div>
          </div>
          {active
            ? <div className="timer-pill"><Zap size={14} />{fmtClock(elapsed)}</div>
            : <div className="hdr-current-tab">{activeTabDef?.label}</div>
          }
          {isAdmin && (
            <a href="/admin" className="logout-btn" title="Admin panel" style={{ textDecoration: "none" }}>
              <Shield size={15} />
              <span className="logout-label">Admin</span>
            </a>
          )}
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={15} />
            <span className="logout-label">Logout</span>
          </button>
          <button
            className={`hamburger-btn${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className="tabs">
          {tabs.map(({ key, Icon, label, badge }) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              <Icon size={12} />
              <span className="tab-label">{label}</span>
              {badge !== null && <span className="tab-badge">{badge}</span>}
            </button>
          ))}
        </div>
        {menuOpen && (
          <nav className="mobile-nav">
            {tabs.map(({ key, Icon, label, badge }) => (
              <button
                key={key}
                className={`mobile-nav-item${tab === key ? " active" : ""}`}
                onClick={() => handleTabSelect(key)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {badge !== null && <span className="tab-badge">{badge}</span>}
              </button>
            ))}
            <div className="mobile-nav-divider" />
            {isAdmin && (
              <a
                href="/admin"
                className="mobile-nav-item mobile-nav-admin"
                onClick={() => setMenuOpen(false)}
                style={{ textDecoration: "none" }}
              >
                <Shield size={18} />
                <span>Admin</span>
              </a>
            )}
            <button
              className="mobile-nav-item mobile-nav-logout"
              onClick={() => { setMenuOpen(false); onLogout(); }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
        )}
      </div>
      {menuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)} />
      )}
    </>
  );
}
