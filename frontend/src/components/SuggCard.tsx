import { useState } from "react";
import { Eye, Plus, Check } from "lucide-react";
import type { SuggCardProps } from "../types";
import { MI } from "../data/muscles";
import { EXERCISE_INFO } from "../data/exerciseInfo";
import { snapshotMotion } from "../data/motionStorage";
import ExerciseAnimation from "./exercise/ExerciseAnimation";

export default function SuggCard({ ex, isAdded, onAdd, onRemove, onHover, onLeave }: SuggCardProps) {
  const newP = ex.newP ?? [];
  const ovP  = ex.ovP  ?? [];
  const newS = (ex.newS ?? []).slice(0, 3);
  const info = EXERCISE_INFO[ex.id];
  const motion = snapshotMotion(ex.id);
  const hasMuscles = newP.length > 0 || ovP.length > 0 || newS.length > 0;

  const [open, setOpen] = useState(false);

  const toggle = isAdded ? onRemove : onAdd;

  return (
    <div
      className={`sugg-card ${isAdded ? "added" : ""} ${ex.isFocus ? "focus-pick" : ""}`}
      onClick={toggle}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {ex.isFocus && <span className="sugg-focus-banner">FOCUS</span>}

      <div className="sugg-row">
        <div className="sugg-left">
          <div className="sugg-name">{ex.name}</div>
        </div>

        <button
          type="button"
          className={`sugg-info-btn ${open ? "open" : ""}`}
          aria-label={open ? "Hide how-to" : "Show how-to"}
          aria-expanded={open}
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        >
          <Eye size={18} />
        </button>

        <button
          type="button"
          className={`sugg-btn ${isAdded ? "added" : "add"}`}
          aria-label={isAdded ? "Remove exercise" : "Add exercise"}
          onClick={e => { e.stopPropagation(); toggle(); }}
        >
          {isAdded ? <Check size={22} /> : <Plus size={22} />}
        </button>
      </div>

      <div className={`sugg-info-wrap ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sugg-info">
          <div className="sugg-info-inner" onClick={e => e.stopPropagation()}>
            {hasMuscles && (
              <div className="sugg-muscles">
                {newP.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
                {ovP.map(mid  => <span key={mid} className="mtag overlap">{MI[mid]?.n}</span>)}
                {newS.map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
              </div>
            )}
            {motion && open && (
              <div className="sugg-info-anim">
                <ExerciseAnimation
                  frames={motion.frames}
                  duration={motion.duration}
                  bench={motion.bench}
                  floor={motion.floor}
                  rig={motion.rig}
                  equipment={motion.equipment}
                  width={140}
                  height={170}
                />
              </div>
            )}
            {info ? (
              <>
                <div className="sugg-info-row"><span className="label">Setup</span><span>{info.setup}</span></div>
                <div className="sugg-info-row"><span className="label">Execute</span><span>{info.execute}</span></div>
                <div className="sugg-info-row"><span className="label">Cue</span><span>{info.cue}</span></div>
              </>
            ) : (
              <div className="sugg-info-row sugg-info-empty">No how-to written for this exercise yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
