import { useState, type ReactNode } from "react";
import { Zap, ClipboardList, Trophy, Heart, Brain, User, LogOut, Menu, X, Shield, Wrench, Users, Bell, MessageSquare, ChevronDown, HelpCircle, GraduationCap, MessagesSquare, Calendar, Settings } from "lucide-react";
import { fmtClock } from "../utils";
import { useTxt } from "../context/ToneContext";
import { useOnboarding } from "../context/OnboardingContext";

interface Props {
  active:       boolean;
  elapsed:      number;
  wStep:        number;
  historyCount: number;
  prCount:      number;
  coachCount:   number;
  buddyCount:   number;
  unreadNotif:  number;
  unreadChat?:  number;
  isTrainer?:   boolean;
  traineeCount?: number;
  assignmentCount?: number;
  tab:          string;
  setTab:       (t: string) => void;
  onLogout:     () => void;
  onLogoClick?: () => void;
  isAdmin?:     boolean;
  notifBell?:   ReactNode;
  onOpenFeedback?: () => void;
}

export default function AppHeader({ active, elapsed, wStep, historyCount, prCount, coachCount, buddyCount, unreadNotif, unreadChat = 0, isTrainer = false, traineeCount = 0, assignmentCount = 0, tab, setTab, onLogout, onLogoClick, isAdmin, notifBell, onOpenFeedback }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const t = useTxt();
  const { openWelcome } = useOnboarding();
  const workoutLabel = active ? "ACTIVE" : wStep > 0 ? "BUILD" : "WORKOUT";

  // Help/tour walks through the workout-wizard flow, so land the user on the
  // workout home screen first — otherwise the tour overlays don't match what's
  // visible behind them.
  const openHelp = () => {
    onLogoClick?.();
    openWelcome();
  };

  // `inMenuOnly` tabs don't render in the desktop .tabs row — only in the
  // hamburger drawer. Keeps the top row from getting overcrowded.
  const tabs = [
    { key: "workout",       Icon: Zap,           label: workoutLabel,  badge: null,                    inMenuOnly: false },
    { key: "history",       Icon: ClipboardList, label: "HISTORY",     badge: historyCount || null,    inMenuOnly: false },
    { key: "prs",           Icon: Trophy,        label: "PRs",         badge: prCount || null,         inMenuOnly: false },
    { key: "buddies",       Icon: Users,         label: "BUDDIES",     badge: buddyCount || null,      inMenuOnly: false },
    { key: "chat",          Icon: MessagesSquare, label: "CHAT",       badge: unreadChat || null,      inMenuOnly: false },
    { key: "regimes",       Icon: Calendar,      label: "REGIMES",     badge: assignmentCount || null, inMenuOnly: false },
    { key: "coaching",      Icon: GraduationCap, label: "COACHING",    badge: null,                    inMenuOnly: !isTrainer },
    { key: "trainees",      Icon: GraduationCap, label: "TRAINEES",    badge: traineeCount || null,    inMenuOnly: !isTrainer },
    { key: "health",        Icon: Heart,         label: "HEALTH",      badge: null,                    inMenuOnly: true },
    { key: "coach",         Icon: Brain,         label: "COACH",       badge: coachCount || null,      inMenuOnly: true },
    { key: "exercises",     Icon: Wrench,        label: "EXERCISES",   badge: null,                    inMenuOnly: true },
    { key: "notifications", Icon: Bell,          label: "NOTIFICATIONS", badge: unreadNotif || null,   inMenuOnly: true  },
    { key: "profile",       Icon: User,          label: "PROFILE",     badge: null,                    inMenuOnly: false },
    { key: "settings",      Icon: Settings,      label: "SETTINGS",    badge: null,                    inMenuOnly: true  },
  ];

  // Hamburger menu structure: top-level items (important) + collapsible groups.
  type MenuItem = { key: string };
  type MenuGroup = { id: string; label: string; items: MenuItem[] };
  type MenuEntry = MenuItem | MenuGroup;
  const isGroup = (e: MenuEntry): e is MenuGroup => "items" in e;

  const coachingItems: MenuItem[] = [{ key: "coaching" }, { key: "regimes" }];
  if (isTrainer) coachingItems.push({ key: "trainees" });
  const menuStructure: MenuEntry[] = [
    { key: "workout" },
    { id: "progress", label: "Progress", items: [{ key: "history" }, { key: "prs" }, { key: "coach" }, { key: "health" }] },
    { id: "social",   label: "Social",   items: [{ key: "buddies" }, { key: "chat" }, { key: "notifications" }] },
    { id: "coaching", label: isTrainer ? "Coaching" : "Coaching & Plans", items: coachingItems },
    { key: "exercises" },
    { key: "profile" },
    { key: "settings" },
  ];

  const tabByKey = Object.fromEntries(tabs.map(t => [t.key, t]));

  // Auto-expand whichever group contains the active tab so the user can see where they are.
  const groupForTab = (key: string) =>
    menuStructure.find((e): e is MenuGroup => isGroup(e) && e.items.some(i => i.key === key))?.id;

  const handleTabSelect = (key: string) => {
    setTab(key);
    setMenuOpen(false);
  };

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !(prev[id] ?? id === groupForTab(tab)) }));

  const isGroupOpen = (id: string) => openGroups[id] ?? id === groupForTab(tab);

  const renderMenuItem = (key: string, nested = false) => {
    const def = tabByKey[key];
    if (!def) return null;
    const { Icon, label, badge } = def;
    return (
      <button
        key={key}
        className={`mobile-nav-item${nested ? " mobile-nav-item-nested" : ""}${tab === key ? " active" : ""}`}
        onClick={() => handleTabSelect(key)}
      >
        <Icon size={18} />
        <span>{label}</span>
        {badge !== null && <span className="tab-badge">{badge}</span>}
      </button>
    );
  };

  const activeTabDef = tabs.find(t => t.key === tab);

  return (
    <>
      <div className="hdr">
        <div className="hdr-top">
          <button
            type="button"
            className="hdr-brand"
            onClick={onLogoClick}
            aria-label="Go to start"
          >
            <div className="logo-img" role="img" aria-label="Gamgee" />
            <div className="hdr-brand-text">
              <div className="logo-name">GAMGEE</div>
              <div className="logo-sub">{t("Workout Tracker", "Built Different (Allegedly)", "She's Built That Way")}</div>
            </div>
          </button>
          {active
            ? <div className="timer-pill"><Zap size={14} />{fmtClock(elapsed)}</div>
            : <div className="hdr-current-tab">{activeTabDef?.label}</div>
          }
          <div className="hdr-actions">
            {notifBell}
            <button
              className={`logout-btn hdr-settings-btn${tab === "settings" ? " active" : ""}`}
              onClick={() => setTab("settings")}
              title={t("Settings", "Settings", "Settings")}
              aria-label="Settings"
            >
              <Settings size={15} />
              <span className="logout-label">Settings</span>
            </button>
            <button className="logout-btn hdr-help-btn" onClick={openHelp} title={t("Help & tour", "Help & tour", "Help & tour")}>
              <HelpCircle size={15} />
              <span className="logout-label">Help</span>
            </button>
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
        </div>
        <div className="tabs">
          {tabs.filter(t => !t.inMenuOnly).map(({ key, Icon, label, badge }) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              <Icon size={12} />
              <span className="tab-label">{label}</span>
              {badge !== null && <span className="tab-badge">{badge}</span>}
            </button>
          ))}
        </div>
        {menuOpen && (
          <nav className="mobile-nav">
            {menuStructure.map(entry => {
              if (!isGroup(entry)) return renderMenuItem(entry.key);
              const open = isGroupOpen(entry.id);
              const groupBadge = entry.items.reduce((sum, i) => {
                const b = tabByKey[i.key]?.badge;
                return sum + (typeof b === "number" ? b : 0);
              }, 0);
              return (
                <div key={entry.id} className={`mobile-nav-group${open ? " open" : ""}`}>
                  <button
                    className="mobile-nav-item mobile-nav-group-header"
                    onClick={() => toggleGroup(entry.id)}
                    aria-expanded={open}
                  >
                    <span className="mobile-nav-group-label">{entry.label}</span>
                    {groupBadge > 0 && !open && <span className="tab-badge">{groupBadge}</span>}
                    <ChevronDown size={18} className="mobile-nav-chevron" />
                  </button>
                  {open && (
                    <div className="mobile-nav-group-items">
                      {entry.items.map(i => renderMenuItem(i.key, true))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="mobile-nav-divider" />
            <button
              className="mobile-nav-item"
              onClick={() => { setMenuOpen(false); openHelp(); }}
            >
              <HelpCircle size={18} />
              <span>Help &amp; tour</span>
            </button>
            {onOpenFeedback && (
              <button
                className="mobile-nav-item"
                onClick={() => { setMenuOpen(false); onOpenFeedback(); }}
              >
                <MessageSquare size={18} />
                <span>Send Feedback</span>
              </button>
            )}
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
