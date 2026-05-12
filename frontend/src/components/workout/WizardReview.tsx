import { ArrowLeft, X, Zap, Clock, Heart } from "lucide-react";
import type { CardioPlan, ExerciseDef, WorkoutSession } from "../../types";
import { GROUPS, getActive, muscleGroups } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, ALL_EX } from "../../data/exercises";
import { getFocusDef } from "../../data/focuses";
import { analyzeEx } from "../../analysis";
import BodyMap from "../BodyMap";
import { useTxt } from "../../context/ToneContext";

interface Props {
  planned:     ExerciseDef[];
  setPlanned:  (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  history:     WorkoutSession[];
  onBack:      () => void;
  onStart:     (autoFill: boolean) => void;
  focus:       string;
  cardio:      CardioPlan;
}

export default function WizardReview({ planned, setPlanned, history, onBack, onStart, focus, cardio }: Props) {
  const t = useTxt();
  const finalActive = getActive(planned);
  const finalGroups = muscleGroups(finalActive);

  const focusDef           = getFocusDef(focus) ?? { name: focus, icon: () => null, desc: "", exIds: [] };
  const focusMuscles       = getActive(focusDef.exIds.flatMap(id => {
    const ex = ALL_EX.find(e => e.id === id);
    return ex ? [ex] : [];
  }));
  const focusGroups        = muscleGroups(focusMuscles);
  const missingFocusGroups = GROUPS.filter(g => focusGroups.has(g) && !finalGroups.has(g));

  const hasAnyHistory = planned.some(ex =>
    history.some(s => s.exercises.some(e => e.id === ex.id))
  );

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

      {(cardio.before || cardio.after) && (
        <div className="cardio-summary-card">
          <div className="cardio-summary-head"><Heart size={13} /> CARDIO PLAN</div>
          {cardio.before && (
            <div className="cardio-summary-row">
              <span className="cardio-summary-tag">BEFORE</span>
              <span className="cardio-summary-text">
                {ALL_EX.find(e => e.id === cardio.before!.exId)?.name ?? cardio.before.exId} · {cardio.before.minutes} min
              </span>
            </div>
          )}
          {cardio.after && (
            <div className="cardio-summary-row">
              <span className="cardio-summary-tag">AFTER</span>
              <span className="cardio-summary-text">
                {ALL_EX.find(e => e.id === cardio.after!.exId)?.name ?? cardio.after.exId} · {cardio.after.minutes} min
              </span>
            </div>
          )}
        </div>
      )}

      {planned.map((ex, i) => {
        const m    = EM[ex.id] || { p: [], s: [] };
        const anlz = analyzeEx(ex.id, history);
        const hasHistory = history.some(s => s.exercises.some(e => e.id === ex.id));
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
                {hasHistory && anlz && (
                  <div className="review-last-hint">
                    <Clock size={9} /> Last: {anlz.last.topW}kg × {anlz.last.topR} · {anlz.last.totalSets} sets
                  </div>
                )}
              </div>
              <button className="btn-rm" style={{ marginTop: 4 }} onClick={() => setPlanned(p => p.filter(e => e.id !== ex.id))}><X size={14} /></button>
            </div>
          </div>
        );
      })}

      {hasAnyHistory ? (
        <div className="review-autofill-card">
          <div className="review-autofill-top">
            <Clock size={15} />
            <div>
              <div className="review-autofill-title">{t("Auto-fill from last session?", "Load weights from last session?", "Run last session's weights?")}</div>
              <div className="review-autofill-sub">{t("Pre-loads weight and reps. Edit freely during the workout.", "Pre-fills your weight and reps. You're free to push past it.", "Pre-fills your numbers, bestie. Beat them or edit them.")}</div>
            </div>
          </div>
          <div className="review-autofill-btns">
            <button className="btn-start btn-start-fresh" onClick={() => onStart(false)} disabled={planned.length === 0}>
              Start Fresh
            </button>
            <button className="btn-start" onClick={() => onStart(true)} disabled={planned.length === 0}>
              <Zap size={16} /> {t("Use Last Session", "Load Last Session", "Run It Back")}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-start" onClick={() => onStart(false)} disabled={planned.length === 0} style={{ marginTop: 8 }}>
          <Zap size={18} /> {t(`START WORKOUT (${planned.length} exercises)`, `LET'S GO (${planned.length} exercises)`, `LET'S GO BESTIE (${planned.length} exercises)`)}
        </button>
      )}
    </>
  );
}
