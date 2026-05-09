import { X, Check, Circle } from "lucide-react";
import type { WorkoutExercise, PersonalRecord, WorkoutSet } from "../../types";
import type { AnalysisResult } from "../../analysis";
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
  : ex.type === "timed" ? ["DURATION (s)", "NOTES"]
  : ["WEIGHT (kg)", "REPS"];

export default function ExerciseCard({ ex, pr, analysis, onRemove, updateSet, toggleSet, addSet, removeSet, isNewPr }: Props) {
  const [wL, rL] = colLabels(ex);
  const doneCt   = ex.sets.filter(s => s.done).length;
  const m        = EM[ex.id] || { p: [], s: [] };

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
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
            {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
            {m.s.slice(0, 2).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
          </div>
        </div>
        <button className="btn-icon" onClick={onRemove}><X size={14} /></button>
      </div>

      <div className="set-table">
        <div className="set-col-hdr">
          <div className="col-lbl">#</div>
          <div className="col-lbl">{wL}</div>
          <div className="col-lbl">{rL}</div>
          <div className="col-lbl"><Check size={11} /></div>
          <div className="col-lbl" />
        </div>
        {ex.sets.map((set, idx) => {
          const showPrTag = ex.type === "strength" && isNewPr(set.weight) && !!set.weight;
          return (
            <div key={idx} className="set-row">
              <div className={`set-num ${set.done ? "done" : ""}`}>{idx + 1}</div>
              <div className="inp-wrap">
                <input
                  className={`set-inp ${set.done ? "done" : ""}`}
                  type="number" min="0" step="0.5"
                  placeholder={ex.type === "cardio" ? "30" : ex.type === "timed" ? "60" : "0"}
                  value={set.weight}
                  onChange={e => updateSet(idx, "weight", e.target.value)}
                />
                {showPrTag && <span className="new-pr-tag">NEW PR!</span>}
              </div>
              <input
                className={`set-inp ${set.done ? "done" : ""}`}
                type={ex.type === "timed" ? "text" : "number"} min="0" step="1"
                placeholder={ex.type === "cardio" ? "5.0" : ex.type === "timed" ? "—" : "0"}
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
        })}
        <button className="btn-add-set" onClick={addSet}>+ add set</button>
      </div>
    </div>
  );
}
