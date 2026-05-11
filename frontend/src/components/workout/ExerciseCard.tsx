import { useState, useEffect, useRef } from "react";
import { X, Check, Circle, Play, Square, Link2, Link2Off } from "lucide-react";
import type { WorkoutExercise, PersonalRecord, WorkoutSet } from "../../types";
import type { AnalysisResult } from "../../analysis";
import { MI } from "../../data/muscles";
import { EM, TYPE_COLOR } from "../../data/exercises";

interface Props {
  ex:           WorkoutExercise;
  pr:           PersonalRecord | undefined;
  analysis:     AnalysisResult | null;
  linked:       boolean;
  isLinkSource: boolean;
  isLinkTarget: boolean;
  onRemove:     () => void;
  updateSet:    (idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:    (idx: number) => void;
  addSet:       () => void;
  removeSet:    (idx: number) => void;
  addDropSet:   () => void;
  onLinkClick:  () => void;
  isNewPr:      (weight: string) => boolean;
}

const colLabels = (ex: WorkoutExercise): [string, string] =>
  ex.type === "cardio" ? ["DURATION (min)", "DIST (km)"]
  : ex.type === "timed" ? ["RECORDED (s)", "NOTES"]
  : ["WEIGHT (kg)", "REPS"];

interface TimedSetRowProps {
  set:       WorkoutSet;
  idx:       number;
  setCount:  number;
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

export default function ExerciseCard({ ex, pr, analysis, linked, isLinkSource, isLinkTarget, onRemove, updateSet, toggleSet, addSet, removeSet, addDropSet, onLinkClick, isNewPr }: Props) {
  const [wL, rL] = colLabels(ex);
  const doneCt   = ex.sets.filter(s => s.done).length;
  const m        = EM[ex.id] || { p: [], s: [] };

  const cardClass = [
    "ex-card",
    isLinkSource ? "ex-card-link-source" : "",
    isLinkTarget ? "ex-card-link-target" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cardClass} onClick={isLinkTarget ? onLinkClick : undefined} style={isLinkTarget ? { cursor: "pointer" } : undefined}>
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
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
            {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
            {m.s.slice(0, 2).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            className={["btn-icon", "link-btn", linked ? "link-btn-linked" : "", isLinkSource ? "link-btn-source" : ""].filter(Boolean).join(" ")}
            onClick={e => { e.stopPropagation(); onLinkClick(); }}
            title={linked ? "Unlink superset" : isLinkSource ? "Cancel superset" : "Create superset"}
          >
            {linked ? <Link2Off size={14} /> : <Link2 size={14} />}
          </button>
          <button className="btn-icon" onClick={onRemove}><X size={14} /></button>
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
              <div key={idx} className={`set-row${set.drop ? " drop-set-row" : ""}`}>
                <div className={`set-num${set.done ? " done" : ""}${set.drop ? " drop-num" : ""}`}>
                  {set.drop ? "↓" : idx + 1}
                </div>
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
        <div className="set-footer">
          <button className="btn-add-set" onClick={addSet}>+ add set</button>
          {ex.type === "strength" && (
            <button className="btn-drop-set" onClick={addDropSet}>↓ drop</button>
          )}
        </div>
      </div>
    </div>
  );
}
