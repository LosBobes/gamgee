import { useMemo, useState } from "react";
import { Check, ArrowRight, Heart, X, Clock } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { EM } from "../../data/exercises";
import { MI } from "../../data/muscles";
import { pickStretches, type Stretch } from "../../data/stretches";

interface Props {
  session: WorkoutSession;
  onDone: () => void;
}

// Collect every muscle group hit during the session (primary + secondary).
function workedGroups(session: WorkoutSession): Set<string> {
  const groups = new Set<string>();
  for (const ex of session.exercises) {
    const m = EM[ex.id];
    if (!m) continue;
    [...m.p, ...m.s].forEach(mid => {
      const info = MI[mid];
      if (info?.g) groups.add(info.g);
    });
  }
  return groups;
}

export default function WorkoutComplete({ session, onDone }: Props) {
  const [stage, setStage] = useState<"prompt" | "stretch">("prompt");
  const [doneIdx, setDoneIdx] = useState<Set<number>>(new Set());

  const groups = useMemo(() => workedGroups(session), [session]);
  const stretches = useMemo(() => pickStretches(groups), [groups]);

  if (stage === "prompt") {
    return (
      <div className="complete-screen">
        <div className="complete-icon"><Check size={48} /></div>
        <h1 className="complete-hero">NICE<br /><span>WORK</span></h1>
        <p className="complete-sub">
          You hit {session.exercises.length} exercise{session.exercises.length === 1 ? "" : "s"}
          {groups.size > 0 && <> across {groups.size} muscle group{groups.size === 1 ? "" : "s"}</>}.
        </p>

        <div className="complete-prompt">
          <Heart size={20} className="complete-prompt-icon" />
          <div>
            <div className="complete-prompt-title">Want to stretch?</div>
            <div className="complete-prompt-sub">
              We'll suggest a few based on what you trained today.
            </div>
          </div>
        </div>

        <div className="complete-actions">
          <button className="btn-secondary" onClick={onDone}>
            <X size={14} /> SKIP
          </button>
          <button className="btn-start" onClick={() => setStage("stretch")} disabled={stretches.length === 0}>
            YES, STRETCH <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Stretch view
  const allDone = doneIdx.size === stretches.length;

  const toggle = (i: number) =>
    setDoneIdx(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  return (
    <div className="stretch-screen">
      <div className="stretch-header">
        <div className="stretch-title">COOL DOWN</div>
        <div className="stretch-sub">{stretches.length} stretches · ~{estimatedMinutes(stretches)} min</div>
      </div>

      <div className="stretch-list">
        {stretches.map((s, i) => (
          <StretchCard
            key={i}
            stretch={s}
            done={doneIdx.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      <div className="complete-actions">
        <button className="btn-secondary" onClick={onDone}>
          <X size={14} /> SKIP REST
        </button>
        <button className="btn-finish" onClick={onDone}>
          <Check size={14} /> {allDone ? "ALL DONE" : "FINISH"}
        </button>
      </div>
    </div>
  );
}

function StretchCard({ stretch, done, onToggle }: { stretch: Stretch; done: boolean; onToggle: () => void }) {
  return (
    <div className={`stretch-card ${done ? "stretch-card-done" : ""}`}>
      <button className="stretch-check" onClick={onToggle} aria-label={done ? "Mark not done" : "Mark done"}>
        {done ? <Check size={16} /> : <span className="stretch-check-empty" />}
      </button>
      <div className="stretch-body">
        <div className="stretch-card-head">
          <div className="stretch-name">{stretch.name}</div>
          <div className="stretch-meta">
            <Clock size={12} /> {stretch.duration}s{stretch.perSide ? " / side" : ""}
          </div>
        </div>
        <div className="stretch-cue">{stretch.cue}</div>
        <div className="stretch-tag">{stretch.group}</div>
      </div>
    </div>
  );
}

function estimatedMinutes(list: Stretch[]): number {
  const totalSec = list.reduce((a, s) => a + s.duration * (s.perSide ? 2 : 1), 0);
  return Math.max(1, Math.round(totalSec / 60));
}
