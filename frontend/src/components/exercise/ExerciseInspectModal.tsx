import { useEffect, useState } from "react";
import { X, Pause, Play } from "lucide-react";
import ExerciseAnimation from "./ExerciseAnimation";
import { snapshotMotion } from "../../data/motionStorage";
import { EXERCISE_INFO } from "../../data/exerciseInfo";

interface Props {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}

export default function ExerciseInspectModal({ exerciseId, exerciseName, onClose }: Props) {
  const motion = snapshotMotion(exerciseId);
  const info = EXERCISE_INFO[exerciseId];
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card ex-inspect-modal" onClick={e => e.stopPropagation()}>
        <div className="ex-inspect-hdr">
          <div className="ex-inspect-name">{exerciseName}</div>
          <button
            type="button"
            className="ex-inspect-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {motion ? (
          <div className="ex-inspect-anim-wrap">
            <ExerciseAnimation
              frames={motion.frames}
              duration={motion.duration}
              bench={motion.bench}
              floor={motion.floor}
              rig={motion.rig}
              equipment={motion.equipment}
              paused={paused}
              width={220}
              height={260}
            />
            <button
              type="button"
              className="ex-inspect-playpause"
              onClick={() => setPaused(p => !p)}
              aria-label={paused ? "Play animation" : "Pause animation"}
              title={paused ? "Play" : "Pause"}
            >
              {paused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          </div>
        ) : (
          <div className="ex-inspect-no-anim">No animation available for this exercise yet.</div>
        )}

        {info && (
          <div className="ex-inspect-info">
            <div className="ex-inspect-row"><span className="label">Setup</span><span>{info.setup}</span></div>
            <div className="ex-inspect-row"><span className="label">Execute</span><span>{info.execute}</span></div>
            <div className="ex-inspect-row"><span className="label">Cue</span><span>{info.cue}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
