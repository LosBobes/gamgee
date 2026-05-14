import { useEffect, useState } from "react";
import {
  X as XIcon, Trophy, Flame, Calendar, Dumbbell, Heart, Sparkles, MessageCircle,
} from "lucide-react";
import type { PublicProfile, PublicProfileMemory } from "../types";
import { fmtDate, fmtShortDate } from "../utils";
import { useTxt } from "../context/ToneContext";

interface Props {
  userId: number;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
}

export default function PublicProfileModal({ userId, authFetch, onClose }: Props) {
  const t = useTxt();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    authFetch(`/api/buddies/profile/${userId}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          setProfile(await r.json());
        } else {
          const body = await r.json().catch(() => ({}));
          setError(body.detail ?? "Couldn't load profile");
        }
      })
      .catch(() => { if (!cancelled) setError("Network error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, authFetch]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card public-profile-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="buddy-icon-btn public-profile-close"
          onClick={onClose}
          aria-label="Close"
        >
          <XIcon size={16} />
        </button>

        {loading && (
          <div className="empty" style={{ padding: "32px 0" }}>
            <div className="empty-label">Loading…</div>
          </div>
        )}

        {error && !loading && (
          <div className="empty" style={{ padding: "32px 0" }}>
            <div className="empty-label">{error}</div>
          </div>
        )}

        {profile && !loading && (
          <ProfileBody profile={profile} t={t} />
        )}
      </div>
    </div>
  );
}

function ProfileBody({ profile, t }: { profile: PublicProfile; t: ReturnType<typeof useTxt> }) {
  const accent = profile.primary_color ?? "var(--primary)";
  const displayName = profile.name ?? profile.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="public-profile-hero">
        <div
          className="public-profile-avatar"
          style={{ background: accent }}
        >
          {initials}
        </div>
        <div className="public-profile-meta">
          <div className="public-profile-name">
            {displayName}
            {profile.is_self && <span className="score-self-tag">YOU</span>}
            {profile.is_trainer && <span className="buddy-status-tag accepted">COACH</span>}
          </div>
          <div className="public-profile-username">@{profile.username}</div>
          {profile.member_since && (
            <div className="public-profile-since">
              <Calendar size={11} /> MEMBER SINCE {fmtShortDate(profile.member_since).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="public-profile-stats">
        <Stat
          icon={<Dumbbell size={14} />}
          val={profile.workouts_total}
          label={t("Workouts", "Sessions", "Sessions")}
        />
        <Stat
          icon={<Trophy size={14} />}
          val={profile.pr_count}
          label="PRs"
        />
        <Stat
          icon={<Flame size={14} />}
          val={profile.current_streak}
          label={t("Streak", "Streak", "Streak")}
        />
      </div>

      {profile.top_focuses.length > 0 && (
        <div className="public-profile-focus-row">
          {profile.top_focuses.map((f) => (
            <span key={f} className="live-focus-tag">{f}</span>
          ))}
        </div>
      )}

      <div className="profile-section public-profile-section">
        <Sparkles size={12} />
        {t("Board of Memories", "Wall of Hype", "The Hype Wall")}
      </div>

      {profile.memories.length === 0 ? (
        <div className="public-profile-empty">
          <Heart size={28} />
          <div className="public-profile-empty-label">
            {profile.is_self
              ? t(
                  "No motivations yet. Buddies will be able to leave memories here.",
                  "Wall's empty. Your crew can drop hype here.",
                  "Wall's empty, bestie. Your besties will hype you here.",
                )
              : t(
                  "Be the first to leave a memory — send them a motivation.",
                  "Be the first to drop hype — send them a motivation.",
                  "Be the first to drop hype, bestie. Motivate them.",
                )}
          </div>
        </div>
      ) : (
        <div className="memory-board">
          {profile.memories.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ icon, val, label }: { icon: React.ReactNode; val: number; label: string }) {
  return (
    <div className="profile-stat public-profile-stat">
      <div className="public-profile-stat-icon">{icon}</div>
      <div className="profile-stat-val">{val}</div>
      <div className="profile-stat-lbl">{label}</div>
    </div>
  );
}

function MemoryCard({ memory: m }: { memory: PublicProfileMemory }) {
  const accent = m.sender_primary_color ?? "var(--primary)";
  const senderName = m.sender_name ?? m.sender_username ?? "Someone";
  const initials = senderName.slice(0, 2).toUpperCase();
  const dateStr = m.created_at
    ? fmtDate(new Date(m.created_at).toISOString())
    : null;
  return (
    <div className="memory-card" style={{ borderColor: accent }}>
      <MessageCircle size={12} className="memory-quote-icon" style={{ color: accent }} />
      <div className="memory-message">"{m.message}"</div>
      <div className="memory-footer">
        <div
          className="score-avatar small"
          style={{ background: accent, width: 22, height: 22, fontSize: 9 }}
        >
          {initials}
        </div>
        <div className="memory-sender">
          {senderName}
          {m.sender_username && (
            <span className="memory-sender-handle">@{m.sender_username}</span>
          )}
        </div>
        {dateStr && <span className="memory-date">{dateStr}</span>}
      </div>
    </div>
  );
}
