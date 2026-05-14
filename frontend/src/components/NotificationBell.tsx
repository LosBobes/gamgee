import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trophy, Zap, Send, UserPlus, Users, Dumbbell, MessageSquare, GraduationCap, Calendar } from "lucide-react";
import type { AppNotification, NotificationKind } from "../types";

interface Props {
  notifications:   AppNotification[];
  unreadCount:     number;
  onMarkRead:      (id: number) => Promise<void>;
  onMarkAll:       () => Promise<void>;
  onDelete:        (id: number) => Promise<void>;
  onGoToBuddies:   () => void;
  onGoToChat:      (conversationId?: number) => void;
  onViewAll:       () => void;
  refresh:         () => Promise<void>;
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

export default function NotificationBell({
  notifications, unreadCount,
  onMarkRead, onMarkAll, onDelete, onGoToBuddies, onGoToChat, onViewAll, refresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    refresh();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, refresh]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await onMarkRead(n.id);
    setOpen(false);
    if (n.kind === "chat_message") {
      const convId = readConvId(n.payload);
      onGoToChat(convId);
      return;
    }
    if (["buddy_request", "buddy_accepted", "motivate", "live_started", "live_joined", "workout_done", "pr_set", "live_ended"].includes(n.kind)) {
      onGoToBuddies();
    }
  };

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        className={`notif-btn${unreadCount > 0 ? " has-unread" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-hdr">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="auth-toggle" onClick={() => onMarkAll()}>
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <Bell size={28} style={{ opacity: 0.4 }} />
              <div>No notifications yet</div>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map(n => {
                const Icon = KIND_ICON[n.kind] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={`notif-item${n.read ? "" : " unread"}`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="notif-icon"><Icon size={14} /></div>
                    <div className="notif-body">
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-meta">
                        {KIND_LABEL[n.kind] ?? n.kind} · {fmtRelative(n.created_at)}
                      </div>
                    </div>
                    <button
                      className="notif-del"
                      onClick={e => { e.stopPropagation(); onDelete(n.id); }}
                      aria-label="Dismiss"
                    >×</button>
                  </div>
                );
              })}
            </div>
          )}
          <button
            className="notif-view-all"
            onClick={() => { setOpen(false); onViewAll(); }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

function readConvId(payload: unknown): number | undefined {
  if (payload && typeof payload === "object" && "conversation_id" in payload) {
    const v = (payload as { conversation_id?: unknown }).conversation_id;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

function fmtRelative(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
