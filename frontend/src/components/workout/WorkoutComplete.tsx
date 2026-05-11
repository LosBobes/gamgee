import { useMemo, useState, useEffect } from "react";
import { Check, ArrowRight, Heart, X, Clock } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { EM } from "../../data/exercises";
import { MI } from "../../data/muscles";
import { pickStretches, type Stretch } from "../../data/stretches";
import { useTxt } from "../../context/ToneContext";

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
  const t = useTxt();

  const groups = useMemo(() => workedGroups(session), [session]);
  const stretches = useMemo(() => pickStretches(groups), [groups]);

  if (stage === "prompt") {
    return (
      <div className="complete-screen tab-anim">
        <div className="complete-icon"><Check size={48} /></div>
        <h1 className="complete-hero">{t("NICE", "BEAST")}<br /><span>{t("WORK", "MODE")}</span></h1>
        <p className="complete-sub">
          {t("You hit", "You crushed")} {session.exercises.length} exercise{session.exercises.length === 1 ? "" : "s"}
          {groups.size > 0 && <> across {groups.size} muscle group{groups.size === 1 ? "" : "s"}</>}.{t("", " Absolute unit.")}
        </p>

        <div className="complete-prompt">
          <Heart size={20} className="complete-prompt-icon" />
          <div>
            <div className="complete-prompt-title">{t("Want to stretch?", "Don't skip the cooldown")}</div>
            <div className="complete-prompt-sub">
              {t("We'll suggest a few based on what you trained today.", "Stretch it out. Your future self will thank you.")}
            </div>
          </div>
        </div>

        <div className="complete-actions">
          <button className="btn-secondary" onClick={onDone}>
            <X size={14} /> SKIP
          </button>
          <button className="btn-start" onClick={() => setStage("stretch")} disabled={stretches.length === 0}>
            {t("YES, STRETCH", "LET'S STRETCH")} <ArrowRight size={14} />
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
          <Check size={14} /> {allDone ? t("ALL DONE", "CRUSHED IT") : "FINISH"}
        </button>
      </div>
    </div>
  );
}

function StretchCard({ stretch, done, onToggle }: { stretch: Stretch; done: boolean; onToggle: () => void }) {
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(stretch.duration);
  const [side, setSide] = useState<1 | 2>(1);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      if (stretch.perSide && side === 1) {
        setTimerActive(false);
        setSwitching(true);
      } else {
        setTimerActive(false);
        setTimeLeft(stretch.duration);
        setSide(1);
        if (!done) onToggle();
      }
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  const handleStart = () => { setTimeLeft(stretch.duration); setSide(1); setSwitching(false); setTimerActive(true); };
  const handleFlip  = () => { setTimeLeft(stretch.duration); setSide(2); setSwitching(false); setTimerActive(true); };
  const handleStop  = () => { setTimerActive(false); setTimeLeft(stretch.duration); setSide(1); setSwitching(false); };

  if (switching) {
    return (
      <div className="stretch-card stretch-card-switch">
        <div className="stretch-timer-body">
          <div className="stretch-name">{stretch.name}</div>
          <div className="stretch-switch-prompt">SWITCH SIDES</div>
          <div className="stretch-cue">{stretch.cue}</div>
          <div className="stretch-timer-actions">
            <button className="stretch-stop-btn" onClick={handleStop}>DONE</button>
            <button className="stretch-start-btn" onClick={handleFlip}>OTHER SIDE</button>
          </div>
        </div>
      </div>
    );
  }

  if (timerActive) {
    const progress = timeLeft / stretch.duration;
    return (
      <div className="stretch-card stretch-card-active">
        <div className="stretch-timer-body">
          <div className="stretch-card-head" style={{ width: "100%", justifyContent: "space-between" }}>
            <div className="stretch-name">{stretch.name}</div>
            {stretch.perSide && <div className="stretch-side-label">{side === 1 ? "LEFT" : "RIGHT"}</div>}
          </div>
          <div className="stretch-countdown">{timeLeft}</div>
          <div className="stretch-progress-bar">
            <div className="stretch-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="stretch-cue">{stretch.cue}</div>
          <button className="stretch-stop-btn" onClick={handleStop}>STOP</button>
        </div>
      </div>
    );
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="stretch-tag">{stretch.group}</div>
          {!done && <button className="stretch-start-btn" onClick={handleStart}>START</button>}
        </div>
      </div>
    </div>
  );
}

function estimatedMinutes(list: Stretch[]): number {
  const totalSec = list.reduce((a, s) => a + s.duration * (s.perSide ? 2 : 1), 0);
  return Math.max(1, Math.round(totalSec / 60));
}
