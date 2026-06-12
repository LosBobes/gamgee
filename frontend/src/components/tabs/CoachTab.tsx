import { useState } from "react";
import { Brain, ChevronRight, Footprints } from "lucide-react";
import type { ExerciseDef, WorkoutSession, ProgressionOverride } from "../../types";
import { ALL_EX } from "../../data/exercises";
import { analyzeEx, analyzeCardio, type AnalysisResult, type CardioAnalysisResult } from "../../analysis";
import { useTxt } from "../../context/ToneContext";
import ExerciseDiagnostics from "../exercise/ExerciseDiagnostics";

interface Props {
  history: WorkoutSession[];
  overrides: Record<string, ProgressionOverride>;
  onSetOverride: (exId: string, override: ProgressionOverride | null) => void;
  onUpdateSession: (session: WorkoutSession) => void;
}

// Sort so the lifts that need attention float to the top: steered first (you
// asked to drive them), then slipping, holding, progressing, then baselines.
const STATUS_ORDER: Record<string, number> = {
  "STEERING": 0, "BACKING OFF": 1, "HOLDING": 2, "PROGRESSING": 3, "BASELINE": 4,
};

/** Pace as m:ss per km, or null when we can't compute it (no distance/time). */
function fmtPace(durationMin: number, distanceKm: number): string | null {
  if (!(durationMin > 0) || !(distanceKm > 0)) return null;
  const secPerKm = (durationMin * 60) / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export default function CoachTab({ history, overrides, onSetOverride, onUpdateSession }: Props) {
  const t = useTxt();
  const [detailId, setDetailId] = useState<string | null>(null);

  if (detailId) {
    const ex = ALL_EX.find(e => e.id === detailId);
    if (ex) {
      return (
        <ExerciseDiagnostics
          exId={ex.id}
          exName={ex.name}
          history={history}
          override={overrides[ex.id] ?? null}
          onSetOverride={onSetOverride}
          onUpdateSession={onUpdateSession}
          onBack={() => setDetailId(null)}
        />
      );
    }
  }

  const coachData = ALL_EX
    .filter(ex => ex.type === "strength" && !ex.is_assisted)
    .map(ex => ({ ex, a: analyzeEx(ex.id, history, overrides[ex.id]) }))
    .filter((item): item is { ex: ExerciseDef; a: AnalysisResult } => item.a !== null)
    .sort((x, y) => (STATUS_ORDER[x.a.status.label] ?? 9) - (STATUS_ORDER[y.a.status.label] ?? 9));

  const cardioData = ALL_EX
    .filter(ex => ex.type === "cardio")
    .map(ex => ({ ex, a: analyzeCardio(ex.id, history) }))
    .filter((item): item is { ex: ExerciseDef; a: CardioAnalysisResult } => item.a !== null)
    .sort((x, y) => (STATUS_ORDER[x.a.status.label] ?? 9) - (STATUS_ORDER[y.a.status.label] ?? 9));

  const hasData = coachData.length > 0 || cardioData.length > 0;

  return (
    <div className="tab-anim">
      {hasData ? (
        <>
          <div className="coach-intro">
            {t(
              "What to work on next, sorted by what needs the most attention. Tap any lift for its chart — fix a past set or steer where it's heading.",
              "What to hit next, sorted by what needs you most. Tap a lift to see the chart, fix a logged set, or grab the wheel.",
              "What to hit next, sorted by what needs you most, bestie. Tap a lift for the chart — fix a set or steer the vibe."
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
              <div
                key={ex.id}
                className="coach-card coach-card-tappable"
                role="button"
                tabIndex={0}
                onClick={() => setDetailId(ex.id)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailId(ex.id); } }}
                title="Open chart — edit past sets or steer the target"
              >
                <div className="coach-hdr">
                  <div>
                    <div className="coach-ex-name">{ex.name}</div>
                    <span className="session-count">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="status-badge" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
                    {status.label} <ChevronRight size={11} style={{ verticalAlign: -1 }} />
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

          {cardioData.length > 0 && (
            <div className="coach-cardio-head">
              <Footprints size={13} /> {t("Cardio", "Cardio", "Cardio")}
            </div>
          )}
          {cardioData.map(({ ex, a }) => {
            const { sessions, last, metric, status, nextDuration, nextDistance, reason, trendPerSession } = a;
            const series = sessions.map(s => metric === "distance" ? s.distance : s.duration);
            const maxV = Math.max(...series, 1);
            const unit = metric === "distance" ? "km" : "min";
            const arrow = trendPerSession > 0.01 ? "▲" : trendPerSession < -0.01 ? "▼" : "→";
            const trendTxt = `${arrow} ${trendPerSession >= 0 ? "+" : ""}${trendPerSession}${unit}/session`;
            const lastPace = fmtPace(last.duration, last.distance);
            // Build the next-target line from whichever of duration/distance the
            // session actually carries — never show kg or reps for a run.
            const targetBits: string[] = [];
            if (nextDistance > 0) targetBits.push(`${nextDistance}km`);
            if (nextDuration > 0) targetBits.push(`${nextDuration} min`);
            return (
              <div key={ex.id} className="coach-card coach-card-cardio">
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
                        const v = metric === "distance" ? s.distance : s.duration;
                        const h = Math.max(4, Math.round((v / maxV) * 28));
                        const isLast = i === sessions.length - 1;
                        return (
                          <div key={i} title={`${v}${unit}`} style={{
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
                    {last.duration > 0 && (
                      <div>
                        <div className="coach-stat-lbl">Last Time</div>
                        <div className="coach-stat-val">{last.duration}<span className="coach-stat-unit">min</span></div>
                      </div>
                    )}
                    {last.distance > 0 && (
                      <div>
                        <div className="coach-stat-lbl">Last Dist</div>
                        <div className="coach-stat-val">{last.distance}<span className="coach-stat-unit">km</span></div>
                      </div>
                    )}
                    {lastPace && (
                      <div>
                        <div className="coach-stat-lbl">Pace</div>
                        <div style={{ marginTop: 4 }}><span className="orm-badge">{lastPace}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="rec-box">
                    <div className="rec-box-label"><ChevronRight size={11} /> {t("Next Session Target", "Next Session: Go For It", "Next Session: Manifest It")}</div>
                    <div className="rec-target">
                      {targetBits[0] ?? "—"}
                      {targetBits[1] && <span className="rec-target-unit"> · {targetBits[1]}</span>}
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
