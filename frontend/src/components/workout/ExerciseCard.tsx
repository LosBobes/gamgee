import { useState, useEffect, useRef } from "react";
import { X, Check, Circle, Play, Square, TrendingUp, AlertTriangle } from "lucide-react";
import type { WorkoutExercise, PersonalRecord, WorkoutSet } from "../../types";
import type { AnalysisResult } from "../../analysis";
import { STATUS } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, TYPE_COLOR } from "../../data/exercises";

interface Props {
  ex:         WorkoutExercise;
  pr:         PersonalRecord | undefined;
  analysis:   AnalysisResult | null;
  onRemove:   () => void;
  updateSet:  (idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:  (idx: number) => void;
  addSet:     () => void;
  removeSet:  (idx: number) => void;
  isNewPr:    (weight: string) => boolean;
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

export default function ExerciseCard({ ex, pr, analysis, onRemove, updateSet, toggleSet, addSet, removeSet, isNewPr }: Props) {
  const [wL, rL] = colLabels(ex);
  const [deloadDone, setDeloadDone] = useState(false);
  const doneCt = ex.sets.filter(s => s.done).length;
  const m      = EM[ex.id] || { p: [], s: [] };

  const isDeload  = analysis?.status === STATUS.DELOAD;
  const showDeload = isDeload && !deloadDone && ex.type === "strength";

  const applyProgression = () => {
    if (!analysis) return;
    ex.sets.forEach((_, idx) => {
      updateSet(idx, "weight", String(analysis.nextWeight));
      updateSet(idx, "reps",   String(analysis.nextReps));
    });
  };

  const acceptDeload = () => {
    if (!analysis) return;
    ex.sets.forEach((_, idx) => {
      updateSet(idx, "weight", String(analysis.nextWeight));
      updateSet(idx, "reps",   String(analysis.nextReps));
    });
    setDeloadDone(true);
  };

  return (
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
        <button className="btn-icon" onClick={onRemove}><X size={14} /></button>
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
            return (
              <div key={idx} className="set-row">
                <div className={`set-num ${set.done ? "done" : ""}`}>{idx + 1}</div>
                <div className="inp-wrap">
                  <input
                    className={`set-inp ${set.done ? "done" : ""}`}
                    type="number" min="0" step="0.5"
                    placeholder={ex.type === "cardio" ? "30" : "0"}
                    value={set.weight}
                    onChange={e => updateSet(idx, "weight", e.target.value)}
                  />
                  {showPrTag && <span className="new-pr-tag">NEW PR!</span>}
                </div>
                <input
                  className={`set-inp ${set.done ? "done" : ""}`}
                  type="number" min="0" step="1"
                  placeholder={ex.type === "cardio" ? "5.0" : "0"}
                  value={set.reps}
                  onChange={e => updateSet(idx, "reps", e.target.value)}
                />
                <button className={`check-btn ${set.done ? "done" : ""}`} onClick={() => toggleSet(idx)}>
                  {set.done ? <Check size={13} /> : <Circle size={13} />}
                </button>
                <button
                  className="rm-set-btn"
                  onClick={() => removeSet(idx)}
                  disabled={ex.sets.length <= 1}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })
        )}
        <button className="btn-add-set" onClick={addSet}>+ add set</button>
      </div>
    </div>
  );
}
