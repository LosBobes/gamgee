import { useState, useEffect, useRef } from "react";
import { X, Check, Circle, Play, Square, TrendingUp, Plus, Minus, Eye, Gauge, Lock, Unlock } from "lucide-react";
import type { WorkoutExercise, PersonalRecord, WorkoutSet, RestPrefs } from "../../types";
import type { AnalysisResult } from "../../analysis";
import { rpeToRir, rirToRpe } from "../../utils";
import { TYPE_COLOR } from "../../data/exercises";
import ExerciseInspectModal from "../exercise/ExerciseInspectModal";
import SetRestButton, { type RestTier } from "./RestTimer";

interface Props {
  ex:         WorkoutExercise;
  pr:         PersonalRecord | undefined;
  analysis:   AnalysisResult | null;
  restPrefs:  RestPrefs;
  rest:       { endAt: number; totalSec: number; tier: RestTier } | null;
  bodyweight: number | null;
  onRemove:   () => void;
  onToggleLock: () => void;
  updateSet:  (idx: number, field: keyof WorkoutSet, value: string) => void;
  setSetRpe:  (idx: number, rpe: number | null) => void;
  toggleSet:  (idx: number) => void;
  addSet:     () => void;
  removeSet:  (idx: number) => void;
  isNewPr:    (weight: string) => boolean;
  onPickRestTier: (tier: Exclude<RestTier, "custom">) => void;
  onAdjustRest:   (deltaSec: number) => void;
  onStartCustomRest: (seconds: number) => void;
}

const colLabels = (ex: WorkoutExercise): [string, string] =>
  ex.type === "cardio" ? ["DURATION (min)", "DIST (km)"]
  : ex.type === "timed" ? ["RECORDED (s)", "NOTES"]
  : ex.is_assisted ? ["BW ± (kg)", "REPS"]
  : ["WEIGHT (kg)", "REPS"];

interface TimedSetRowProps {
  set: WorkoutSet;
  idx: number;
  setCount: number;
  disabled: boolean;
  updateSet: (idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet: (idx: number) => void;
  removeSet: (idx: number) => void;
}

function TimedSetRow({ set, idx, setCount, disabled, updateSet, toggleSet, removeSet }: TimedSetRowProps) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [running]);

  const handleStart = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
    const secs = Math.round(elapsed / 1000);
    updateSet(idx, "weight", String(secs));
    if (!set.done) toggleSet(idx);
  };

  const fmtElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <div className={`set-row${running ? " timed-set-active" : ""}`}>
      <div className={`set-num${set.done ? " done" : ""}`}>{idx + 1}</div>
      {running ? (
        <div className="timed-elapsed">{fmtElapsed(elapsed)}</div>
      ) : (
        <>
          <div className="timed-duration-cell">{set.weight ? `${set.weight}s` : "—"}</div>
          <input
            className={`set-inp${set.done ? " done" : ""}`}
            type="text" placeholder="—"
            value={set.reps}
            onChange={e => updateSet(idx, "reps", e.target.value)}
            disabled={disabled}
            readOnly={disabled}
          />
        </>
      )}
      {running ? (
        <button className="timed-stop-btn" onClick={handleStop}><Square size={13} /></button>
      ) : set.done ? (
        <button className="check-btn done" onClick={() => toggleSet(idx)} disabled={disabled}><Check size={13} /></button>
      ) : (
        <button className="timed-start-btn" onClick={handleStart} disabled={disabled}><Play size={13} /></button>
      )}
      <button className="rm-set-btn" onClick={() => removeSet(idx)} disabled={disabled || setCount <= 1}>
        <X size={13} />
      </button>
    </div>
  );
}

