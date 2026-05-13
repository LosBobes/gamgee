import { useState } from "react";
import { Check, Dumbbell } from "lucide-react";
import type { ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession } from "../../types";
import { analyzeEx } from "../../analysis";
import ExerciseCard from "./ExerciseCard";
import ExercisePicker from "../ExercisePicker";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  exercises:      WorkoutExercise[];
  prs:            PRDict;
  history:        WorkoutSession[];
  doneSets:       number;
  onFinish:       () => void;
  addExercise:    (ex: ExerciseDef) => void;
  removeExercise: (uid: string) => void;
  updateSet:      (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:      (uid: string, idx: number) => void;
  addSet:         (uid: string) => void;
  removeSet:      (uid: string, idx: number) => void;
  isNewPr:        (exId: string, weight: string) => boolean;
}

export default function ActiveWorkout({ exercises, prs, history, doneSets, onFinish, addExercise, removeExercise, updateSet, toggleSet, addSet, removeSet, isNewPr }: Props) {
  const [showPick, setShowPick] = useState(false);
  const t = useTxt();

  const handleAdd = (ex: ExerciseDef) => {
    addExercise(ex);
    setShowPick(false);
  };

  return (
    <>
      <OnboardingHint hintKey="active" step="GO TIME" title={t("Log each set as you go", "Log each set as you go", "Log each set as you serve")}>
        {t(
          "For every set: type weight + reps, then check the box. The timer at the top tracks your session. Hit FINISH when you're done — at least one set has to be checked off.",
          "Punch in weight + reps, tap the checkbox. Timer up top tracks the session. Hit FINISH when you're cooked — needs at least one set checked.",
          "Punch in weight + reps, tap the checkbox. Timer up top tracks the session. Hit FINISH when you're cooked — needs at least one set checked, bestie."
        )}
      </OnboardingHint>

      <div className="wx-actions">
        <button className="btn-add-ex" onClick={() => setShowPick(true)}>+ ADD EXERCISE</button>
        <button className="btn-finish" onClick={onFinish} disabled={doneSets === 0}><Check size={14} /> FINISH</button>
      </div>

      {exercises.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><Dumbbell size={40} /></div>
          <div className="empty-label">{t("No exercises yet", "Add something. The bar isn't going to lift itself.", "Add something, bestie. The bar isn't lifting itself.")}</div>
        </div>
      )}

      {exercises.map(ex => (
        <ExerciseCard
          key={ex.uid}
          ex={ex}
          pr={prs[ex.id]}
          analysis={analyzeEx(ex.id, history)}
          onRemove={() => removeExercise(ex.uid)}
          updateSet={(idx, field, val) => updateSet(ex.uid, idx, field, val)}
          toggleSet={(idx) => toggleSet(ex.uid, idx)}
          addSet={() => addSet(ex.uid)}
          removeSet={(idx) => removeSet(ex.uid, idx)}
          isNewPr={(w) => isNewPr(ex.id, w)}
        />
      ))}

      {showPick && (
        <ExercisePicker prs={prs} onAdd={handleAdd} onClose={() => setShowPick(false)} />
      )}
    </>
  );
}
