import type { ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession } from "../../types";
import WizardStart from "./WizardStart";
import WizardFocus from "./WizardFocus";
import WizardBuild from "./WizardBuild";
import WizardReview from "./WizardReview";
import ActiveWorkout from "./ActiveWorkout";

interface Props {
  active:         boolean;
  wStep:          number;
  setWStep:       (s: number) => void;
  focus:          string | null;
  setFocus:       (f: string) => void;
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

export default function WorkoutTab({ active, wStep, setWStep, focus, setFocus, planned, setPlanned, exercises, prs, history, doneSets, startFromWizard, addExercise, removeExercise, updateSet, toggleSet, addSet, removeSet, isNewPr, finishWorkout }: Props) {
  return (
    <>
      {!active && wStep === 0 && (
        <WizardStart lastSession={history[0] ?? null} onStart={() => setWStep(1)} />
      )}
      {!active && wStep === 1 && (
        <WizardFocus
          focus={focus}
          setFocus={setFocus}
          onBack={() => setWStep(0)}
          onNext={() => setWStep(2)}
        />
      )}
      {!active && wStep === 2 && focus && (
        <WizardBuild
          focus={focus}
          planned={planned}
          setPlanned={setPlanned}
          onBack={() => setWStep(1)}
          onNext={() => setWStep(3)}
          history={history}
        />
      )}
      {!active && wStep === 3 && focus && (
        <WizardReview
          planned={planned}
          setPlanned={setPlanned}
          history={history}
          onBack={() => setWStep(2)}
          onStart={startFromWizard}
          focus={focus}
        />
      )}
      {active && (
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
      )}
    </>
  );
}
