import { useState } from "react";
import { Brain, ChevronRight, Check } from "lucide-react";
import type { ExerciseDef, WorkoutSession, ProgressionSpeed } from "../../types";
import { ALL_EX } from "../../data/exercises";
import { analyzeEx, type AnalysisResult } from "../../analysis";
import { useTxt } from "../../context/ToneContext";

interface Props {
  history: WorkoutSession[];
  progressionSpeed: ProgressionSpeed;
  onAccept: (ex: ExerciseDef, weight: number, reps: number) => void;
}

const STATUS_ORDER: Record<string, number> = {
  "DELOAD": 0, "STALLED": 1, "PLATEAU": 2,
  "READY TO JUMP": 3, "PROGRESSING": 4, "BUILDING REPS": 5, "NEW": 6,
};

export default function CoachTab({ history, progressionSpeed, onAccept }: Props) {
  const t = useTxt();
  const [overrides, setOverrides]     = useState<Record<string, string>>({});
  const [deloadAcked, setDeloadAcked] = useState<Set<string>>(new Set());

  const coachData = ALL_EX
    .map(ex => ({ ex, a: analyzeEx(ex.id, history, progressionSpeed) }))
    .filter((item): item is { ex: ExerciseDef; a: AnalysisResult } => item.a !== null)
    .sort((x, y) => (STATUS_ORDER[x.a.status.label] ?? 9) - (STATUS_ORDER[y.a.status.label] ?? 9));

  const getEffectiveWeight = (exId: string, nextWeight: number): number => {
    const raw = overrides[exId];
    const parsed = parseFloat(raw);
    return !isNaN(parsed) && parsed > 0 ? parsed : nextWeight;
  };

  return (
    <div className="tab-anim">
      {coachData.length > 0 ? (
        <>
          <div className="coach-intro">
            {t(
              "What to work on next, sorted by what needs the most attention. Red = intervene, amber = ready for a weight jump, green = moving forward.",
              "What to hit next, sorted by what needs you most. Red = intervene now, amber = jump that weight, green = you're crushing it."
            )}
          </div>
          {coachData.map(({ ex, a }) => {
            const { sessions, last, est1RM, status, nextWeight, nextReps, reason } = a;
            const maxW        = Math.max(...sessions.map(s => s.topW));
            const isDeload    = status.label === "DELOAD";
            const acked       = deloadAcked.has(ex.id);
            const effWeight   = getEffectiveWeight(ex.id, nextWeight);

            return (
              <div key={ex.id} className="coach-card">
                <div className="coach-hdr">
                  <div>
                    <div className="coach-ex-name">{ex.name}</div>
                    <span className="session-count">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="status-badge" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
                    {status.label}
                  </span>
                </div>

                <div className="coach-body">
                  {/* ── Deload banner ── */}
                  {isDeload && !acked && (
                    <div className="deload-banner">
                      <div className="deload-banner-text">
                        Stuck at <strong>{last.topW}kg</strong> for 3 sessions.
                        Drop to <strong>{nextWeight}kg</strong> (~85%), nail the reps, then rebuild.
                      </div>
                      <div className="deload-banner-actions">
                        <button
                          className="deload-accept-btn"
                          onClick={() => {
                            setDeloadAcked(s => new Set([...s, ex.id]));
                            onAccept(ex, nextWeight, nextReps);
                          }}
                        >
                          <Check size={12} /> Accept Deload
                        </button>
                        <button
                          className="deload-dismiss-btn"
                          onClick={() => setDeloadAcked(s => new Set([...s, ex.id]))}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {isDeload && acked && (
                    <div className="deload-acked">
                      <Check size={12} /> Deload accepted — {nextWeight}kg pre-loaded for your next workout
                    </div>
                  )}

                  {/* ── Sparkline trend ── */}
                  {sessions.length > 1 && (
                    <div className="trend-wrap">
                      {sessions.map((s, i) => {
                        const h      = maxW > 0 ? Math.max(4, Math.round((s.topW / maxW) * 28)) : 4;
                        const isLast = i === sessions.length - 1;
                        return (
                          <div key={i} title={`${s.topW}kg`} style={{
                            width: 7, height: h, borderRadius: "2px 2px 0 0", flexShrink: 0,
                            background: isLast ? status.color : "var(--s3)",
                            opacity: isLast ? 1 : 0.4 + 0.6 * (i / sessions.length),
                          }} />
                        );
                      })}
                      <span style={{ fontSize: 8, color: "var(--muted)", marginLeft: 5, alignSelf: "center", letterSpacing: 1 }}>TREND</span>
                    </div>
                  )}

                  {/* ── Stats row ── */}
                  <div className="coach-row">
                    <div>
                      <div className="coach-stat-lbl">Last Weight</div>
                      <div className="coach-stat-val">{last.topW}<span className="coach-stat-unit">kg</span></div>
                    </div>
                    {last.topR > 0 && (
                      <div>
                        <div className="coach-stat-lbl">Last Reps</div>
                        <div className="coach-stat-val">{last.topR}<span className="coach-stat-unit">reps</span></div>
                      </div>
                    )}
                    <div>
                      <div className="coach-stat-lbl">Sets</div>
                      <div className="coach-stat-val">{last.totalSets}<span className="coach-stat-unit">sets</span></div>
                    </div>
                    {est1RM && (
                      <div>
                        <div className="coach-stat-lbl">Est. 1RM</div>
                        <div style={{ marginTop: 4 }}><span className="orm-badge">~{est1RM}kg</span></div>
                      </div>
                    )}
                  </div>

                  {/* ── Recommendation box ── */}
                  <div className="rec-box">
                    <div className="rec-box-label"><ChevronRight size={11} /> {t("Next Session Target", "Next Session: Go For It", "Next Session: Manifest It")}</div>
                    <div className="rec-action-row">
                      <div className="rec-weight-wrap">
                        <input
                          className="rec-weight-input"
                          type="number"
                          min={0}
                          step={2.5}
                          value={overrides[ex.id] ?? nextWeight}
                          onChange={e => setOverrides(o => ({ ...o, [ex.id]: e.target.value }))}
                          aria-label="Override target weight"
                        />
                        <span className="rec-target-unit"> kg × {nextReps} reps</span>
                      </div>
                      <button
                        className="do-this-btn"
                        onClick={() => onAccept(ex, effWeight, nextReps)}
                      >
                        Do this
                      </button>
                    </div>
                    <div className="rec-reason">{reason}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon"><Brain size={40} /></div>
          <div className="empty-label">{t("Log sessions to unlock coaching", "Log some sessions and the coach wakes up", "Log a few sessions and the coach pulls up")}</div>
        </div>
      )}
    </div>
  );
}
