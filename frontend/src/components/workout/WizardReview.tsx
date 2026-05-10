import { ArrowLeft, X, Zap } from "lucide-react";
import type { ExerciseDef, WorkoutSession } from "../../types";
import { GROUPS, getActive, muscleGroups } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, ALL_EX } from "../../data/exercises";
import { FOCUS } from "../../data/focuses";
import { analyzeEx } from "../../analysis";
import BodyMap from "../BodyMap";

interface Props {
  planned:     ExerciseDef[];
  setPlanned:  (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  history:     WorkoutSession[];
  onBack:      () => void;
  onStart:     () => void;
  focus:       string;
}

export default function WizardReview({ planned, setPlanned, history, onBack, onStart, focus }: Props) {
  const finalActive = getActive(planned);
  const finalGroups = muscleGroups(finalActive);

  const focusMuscles       = getActive(FOCUS[focus].exIds.flatMap(id => {
    const ex = ALL_EX.find(e => e.id === id);
    return ex ? [ex] : [];
  }));
  const focusGroups        = muscleGroups(focusMuscles);
  const missingFocusGroups = GROUPS.filter(g => focusGroups.has(g) && !finalGroups.has(g));

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> EDIT</button>
        <span className="wz-focus-label">REVIEW WORKOUT</span>
        <div style={{ width: 72 }} />
      </div>

      <BodyMap active={finalActive} preview={{}} focusMuscles={focusMuscles} />

      <div className="coverage-bar-wrap" style={{ marginBottom: 16 }}>
        <div className="coverage-top">
          <span className="coverage-title">Final Coverage</span>
          <span className="coverage-count">
            {finalGroups.size}
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'Nunito',sans-serif", fontWeight: 400 }}>
              &nbsp;/ {GROUPS.length} groups
            </span>
          </span>
        </div>
        <div className="coverage-groups">
          {GROUPS.map(g => {
            const covered = finalGroups.has(g);
            const inFocus = focusGroups.has(g);
            return (
              <span key={g} className="group-chip" style={{
                color:       covered ? "var(--accent)" : inFocus ? "#E8981E" : "var(--muted)",
                background:  covered ? "var(--ad)" : inFocus ? "rgba(232,152,30,0.08)" : "transparent",
                borderColor: covered ? "var(--ad2)" : inFocus ? "rgba(232,152,30,0.25)" : "transparent",
                opacity:     inFocus || covered ? 1 : 0.35,
              }}>
                {g}
              </span>
            );
          })}
        </div>
        {missingFocusGroups.length > 0 && (
          <div className="gap-hint">
            <span className="gap-hint-label">MISSING</span>
            {missingFocusGroups.map(g => <span key={g} className="gap-chip">{g}</span>)}
          </div>
        )}
      </div>

      {planned.map((ex, i) => {
        const m    = EM[ex.id] || { p: [], s: [] };
        const anlz = analyzeEx(ex.id, history);
        return (
          <div key={ex.id} className="review-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span className="review-num">{i + 1}</span>
                  <div>
                    <div className="review-ex-name">{ex.name}</div>
                    {anlz && (
                      <div style={{ fontSize: 10, color: anlz.status.color, fontFamily: "'Nunito',sans-serif", fontWeight: 700, letterSpacing: 1 }}>
                        TARGET: {anlz.nextWeight}kg × {anlz.nextReps} reps
                      </div>
                    )}
                  </div>
                </div>
                <div className="review-muscles">
                  {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
                  {m.s.slice(0, 3).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
                </div>
              </div>
              <button className="btn-rm" style={{ marginTop: 4 }} onClick={() => setPlanned(p => p.filter(e => e.id !== ex.id))}><X size={14} /></button>
            </div>
          </div>
        );
      })}

      <button className="btn-start" onClick={onStart} disabled={planned.length === 0} style={{ marginTop: 8 }}>
        <Zap size={18} /> START WORKOUT ({planned.length} exercises)
      </button>
    </>
  );
}
