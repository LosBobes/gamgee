import { useRef } from "react";
import type { CardioPlan, DayPlan, ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession, WeeklyPlan } from "../../types";
import WizardStart from "./WizardStart";
import WizardMode from "./WizardMode";
import WizardFocus from "./WizardFocus";
import WizardCardio from "./WizardCardio";
import WizardBuild from "./WizardBuild";
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
  onLoadToday:     (plan: DayPlan) => void;
  startFromWizard: (autoFill: boolean) => void;
  addExercise:     (ex: ExerciseDef) => void;
  removeExercise:  (uid: string) => void;
  updateSet:       (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:       (uid: string, idx: number) => void;
  addSet:          (uid: string) => void;
  removeSet:       (uid: string, idx: number) => void;
  isNewPr:         (exId: string, weight: string) => boolean;
  finishWorkout:   () => void;
}

export default function WorkoutTab({
  active, wStep, setWStep, focus, setFocus, cardio, setCardio,
  planned, setPlanned, exercises, prs, history, doneSets,
  weeklyPlan, setWeeklyPlan, onLoadToday,
  startFromWizard, addExercise, removeExercise,
  updateSet, toggleSet, addSet, removeSet, isNewPr, finishWorkout,
}: Props) {
  const prevStepRef = useRef(wStep);
  const goingBack   = wStep < prevStepRef.current;
  prevStepRef.current = wStep;
  const stepAnim = goingBack ? "wstep-anim-back" : "wstep-anim";

  return (
    <>
      {/* Step 0 — landing */}
      {!active && wStep === 0 && (
        <div key="wstep-0" className={stepAnim}>
          <WizardStart lastSession={history[0] ?? null} onStart={() => setWStep(1)} />
        </div>
      )}

      {/* Step 1 — mode: single vs weekly plan */}
      {!active && wStep === 1 && (
        <div key="wstep-1" className={stepAnim}>
          <WizardMode
            weeklyPlan={weeklyPlan}
            onSingle={() => setWStep(2)}
            onLoadToday={onLoadToday}
            onSetupPlan={() => setWStep(6)}
            onBack={() => setWStep(0)}
          />
        </div>
      )}

      {/* Step 2 — focus */}
      {!active && wStep === 2 && (
        <div key="wstep-2" className={stepAnim}>
          <WizardFocus
            focus={focus}
            setFocus={setFocus}
            onBack={() => setWStep(1)}
            onNext={() => setWStep(3)}
          />
        </div>
      )}

      {/* Step 3 — cardio */}
      {!active && wStep === 3 && (
        <div key="wstep-3" className={stepAnim}>
          <WizardCardio
            plan={cardio}
            setPlan={setCardio}
            onBack={() => setWStep(2)}
            onNext={() => setWStep(4)}
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
            onBack={() => setWStep(3)}
            onStart={startFromWizard}
            history={history}
          />
        </div>
      )}

      {/* Step 6 — weekly plan editor */}
      {!active && wStep === 6 && (
        <div key="wstep-6" className={stepAnim}>
          <WizardWeeklySetup
            initial={weeklyPlan}
            onPersist={setWeeklyPlan}
            onDone={() => setWStep(1)}
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
            onFinish={finishWorkout}
            addExercise={addExercise}
            removeExercise={removeExercise}
            updateSet={updateSet}
            toggleSet={toggleSet}
            addSet={addSet}
            removeSet={removeSet}
            isNewPr={isNewPr}
          />
        </div>
      )}
    </>
  );
}
