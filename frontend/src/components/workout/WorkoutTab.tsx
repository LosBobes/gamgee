import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CardioPlan, DayPlan, ExerciseConfig, ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession, WeeklyPlan, ProgressionSpeed, RestPrefs, WizardTransitionStyle } from "../../types";
import WizardStart from "./WizardStart";
import WizardMode from "./WizardMode";
import WizardFocus from "./WizardFocus";
import WizardCardio from "./WizardCardio";
import WizardBuild from "./WizardBuild";
import WizardPrescribe from "./WizardPrescribe";
import WizardWeeklySetup from "./WizardWeeklySetup";
import ActiveWorkout from "./ActiveWorkout";

interface Props {
  active:          boolean;
  wStep:           number;
  setWStep:        (s: number) => void;
  focus:           string | null;
  setFocus:        (f: string) => void;
  cardio:          CardioPlan;
  setCardio:       (c: CardioPlan) => void;
  planned:         ExerciseDef[];
  setPlanned:      (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  exercises:       WorkoutExercise[];
  prs:             PRDict;
  history:         WorkoutSession[];
  doneSets:        number;
  weeklyPlan:      WeeklyPlan | null;
  setWeeklyPlan:   (plan: WeeklyPlan) => void;
  progressionSpeed: ProgressionSpeed;
  onProgressionSpeedChange: (speed: ProgressionSpeed) => void;
  rpeMultipliers:  Record<string, number> | null;
  restPrefs:       RestPrefs;
  wizardTransition: WizardTransitionStyle;
  authFetch:       (url: string, opts?: RequestInit) => Promise<Response>;
  onLoadToday:     (plan: DayPlan) => void;
  startFromWizard: (autoFill: boolean) => void;
  /** Pre-existing per-exercise prescribe configs (from a regime day or the
   * user's last-used RPE setup); seeded into the prescribe step when the
   * user picks RPE-driven mode. */
  prescribeInitialConfigs: Record<string, ExerciseConfig>;
  startFromPrescribe: (configs: Record<string, ExerciseConfig>) => void;
  addExercise:     (ex: ExerciseDef) => void;
  removeExercise:  (uid: string) => void;
  updateSet:       (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  setSetRpe:       (uid: string, idx: number, rpe: number | null) => void;
  toggleSet:       (uid: string, idx: number) => void;
  addSet:          (uid: string) => void;
  removeSet:       (uid: string, idx: number) => void;
  isNewPr:         (exId: string, weight: string) => boolean;
  finishWorkout:   () => void;
  applyProgressionAll: () => void;
}

export default function WorkoutTab({
  active, wStep, setWStep, focus, setFocus, cardio, setCardio,
  planned, setPlanned, exercises, prs, history, doneSets,
  weeklyPlan, setWeeklyPlan, progressionSpeed, onProgressionSpeedChange, rpeMultipliers, restPrefs, wizardTransition, authFetch, onLoadToday,
  startFromWizard, prescribeInitialConfigs, startFromPrescribe, addExercise, removeExercise,
  updateSet, setSetRpe, toggleSet, addSet, removeSet, isNewPr, finishWorkout, applyProgressionAll,
}: Props) {
  const prevStepRef = useRef(wStep);
  const goingBack   = wStep < prevStepRef.current;
  prevStepRef.current = wStep;
  const stepAnim = goingBack ? "wstep-anim-back" : "wstep-anim";

  // Capture the latest pointerdown coordinates so the earthquake can radiate
  // from wherever the user actually tapped, rather than the screen centre.
  const lastClickRef = useRef<{ x: number; y: number }>({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      lastClickRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [quake, setQuake] = useState<{ vx: number; vy: number; lx: number; ly: number; id: number } | null>(null);
  const triggerQuake = useCallback(() => {
    const { x: vx, y: vy } = lastClickRef.current;
    const rect = hostRef.current?.getBoundingClientRect();
    const lx = rect ? vx - rect.left : vx;
    const ly = rect ? vy - rect.top  : vy;
    setQuake({ vx, vy, lx, ly, id: Date.now() + Math.random() });
  }, []);
  useEffect(() => {
    if (!quake) return;
    const t = window.setTimeout(() => setQuake(null), 650);
    return () => window.clearTimeout(t);
  }, [quake]);

  const setWStepQuake = useCallback((s: number) => {
    if (s !== wStep) triggerQuake();
    setWStep(s);
  }, [wStep, setWStep, triggerQuake]);
  const onLoadTodayQuake = useCallback((plan: DayPlan) => {
    triggerQuake();
    onLoadToday(plan);
  }, [onLoadToday, triggerQuake]);
  const startFromWizardQuake = useCallback((autoFill: boolean) => {
    triggerQuake();
    startFromWizard(autoFill);
  }, [startFromWizard, triggerQuake]);
  const startFromPrescribeQuake = useCallback((configs: Record<string, ExerciseConfig>) => {
    triggerQuake();
    startFromPrescribe(configs);
  }, [startFromPrescribe, triggerQuake]);

  const hostStyle: CSSProperties | undefined = quake
    ? ({ "--quake-x": `${quake.lx}px`, "--quake-y": `${quake.ly}px` } as CSSProperties)
    : undefined;
  const rippleStyle: CSSProperties | undefined = quake
    ? ({ "--quake-x": `${quake.vx}px`, "--quake-y": `${quake.vy}px` } as CSSProperties)
    : undefined;

  const shakingNow = quake && wizardTransition === "earthquake";

  return (
    <>
      <div ref={hostRef} className={`wtab-quake-host${shakingNow ? " earthquake-shake" : ""}`} style={hostStyle}>
      {/* Step 0 — landing */}
      {!active && wStep === 0 && (
        <div key="wstep-0" className={stepAnim}>
          <WizardStart lastSession={history[0] ?? null} onStart={() => setWStepQuake(1)} />
        </div>
      )}

      {/* Step 1 — mode: single vs weekly plan */}
      {!active && wStep === 1 && (
        <div key="wstep-1" className={stepAnim}>
          <WizardMode
            weeklyPlan={weeklyPlan}
            onSingle={() => setWStepQuake(2)}
            onLoadToday={onLoadTodayQuake}
            onSetupPlan={() => setWStepQuake(6)}
            onBack={() => setWStepQuake(0)}
          />
        </div>
      )}

      {/* Step 2 — focus */}
      {!active && wStep === 2 && (
        <div key="wstep-2" className={stepAnim}>
          <WizardFocus
            focus={focus}
            setFocus={setFocus}
            onBack={() => setWStepQuake(1)}
            onNext={() => setWStepQuake(3)}
          />
        </div>
      )}

      {/* Step 3 — cardio */}
      {!active && wStep === 3 && (
        <div key="wstep-3" className={stepAnim}>
          <WizardCardio
            plan={cardio}
            setPlan={setCardio}
            onBack={() => setWStepQuake(2)}
            onNext={() => setWStepQuake(4)}
          />
        </div>
      )}

      {/* Step 4 — build (also starts the workout, no separate review screen) */}
      {!active && wStep === 4 && focus && (
        <div key="wstep-4" className={stepAnim}>
          <WizardBuild
            focus={focus}
            planned={planned}
            setPlanned={setPlanned}
            onBack={() => setWStepQuake(3)}
            onStart={startFromWizardQuake}
            onConfigureRpe={() => setWStepQuake(5)}
            history={history}
          />
        </div>
      )}

      {/* Step 5 — RPE-driven prescription setup */}
      {!active && wStep === 5 && (
        <div key="wstep-5" className={stepAnim}>
          <WizardPrescribe
            planned={planned}
            prs={prs}
            history={history}
            initialConfigs={prescribeInitialConfigs}
            onBack={() => setWStepQuake(4)}
            onStart={startFromPrescribeQuake}
          />
        </div>
      )}

      {/* Step 6 — weekly plan editor */}
      {!active && wStep === 6 && (
        <div key="wstep-6" className={stepAnim}>
          <WizardWeeklySetup
            initial={weeklyPlan}
            onPersist={setWeeklyPlan}
            onDone={() => setWStepQuake(1)}
            progressionSpeed={progressionSpeed}
            onProgressionSpeedChange={onProgressionSpeedChange}
            authFetch={authFetch}
          />
        </div>
      )}

      {/* Active workout */}
      {active && (
        <div className="screen-anim">
          <ActiveWorkout
            exercises={exercises}
            prs={prs}
            history={history}
            doneSets={doneSets}
            progressionSpeed={progressionSpeed}
            rpeMultipliers={rpeMultipliers}
            restPrefs={restPrefs}
            onFinish={finishWorkout}
            addExercise={addExercise}
            removeExercise={removeExercise}
            updateSet={updateSet}
            setSetRpe={setSetRpe}
            toggleSet={toggleSet}
            addSet={addSet}
            removeSet={removeSet}
            isNewPr={isNewPr}
            applyProgressionAll={applyProgressionAll}
          />
        </div>
      )}
      </div>
      {quake && wizardTransition !== "none" && (
        <div
          key={quake.id}
          className={`wz-fx wz-fx-${wizardTransition}`}
          style={rippleStyle}
          aria-hidden
        />
      )}
    </>
  );
}
