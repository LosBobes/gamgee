import { useEffect, useState } from "react";
import { Flame, Trophy, TrendingUp, Award, Sparkles, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StreakSummary } from "../types";
import { streaksApi } from "../data/extraApi";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Flame, Trophy, TrendingUp, Award, Sparkles, Flag,
};

export default function StreakBadgesCard({ authFetch }: Props) {
  const [summary, setSummary] = useState<StreakSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    streaksApi.summary(authFetch).then(s => { if (!cancelled) setSummary(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [authFetch]);

  if (!summary) return null;

  return (
    <>
      <div className="profile-section">Streak &amp; Badges</div>
      <div className="profile-card">
        <div className="streak-row">
          <div className="streak-cell">
            <div className="streak-val"><Flame size={14} /> {summary.current_streak}</div>
            <div className="streak-lbl">Current</div>
          </div>
          <div className="streak-cell">
            <div className="streak-val">{summary.best_streak}</div>
            <div className="streak-lbl">Best run</div>
          </div>
          <div className="streak-cell">
            <div className="streak-val">{summary.days_active_30}</div>
            <div className="streak-lbl">Active days / 30</div>
          </div>
        </div>
        {summary.earned_badges.length > 0 ? (
          <div className="badge-list">
            {summary.earned_badges.map(b => {
              const Icon = ICON_MAP[b.icon || ""] ?? Sparkles;
              return (
                <div key={b.badge_id} className="badge-pill" title={b.description}>
                  <Icon size={14} /> {b.label}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="badge-empty">No badges yet — log a workout to start.</div>
        )}
      </div>
    </>
  );
}
