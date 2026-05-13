import { useEffect, useMemo, useState } from "react";
import {
  Bell, Check, Trash2, Trophy, Zap, Send, UserPlus, Users, Dumbbell,
  CheckCheck, MessageSquare, GraduationCap, Calendar,
} from "lucide-react";
import type { AppNotification, NotificationKind } from "../../types";
import { useTxt } from "../../context/ToneContext";

interface Props {
  notifications:  AppNotification[];
  unreadCount:    number;
  onMarkRead:     (id: number) => Promise<void>;
  onMarkAll:      () => Promise<void>;
  onDelete:       (id: number) => Promise<void>;
  onGoToBuddies:  () => void;
  refresh:        () => Promise<void>;
  authFetch:      (url: string, opts?: RequestInit) => Promise<Response>;
}

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  buddy_request:  UserPlus,
  buddy_accepted: Users,
  workout_done:   Dumbbell,
  pr_set:         Trophy,
  motivate:       Send,
  live_started:   Zap,
  live_joined:    Users,
  live_ended:     Zap,
  chat_message:   MessageSquare,
  trainer_link_request:  GraduationCap,
  trainer_link_accepted: GraduationCap,
  regime_assigned: Calendar,
};

const KIND_LABEL: Record<NotificationKind, string> = {
  buddy_request:  "Buddy request",
  buddy_accepted: "Buddy accepted",
  workout_done:   "Workout done",
  pr_set:         "New PR",
  motivate:       "Motivation",
  live_started:   "Live workout",
  live_joined:    "Joined live",
  live_ended:     "Live ended",
  chat_message:   "New message",
  trainer_link_request:  "Coaching request",
  trainer_link_accepted: "Coaching accepted",
  regime_assigned: "Plan assigned",
};

type Filter = "all" | "unread";
const KINDS: NotificationKind[] = [
  "workout_done", "pr_set", "motivate",
  "buddy_request", "buddy_accepted",
  "live_started", "live_joined", "live_ended",
  "chat_message", "trainer_link_request", "trainer_link_accepted", "regime_assigned",
];

export default function NotificationsTab({
  notifications, unreadCount,
  onMarkRead, onMarkAll, onDelete, onGoToBuddies, refresh, authFetch,
}: Props) {
  const t = useTxt();
  const [filter, setFilter]   = useState<Filter>("all");
  const [kindSel, setKindSel] = useState<NotificationKind | "all">("all");
  // Full history — bell only loads the latest 30; the history page asks for more.
  const [history, setHistory] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authFetch("/api/notifications?limit=200")
      .then(r => r.ok ? r.json() : [])
      .then((data: AppNotification[]) => {
        if (!cancelled) setHistory(data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    refresh();
    return () => { cancelled = true; };
  }, [authFetch, refresh]);

  // Always prefer the freshest data from props for items we already have
  // (so optimistic mark-read updates propagate without a re-fetch).
  const merged = useMemo(() => {
    const propsById = new Map(notifications.map(n => [n.id, n]));
    const base = history ?? notifications;
    return base.map(n => propsById.get(n.id) ?? n);
  }, [history, notifications]);

  const filtered = useMemo(() => {
    return merged
      .filter(n => filter === "all" ? true : !n.read)
      .filter(n => kindSel === "all" ? true : n.kind === kindSel);
  }, [merged, filter, kindSel]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await onMarkRead(n.id);
    if ([
      "buddy_request", "buddy_accepted", "motivate",
      "live_started", "live_joined", "workout_done", "pr_set", "live_ended",
    ].includes(n.kind)) {
      onGoToBuddies();
    }
  };

  const totalCount   = merged.length;
  const unreadInList = merged.filter(n => !n.read).length;

  return (
    <div className="tab-anim">
      <div className="notif-page-hdr">
        <div>
          <div className="notif-page-title">
            <Bell size={16} /> {t("Notification dashboard", "Notification dashboard", "Notification dashboard")}
          </div>
          <div className="notif-page-sub">
            {totalCount === 0
              ? t("Nothing here yet", "Nothing yet", "Nothing yet, bestie")
              : `${totalCount} total${unreadInList > 0 ? ` · ${unreadInList} unread` : ""}`}
          </div>
        </div>
        {unreadCount > 0 && (
          <button className="btn-primary notif-page-action" onClick={() => onMarkAll()}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="notif-filter-row">
        <button
          className={`notif-chip${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({merged.length})
        </button>
        <button
          className={`notif-chip${filter === "unread" ? " active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadInList})
        </button>
      </div>

      <div className="notif-filter-row">
        <button
          className={`notif-chip small${kindSel === "all" ? " active" : ""}`}
          onClick={() => setKindSel("all")}
        >
          Any type
        </button>
        {KINDS.map(k => {
          const count = merged.filter(n => n.kind === k).length;
          if (count === 0) return null;
          const Icon = KIND_ICON[k];
          return (
            <button
              key={k}
              className={`notif-chip small${kindSel === k ? " active" : ""}`}
              onClick={() => setKindSel(k)}
            >
              <Icon size={11} /> {KIND_LABEL[k]} ({count})
            </button>
          );
        })}
      </div>

      {loading && history === null && (
        <div className="empty"><div className="empty-label">Loading…</div></div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><Bell size={40} /></div>
          <div className="empty-label">
            {filter === "unread"
              ? t("No unread notifications", "All caught up", "All caught up, bestie")
              : t("No notifications yet — when buddies lift, you'll see it here.",
                  "Nothing yet. Get some buddies lifting.",
                  "Nothing yet. Recruit some besties.")}
          </div>
        </div>
      )}

      {groups.map(({ label, items }) => (
        <div key={label} className="notif-page-group">
          <div className="notif-page-group-label">{label}</div>
          {items.map(n => {
            const Icon = KIND_ICON[n.kind] ?? Bell;
            return (
              <div
                key={n.id}
                className={`notif-page-item${n.read ? "" : " unread"}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-icon"><Icon size={14} /></div>
                <div className="notif-body">
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-meta">
                    {KIND_LABEL[n.kind] ?? n.kind} · {fmtAbsolute(n.created_at)}
                  </div>
                </div>
                <div className="notif-page-actions">
                  {!n.read && (
                    <button
                      className="notif-icon-btn"
                      onClick={e => { e.stopPropagation(); onMarkRead(n.id); }}
                      aria-label="Mark read"
                      title="Mark read"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    className="notif-icon-btn"
                    onClick={e => { e.stopPropagation(); onDelete(n.id); }}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function groupByDay(items: AppNotification[]): Array<{ label: string; items: AppNotification[] }> {
  if (items.length === 0) return [];
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const weekAgo = today - 7 * 86_400_000;

  const buckets: Record<string, AppNotification[]> = {
    "Today": [], "Yesterday": [], "This week": [], "Earlier": [],
  };

  for (const n of items) {
    const ts = n.created_at;
    if (ts >= today)        buckets["Today"].push(n);
    else if (ts >= yesterday) buckets["Yesterday"].push(n);
    else if (ts >= weekAgo)  buckets["This week"].push(n);
    else                     buckets["Earlier"].push(n);
  }

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

function fmtAbsolute(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString([], sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
  return `${date} · ${time}`;
}
