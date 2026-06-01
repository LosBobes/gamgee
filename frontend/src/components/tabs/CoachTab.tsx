import { Brain, ChevronRight } from "lucide-react";
import type { ExerciseDef, WorkoutSession } from "../../types";
import { ALL_EX } from "../../data/exercises";
import { analyzeEx, type AnalysisResult } from "../../analysis";
import { useTxt } from "../../context/ToneContext";

interface Props {
  history: WorkoutSession[];
}

// Sort so the lifts that need attention float to the top: slipping first,
// then holding, then the ones already moving, then brand-new baselines.
const STATUS_ORDER: Record<string, number> = {
  "BACKING OFF": 0, "HOLDING": 1, "PROGRESSING": 2, "BASELINE": 3,
};

export default function CoachTab({ history }: Props) {
  const t = useTxt();
  const coachData = ALL_EX
    .filter(ex => !ex.is_assisted)
    .map(ex => ({ ex, a: analyzeEx(ex.id, history) }))
    .filter((item): item is { ex: ExerciseDef; a: AnalysisResult } => item.a !== null)
    .sort((x, y) => (STATUS_ORDER[x.a.status.label] ?? 9) - (STATUS_ORDER[y.a.status.label] ?? 9));

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
            const { sessions, last, est1RM, status, nextWeight, nextReps, reason, trendPerSession } = a;
            // Plot the RIR-adjusted estimated 1RM — that's the series the trend
            // is actually fit on, so the bars match the read.
            const maxE = Math.max(...sessions.map(s => s.e1rm));
            const arrow = trendPerSession > 0.05 ? "▲" : trendPerSession < -0.05 ? "▼" : "→";
            const trendTxt = `${arrow} ${trendPerSession >= 0 ? "+" : ""}${trendPerSession.toFixed(1)}kg/session`;
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
                  {sessions.length > 1 && (
                    <div className="trend-wrap">
                      {sessions.map((s, i) => {
                        const h      = maxE > 0 ? Math.max(4, Math.round((s.e1rm / maxE) * 28)) : 4;
                        const isLast = i === sessions.length - 1;
                        return (
                          <div key={i} title={`~${s.e1rm}kg est. 1RM`} style={{
                            width: 7, height: h, borderRadius: "2px 2px 0 0", flexShrink: 0,
                            background: isLast ? status.color : "var(--s3)",
                            opacity: isLast ? 1 : 0.4 + 0.6 * (i / sessions.length),
                          }} />
                        );
                      })}
                      <span style={{ fontSize: 8, color: status.color, marginLeft: 5, alignSelf: "center", letterSpacing: 0.5 }}>{trendTxt}</span>
                    </div>
                  )}
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
                  <div className="rec-box">
                    <div className="rec-box-label"><ChevronRight size={11} /> {t("Next Session Target", "Next Session: Go For It", "Next Session: Manifest It")}</div>
                    <div className="rec-target">
                      {nextWeight}kg<span className="rec-target-unit"> × {nextReps} reps</span>
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
