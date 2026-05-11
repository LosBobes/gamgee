import { useRef } from "react";
import type { CardioPlan, ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession } from "../../types";
import WizardStart from "./WizardStart";
import WizardFocus from "./WizardFocus";
import WizardCardio from "./WizardCardio";
import WizardBuild from "./WizardBuild";
import WizardReview from "./WizardReview";
import ActiveWorkout from "./ActiveWorkout";

interface Props {
  active:         boolean;
  wStep:          number;
  setWStep:       (s: number) => void;
  focus:          string | null;
  setFocus:       (f: string) => void;
  cardio:         CardioPlan;
  setCardio:      (c: CardioPlan) => void;
  planned:        ExerciseDef[];
  setPlanned:     (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  exercises:      WorkoutExercise[];
  prs:            PRDict;
  history:        WorkoutSession[];
  doneSets:       number;
  startFromWizard: (autoFill: boolean) => void;
  addExercise:    (ex: ExerciseDef) => void;
  removeExercise: (uid: string) => void;
  updateSet:      (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:      (uid: string, idx: number) => void;
  addSet:         (uid: string) => void;
  removeSet:      (uid: string, idx: number) => void;
  isNewPr:        (exId: string, weight: string) => boolean;
  finishWorkout:  () => void;
}

export default function WorkoutTab({ active, wStep, setWStep, focus, setFocus, cardio, setCardio, planned, setPlanned, exercises, prs, history, doneSets, startFromWizard, addExercise, removeExercise, updateSet, toggleSet, addSet, removeSet, isNewPr, finishWorkout }: Props) {
  const prevStepRef = useRef(wStep);
  const goingBack = wStep < prevStepRef.current;
  prevStepRef.current = wStep;
  const stepAnim = goingBack ? "wstep-anim-back" : "wstep-anim";

  return (
    <>
      {!active && wStep === 0 && (
        <div key="wstep-0" className={stepAnim}>
          <WizardStart lastSession={history[0] ?? null} onStart={() => setWStep(1)} />
        </div>
      )}
      {!active && wStep === 1 && (
        <div key="wstep-1" className={stepAnim}>
          <WizardFocus
            focus={focus}
            setFocus={setFocus}
            onBack={() => setWStep(0)}
            onNext={() => setWStep(2)}
          />
        </div>
      )}
      {!active && wStep === 2 && (
        <div key="wstep-2" className={stepAnim}>
          <WizardCardio
            plan={cardio}
            setPlan={setCardio}
            onBack={() => setWStep(1)}
            onNext={() => setWStep(3)}
          />
        </div>
      )}
      {!active && wStep === 3 && focus && (
        <div key="wstep-3" className={stepAnim}>
          <WizardBuild
            focus={focus}
            planned={planned}
            setPlanned={setPlanned}
            onBack={() => setWStep(2)}
            onNext={() => setWStep(4)}
            history={history}
          />
        </div>
      )}
      {!active && wStep === 4 && focus && (
        <div key="wstep-4" className={stepAnim}>
          <WizardReview
            planned={planned}
            setPlanned={setPlanned}
            history={history}
            onBack={() => setWStep(3)}
            onStart={startFromWizard}
            focus={focus}
            cardio={cardio}
          />
        </div>
      )}
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
