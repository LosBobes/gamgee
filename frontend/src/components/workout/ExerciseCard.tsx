import { useState, useEffect, useRef } from "react";
import { X, Check, Circle, Play, Square, TrendingUp, AlertTriangle, Plus, Minus, Eye } from "lucide-react";
import type { WorkoutExercise, PersonalRecord, WorkoutSet, RestPrefs } from "../../types";
import type { AnalysisResult } from "../../analysis";
import { STATUS } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, TYPE_COLOR } from "../../data/exercises";
import ExerciseInspectModal from "../exercise/ExerciseInspectModal";
import SetRestButton, { type RestTier } from "./RestTimer";

interface Props {
  ex:         WorkoutExercise;
  pr:         PersonalRecord | undefined;
  analysis:   AnalysisResult | null;
  restPrefs:  RestPrefs;
  rest:       { endAt: number; totalSec: number; tier: RestTier } | null;
  onRemove:   () => void;
  updateSet:  (idx: number, field: keyof WorkoutSet, value: string) => void;
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
  : ["WEIGHT (kg)", "REPS"];

interface TimedSetRowProps {
  set: WorkoutSet;
  idx: number;
  setCount: number;
  updateSet: (idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet: (idx: number) => void;
  removeSet: (idx: number) => void;
}

function TimedSetRow({ set, idx, setCount, updateSet, toggleSet, removeSet }: TimedSetRowProps) {
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
          />
        </>
      )}
      {running ? (
        <button className="timed-stop-btn" onClick={handleStop}><Square size={13} /></button>
      ) : set.done ? (
        <button className="check-btn done" onClick={() => toggleSet(idx)}><Check size={13} /></button>
      ) : (
        <button className="timed-start-btn" onClick={handleStart}><Play size={13} /></button>
      )}
      <button className="rm-set-btn" onClick={() => removeSet(idx)} disabled={setCount <= 1}>
        <X size={13} />
      </button>
    </div>
  );
}

export default function ExerciseCard({ ex, pr, analysis, restPrefs, rest, onRemove, updateSet, toggleSet, addSet, removeSet, isNewPr, onPickRestTier, onAdjustRest, onStartCustomRest }: Props) {
  const [wL, rL] = colLabels(ex);
  const [deloadDone, setDeloadDone] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const doneCt = ex.sets.filter(s => s.done).length;
  const m      = EM[ex.id] || { p: [], s: [] };

  const isDeload  = analysis?.status === STATUS.DELOAD;
  const showDeload = isDeload && !deloadDone && ex.type === "strength";

  // Index of the set the user is currently working on — first set that hasn't
  // been checked. -1 means everything is done. Locks every set after this one
  // (and the add-set button) until the in-progress set is finished, so the
  // user can't fat-finger ahead.
  const activeIdx = ex.sets.findIndex(s => !s.done);
  const allDone   = activeIdx === -1;
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

  const acceptDeload = () => {
    if (!analysis) return;
    ex.sets.forEach((set, idx) => {
      if (set.done) return;
      updateSet(idx, "weight", String(analysis.nextWeight));
      updateSet(idx, "reps",   String(analysis.nextReps));
    });
    setDeloadDone(true);
  };

  const wStep = ex.type === "cardio" ? 5    : 2.5;
  const rStep = ex.type === "cardio" ? 0.5  : 1;
  const stepField = (idx: number, field: "weight" | "reps", delta: number) => {
    const step = field === "weight" ? wStep : rStep;
    const cur  = parseFloat(ex.sets[idx][field]);
    const base = Number.isFinite(cur) ? cur : 0;
    const next = Math.max(0, Math.round((base + delta * step) * 100) / 100);
    updateSet(idx, field, String(next));
  };

  return (
    <>
    <div className="ex-card">
      <div className="ex-hdr">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            <div className="ex-name">{ex.name}</div>
            {pr && <span className="pr-pill">PR {pr.weight}kg{pr.reps ? ` × ${pr.reps}` : ""}</span>}
          </div>
          <div className="ex-meta">
            <span style={{ color: TYPE_COLOR[ex.type] }}>●</span>
            <span>{doneCt}/{ex.sets.length} sets</span>
            {analysis && <span style={{ color: analysis.status.color }}>→ {analysis.nextWeight}kg × {analysis.nextReps}</span>}
            {analysis && ex.type === "strength" && (
              <button className="btn-progress" onClick={applyProgression} title="Apply coach recommendation to all sets">
                <TrendingUp size={15} /> APPLY
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
            {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
            {m.s.slice(0, 2).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
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
          <button className="btn-icon" onClick={onRemove} aria-label="Remove exercise"><X size={14} /></button>
        </div>
      </div>

      {showDeload && (
        <div className="deload-banner">
          <AlertTriangle size={14} className="deload-icon" />
          <div className="deload-body">
            <div className="deload-msg">
              Stuck at {analysis!.last.topW}kg for 3 sessions. Accept deload to {analysis!.nextWeight}kg?
            </div>
            <div className="deload-actions">
              <button className="btn-deload-confirm" onClick={acceptDeload}>
                <Check size={11} /> Accept Deload
              </button>
              <button className="btn-deload-skip" onClick={() => setDeloadDone(true)}>
                Keep Current
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="set-table">
        <div className="set-col-hdr">
          <div className="col-lbl">#</div>
          <div className="col-lbl">{wL}</div>
          <div className="col-lbl">{rL}</div>
          <div className="col-lbl"><Check size={11} /></div>
          <div className="col-lbl" />
        </div>
        {ex.type === "timed" ? (
          ex.sets.map((set, idx) => (
            <TimedSetRow
              key={idx}
              set={set}
              idx={idx}
              setCount={ex.sets.length}
              updateSet={updateSet}
              toggleSet={toggleSet}
              removeSet={removeSet}
            />
          ))
        ) : (
          ex.sets.map((set, idx) => {
            const showPrTag = ex.type === "strength" && isNewPr(set.weight) && !!set.weight;
            // For strength: only the in-progress set is interactive. Earlier
            // sets are read-only (checked off). Later sets are locked until
            // the current one is checked, so the user can't ghost-fill ahead.
            const isLocked = ex.type === "strength" && !set.done && idx !== activeIdx;
            const isHidden = setIsHidden(set);
            const rowCls   = [
              "set-row",
              set.done   ? "set-done"   : "",
              isLocked   ? "set-locked" : "",
              isHidden   ? "set-hidden" : "",
            ].filter(Boolean).join(" ");
            return (
              <div key={idx} className={rowCls} aria-hidden={isHidden || undefined}>
                <div className={`set-num ${set.done ? "done" : ""}`}>{idx + 1}</div>
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
                    type="number" inputMode="decimal" min="0" step={wStep}
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
            );
          })
        )}
        {ex.type === "strength" ? (
          <SetRestButton
            prefs={restPrefs}
            rest={rest}
            onAddSet={addSet}
            onPickTier={onPickRestTier}
            onAdjust={onAdjustRest}
            onStartCustom={onStartCustomRest}
          />
        ) : (
          <button className="btn-add-set" onClick={addSet} disabled={!allDone}>+ add set</button>
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