export default function ExerciseCard({ ex, pr, analysis, restPrefs, rest, bodyweight, onRemove, onToggleLock, updateSet, setSetRpe, toggleSet, addSet, removeSet, isNewPr, onPickRestTier, onAdjustRest, onStartCustomRest }: Props) {
  const [wL, rL] = colLabels(ex);
  const [inspectOpen, setInspectOpen] = useState(false);
  const doneCt = ex.sets.filter(s => s.done).length;
  // A locked (finished) exercise is frozen: every input, stepper, check and
  // remove control is disabled, and the rest/add-set affordances are hidden.
  const locked = !!ex.locked;

  const isAssisted = !!ex.is_assisted && ex.type === "strength";

  // Assisted-machine sets log an OFFSET from the user's bodyweight: 0 = at
  // bodyweight, negative = below bodyweight by that many kg of assistance.
  // The input shows the signed offset literally (e.g. "-20"); the minus sign
  // IS the indicator. A hint below the input renders the effective working
  // weight (bodyweight + offset) when bodyweight is known.
  const effectiveWeight = (raw: string): number | null => {
    if (!isAssisted || bodyweight == null) return null;
    const n = parseFloat(raw);
    const offset = Number.isFinite(n) ? n : 0;
    return Math.round((bodyweight + offset) * 10) / 10;
  };
  const assistHintFor = (raw: string): string | null => {
    if (!isAssisted) return null;
    if (bodyweight == null) return "Set bodyweight in Profile to see effective load";
    const eff = effectiveWeight(raw)!;
    const n = parseFloat(raw);
    const offset = Number.isFinite(n) ? n : 0;
    if (offset === 0) return `= ${eff}kg (at BW)`;
    return `= ${eff}kg (BW ${offset > 0 ? "+" : "−"} ${Math.abs(offset)})`;
  };

  // Index of the set the user is currently working on — first set that hasn't
  // been checked. -1 means everything is done. Locks every set after this one
  // until the in-progress set is finished, so the user can't fat-finger ahead.
  const activeIdx = ex.sets.findIndex(s => !s.done);
  // While the rest timer is running for THIS exercise, hide any not-yet-done
  // sets — they fade out into the cool-down bar via a CSS transition. The
  // user sees only the set they just finished plus the rest UI.
  const restActiveHere = !!rest;
  const setIsHidden = (set: WorkoutSet) => restActiveHere && !set.done;

  const applyProgression = () => {
    if (!analysis) return;
    ex.sets.forEach((set, idx) => {
      if (set.done) return;
      updateSet(idx, "weight", String(analysis.nextWeight));
      updateSet(idx, "reps",   String(analysis.nextReps));
    });
  };

  const wStep = ex.type === "cardio" ? 5    : 2.5;
  const rStep = ex.type === "cardio" ? 0.5  : 1;
  const stepField = (idx: number, field: "weight" | "reps", delta: number) => {
    const step = field === "weight" ? wStep : rStep;
    const cur  = parseFloat(ex.sets[idx][field]);
    const base = Number.isFinite(cur) ? cur : 0;
    if (field === "weight" && isAssisted) {
      // "+" raises the offset toward 0 (less assistance, harder); "−" lowers
      // it (more assistance, easier). Cap at 0 — going positive would mean
      // weighted-dips territory, which belongs to a different exercise entry.
      const next = Math.min(0, Math.round((base + delta * step) * 100) / 100);
      updateSet(idx, "weight", String(next));
      return;
    }
    const next = Math.max(0, Math.round((base + delta * step) * 100) / 100);
    updateSet(idx, field, String(next));
  };

  return (
    <>
    <div className={`ex-card${locked ? " ex-card-locked" : ""}`}>
      <div className="ex-hdr">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <div className="ex-name">{ex.name}</div>
            {pr && <span className="pr-pill">PR {
              isAssisted
                ? (bodyweight != null
                    ? `${Math.round((bodyweight + pr.weight) * 10) / 10}kg (BW${pr.weight === 0 ? "" : ` − ${Math.abs(pr.weight)}`})`
                    : `BW ${pr.weight >= 0 ? "+" : "−"} ${Math.abs(pr.weight)}kg`)
                : `${pr.weight}kg`
            }{pr.reps ? ` × ${pr.reps}` : ""}</span>}
          </div>
          <div className="ex-meta">
            <span style={{ color: TYPE_COLOR[ex.type] }}>●</span>
            <span>{doneCt}/{ex.sets.length} sets</span>
            {locked && <span className="ex-locked-tag"><Lock size={9} /> FINISHED</span>}
            {analysis && <span style={{ color: analysis.status.color }}>→ {analysis.nextWeight}kg × {analysis.nextReps}</span>}
            {analysis && ex.type === "strength" && !locked && (
              <button className="btn-progress" onClick={applyProgression} title="Apply coach recommendation to all sets">
                <TrendingUp size={15} /> APPLY
              </button>
            )}
          </div>
        </div>
        <div className="ex-hdr-actions">
          <button
            type="button"
            className="btn-icon btn-inspect"
            onClick={() => setInspectOpen(true)}
            aria-label="Show how-to and animation"
            title="How-to & animation"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className={`btn-icon btn-lock${locked ? " btn-lock-on" : ""}`}
            onClick={onToggleLock}
            aria-label={locked ? "Unlock exercise to edit" : "Finish and lock exercise"}
            title={locked ? "Unlock to edit" : "Finish & lock"}
          >
            {locked ? <Unlock size={14} /> : <Lock size={14} />}
          </button>
          <button className="btn-icon" onClick={onRemove} aria-label="Remove exercise"><X size={14} /></button>
        </div>
      </div>

      <div className="set-table">
        <div className="set-col-hdr">
          <div className="col-lbl">#</div>
          <div className="col-lbl">{wL}</div>
          <div className="col-lbl">{rL}</div>
          <div className="col-lbl"><Check size={11} /></div>
          <div className="col-lbl" />
        </div>
        {/* Warmup-vs-work label: shown next to the set number column for
            regime-prescribed workouts. A "WORK" label is added to the first
            non-warmup set so the transition is visually unmistakable. */}
        {ex.type === "timed" ? (
          ex.sets.map((set, idx) => (
            <TimedSetRow
              key={idx}
              set={set}
              idx={idx}
              setCount={ex.sets.length}
              disabled={locked}
              updateSet={updateSet}
              toggleSet={toggleSet}
              removeSet={removeSet}
            />
          ))
        ) : (
          ex.sets.map((set, idx) => {
            const showPrTag = ex.type === "strength" && !set.is_warmup && isNewPr(set.weight) && !!set.weight;
            // For strength: only the in-progress set is interactive. Earlier
            // sets are read-only (checked off). Later sets are locked until
            // the current one is checked, so the user can't ghost-fill ahead.
            // A locked (finished) exercise freezes every set regardless.
            const isLocked = locked || (ex.type === "strength" && !set.done && idx !== activeIdx);
            const isHidden = setIsHidden(set);
            // Mark the first non-warmup set as the "work transition" so the
            // UI clearly indicates "warmup ramp ends here, working sets start".
            const prevIsWarmup = idx > 0 && ex.sets[idx - 1].is_warmup;
            const isFirstWorking = !set.is_warmup && (idx === 0 ? false : prevIsWarmup);
            // Per-set RIR ("reps left in the tank") is offered only for strength
            // working sets — warmup ramps don't drive progression. Shown once the
            // set is done so it doesn't crowd the in-progress input row. Stored
            // as RPE under the hood (RIR = 10 - RPE) so existing data and the
            // analyzer keep working.
            const showRirPicker = ex.type === "strength" && !set.is_warmup && set.done;
            const rowCls   = [
              "set-row",
              set.done   ? "set-done"   : "",
              isLocked   ? "set-locked" : "",
              isHidden   ? "set-hidden" : "",
              set.is_warmup ? "set-warmup" : "",
              isFirstWorking ? "set-first-working" : "",
            ].filter(Boolean).join(" ");
            return (
              <div key={`set-wrap-${idx}`} className="set-row-wrap" aria-hidden={isHidden || undefined}>
              <div className={rowCls}>
                <div className={`set-num ${set.done ? "done" : ""}`}>
                  {set.is_warmup ? <span className="set-type-tag set-type-warmup">WU</span> : (idx + 1)}
                </div>
                <div className="stepper inp-wrap">
                  <button
                    type="button" className="step-btn step-minus"
                    aria-label={`decrease ${wL}`}
                    onClick={() => stepField(idx, "weight", -1)}
                    disabled={isLocked}
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <input
                    className={`set-inp step-inp ${set.done ? "done" : ""}`}
                    type="number" inputMode={isAssisted ? "numeric" : "decimal"}
                    {...(isAssisted ? { max: 0 } : { min: 0 })}
                    step={wStep}
                    placeholder={ex.type === "cardio" ? "30" : "0"}
                    value={set.weight}
                    onChange={e => updateSet(idx, "weight", e.target.value)}
                    disabled={isLocked}
                    readOnly={isLocked}
                  />
                  <button
                    type="button" className="step-btn step-plus"
                    aria-label={`increase ${wL}`}
                    onClick={() => stepField(idx, "weight", +1)}
                    disabled={isLocked}
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                  {showPrTag && <span className="new-pr-tag">NEW PR!</span>}
                </div>
                <div className="stepper">
                  <button
                    type="button" className="step-btn step-minus"
                    aria-label={`decrease ${rL}`}
                    onClick={() => stepField(idx, "reps", -1)}
                    disabled={isLocked}
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <input
                    className={`set-inp step-inp ${set.done ? "done" : ""}`}
                    type="number" inputMode="decimal" min="0" step={rStep}
                    placeholder={ex.type === "cardio" ? "5.0" : "0"}
                    value={set.reps}
                    onChange={e => updateSet(idx, "reps", e.target.value)}
                    disabled={isLocked}
                    readOnly={isLocked}
                  />
                  <button
                    type="button" className="step-btn step-plus"
                    aria-label={`increase ${rL}`}
                    onClick={() => stepField(idx, "reps", +1)}
                    disabled={isLocked}
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
                <button
                  className={`check-btn ${set.done ? "done" : ""}`}
                  onClick={() => toggleSet(idx)}
                  disabled={isLocked}
                  aria-label={isLocked ? "Finish the set above first" : (set.done ? "Mark set incomplete" : "Mark set done")}
                >
                  {set.done ? <Check size={18} strokeWidth={3} /> : <Circle size={18} strokeWidth={2.5} />}
                </button>
                <button
                  className="rm-set-btn"
                  onClick={() => removeSet(idx)}
                  disabled={ex.sets.length <= 1 || isLocked}
                >
                  <X size={14} />
                </button>
              </div>
              {isAssisted && (() => {
                const hint = assistHintFor(set.weight);
                return hint ? <div className="assist-hint">{hint}</div> : null;
              })()}
              {showRirPicker && (() => {
                const curRir = rpeToRir(set.rpe);
                return (
                  <div className="set-rpe-row" aria-label={`How many reps left in the tank on set ${idx + 1}?`}>
                    <span className="set-rpe-label"><Gauge size={11} /> REPS LEFT</span>
                    <div className="set-rpe-pills" role="radiogroup">
                      {[0, 1, 2, 3, 4].map(rir => {
                        const active = curRir === rir;
                        const label = rir === 4 ? "4+" : String(rir);
                        return (
                          <button
                            key={rir}
                            role="radio"
                            aria-checked={active}
                            aria-label={rir === 0 ? "0 — to failure" : `${label} reps left`}
                            className={`set-rpe-pill${active ? " set-rpe-pill-active" : ""}`}
                            // Tap a second time to clear (toggle off) so the user
                            // can un-rate a set if they meant to skip.
                            onClick={() => setSetRpe(idx, active ? null : rirToRpe(rir))}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              </div>
            );
          })
        )}
        {ex.type === "strength" && !locked && (
          <SetRestButton
            prefs={restPrefs}
            rest={rest}
            onAddSet={addSet}
            onFinishExercise={onToggleLock}
            onPickTier={onPickRestTier}
            onAdjust={onAdjustRest}
            onStartCustom={onStartCustomRest}
          />
        )}
      </div>
    </div>
    {inspectOpen && (
      <ExerciseInspectModal
        exerciseId={ex.id}
        exerciseName={ex.name}
        onClose={() => setInspectOpen(false)}
      />
    )}
    </>
  );
}
