import { useState } from "react";
import { Check, Dumbbell, Link2 } from "lucide-react";
import type { ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession, ProgressionSpeed } from "../../types";
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
  progressionSpeed: ProgressionSpeed;
  onFinish:       () => void;
  addExercise:    (ex: ExerciseDef) => void;
  removeExercise: (uid: string) => void;
  updateSet:      (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:      (uid: string, idx: number) => void;
  addSet:         (uid: string) => void;
  removeSet:      (uid: string, idx: number) => void;
  addDropSet:     (uid: string) => void;
  linkSuperset:   (uid1: string, uid2: string) => void;
  unlinkSuperset: (uid: string) => void;
  isNewPr:        (exId: string, weight: string) => boolean;
}

type RenderItem =
  | { type: "single";    ex: WorkoutExercise }
  | { type: "superset";  exes: WorkoutExercise[]; groupId: string };

export default function ActiveWorkout({ exercises, prs, history, doneSets, progressionSpeed, onFinish, addExercise, removeExercise, updateSet, toggleSet, addSet, removeSet, addDropSet, linkSuperset, unlinkSuperset, isNewPr }: Props) {
  const [showPick,   setShowPick]   = useState(false);
  const [linkingUid, setLinkingUid] = useState<string | null>(null);
  const t = useTxt();

  const handleAdd = (ex: ExerciseDef) => {
    addExercise(ex);
    setShowPick(false);
  };

  const handleLinkClick = (uid: string) => {
    const ex = exercises.find(e => e.uid === uid);
    if (ex?.supersetId) {
      unlinkSuperset(uid);
      return;
    }
    if (!linkingUid) {
      setLinkingUid(uid);
    } else if (linkingUid === uid) {
      setLinkingUid(null);
    } else {
      linkSuperset(linkingUid, uid);
      setLinkingUid(null);
    }
  };

  // Build ordered render items, preserving first-occurrence position of each group
  const renderItems: RenderItem[] = [];
  const seenGroups = new Set<string>();
  for (const ex of exercises) {
    if (ex.supersetId) {
      if (!seenGroups.has(ex.supersetId)) {
        seenGroups.add(ex.supersetId);
        renderItems.push({
          type: "superset",
          groupId: ex.supersetId,
          exes: exercises.filter(e => e.supersetId === ex.supersetId),
        });
      }
    } else {
      renderItems.push({ type: "single", ex });
    }
  }

  const linkingName = linkingUid ? exercises.find(e => e.uid === linkingUid)?.name : null;

  const renderCard = (ex: WorkoutExercise) => {
    const linked   = !!ex.supersetId;
    const isSource = linkingUid === ex.uid;
    const isTarget = !!linkingUid && !isSource && !linked;

    return (
      <ExerciseCard
        key={ex.uid}
        ex={ex}
        pr={prs[ex.id]}
        analysis={analyzeEx(ex.id, history, progressionSpeed)}
        linked={linked}
        isLinkSource={isSource}
        isLinkTarget={isTarget}
        onRemove={() => removeExercise(ex.uid)}
        updateSet={(idx, field, val) => updateSet(ex.uid, idx, field, val)}
        toggleSet={(idx) => toggleSet(ex.uid, idx)}
        addSet={() => addSet(ex.uid)}
        removeSet={(idx) => removeSet(ex.uid, idx)}
        addDropSet={() => addDropSet(ex.uid)}
        onLinkClick={() => handleLinkClick(ex.uid)}
        isNewPr={(w) => isNewPr(ex.id, w)}
      />
    );
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

      {linkingUid && (
        <div className="superset-link-banner">
          <Link2 size={13} />
          <span>Tap another exercise to superset with <strong>{linkingName}</strong></span>
          <button className="superset-link-cancel" onClick={() => setLinkingUid(null)}>Cancel</button>
        </div>
      )}

      {exercises.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><Dumbbell size={40} /></div>
          <div className="empty-label">{t("No exercises yet", "Add something. The bar isn't going to lift itself.", "Add something, bestie. The bar isn't lifting itself.")}</div>
        </div>
      )}

      {renderItems.map(item => {
        if (item.type === "superset") {
          return (
            <div key={item.groupId} className="superset-group">
              <div className="superset-group-label">
                <Link2 size={10} /> SUPERSET
              </div>
              {item.exes.map(renderCard)}
            </div>
          );
        }
        return renderCard(item.ex);
      })}

      {showPick && (
        <ExercisePicker prs={prs} onAdd={handleAdd} onClose={() => setShowPick(false)} />
      )}
    </>
  );
}
