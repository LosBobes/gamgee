import { useState } from "react";
import { Check, Dumbbell, TrendingUp } from "lucide-react";
import type { ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession, ProgressionSpeed, RestPrefs, RpeMultipliers, RpePerExerciseMultipliers } from "../../types";
import { analyzeEx } from "../../analysis";
import ExerciseCard from "./ExerciseCard";
import ExercisePicker from "../ExercisePicker";
import type { RestTier } from "./RestTimer";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  exercises:      WorkoutExercise[];
  prs:            PRDict;
  history:        WorkoutSession[];
  doneSets:       number;
  progressionSpeed: ProgressionSpeed;
  restPrefs:      RestPrefs;
  rpeMultipliers: RpeMultipliers;
  rpePerExercise: RpePerExerciseMultipliers;
  onFinish:       () => void;
  addExercise:    (ex: ExerciseDef) => void;
  removeExercise: (uid: string) => void;
  updateSet:      (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  toggleSet:      (uid: string, idx: number) => void;
  addSet:         (uid: string) => void;
  removeSet:      (uid: string, idx: number) => void;
  isNewPr:        (exId: string, weight: string) => boolean;
  applyProgressionAll: () => void;
}

interface RestState {
  uid:      string;
  endAt:    number;
  totalSec: number;
  tier:     RestTier;
}

export default function ActiveWorkout({
  exercises, prs, history, doneSets, progressionSpeed, restPrefs,
  rpeMultipliers, rpePerExercise,
  onFinish, addExercise, removeExercise, updateSet, toggleSet, addSet, removeSet, isNewPr,
  applyProgressionAll,
}: Props) {
  const [showPick, setShowPick] = useState(false);
  // Most recent tier the user picked, reused as the auto-start default on the
  // next set check-off. Defaults to "medium" until they tell us otherwise.
  const [lastTier, setLastTier]       = useState<RestTier>("medium");
  const [lastCustomSec, setLastCustomSec] = useState<number>(restPrefs.medium);
  const [rest, setRest] = useState<RestState | null>(null);
  const t = useTxt();

  // Use the RPE of the most recent recorded session as the multiplier source
  // for THIS session's progression suggestion. analyzeEx merges this with the
  // global table + per-exercise overrides.
  const lastRpe = history[0]?.rpe ?? null;
  const analyzeOpts = { speed: progressionSpeed, lastRpe, rpeTable: rpeMultipliers, rpePerEx: rpePerExercise };

  // Show the "PROGRESS ALL" affordance only when at least one strength
  // exercise has prior history (analyzeEx returns null otherwise) and nothing
  // has been logged yet — once you start checking sets, the per-card APPLY
  // remains available for surgical adjustments.
  const hasAnyAnalysis = exercises.some(ex => ex.type === "strength" && analyzeEx(ex.id, history, analyzeOpts) !== null);

  const tierSeconds = (tier: RestTier) =>
    tier === "custom" ? lastCustomSec : restPrefs[tier];

  const handleAdd = (ex: ExerciseDef) => {
    addExercise(ex);
    setShowPick(false);
  };

  // Wrap toggleSet so we start the rest timer when a strength set transitions
  // undone -> done. Cardio/timed sets have their own pacing.
  const handleToggleSet = (uid: string, idx: number) => {
    const ex = exercises.find(e => e.uid === uid);
    const set = ex?.sets[idx];
    const becomingDone = !!ex && !!set && !set.done && ex.type === "strength";
    toggleSet(uid, idx);
    if (becomingDone) {
      const secs = tierSeconds(lastTier);
      setRest({ uid, endAt: Date.now() + secs * 1000, totalSec: secs, tier: lastTier });
    }
  };

  const handleAddSet = (uid: string) => {
    // With prefilled "run-it-back" workouts there may already be a not-yet-done
    // set queued up after the one we just finished — in that case the rest
    // bar should just clear the cool-down so the next existing set comes back
    // into view, not append a stray empty set.
    const ex = exercises.find(e => e.uid === uid);
    const hasUndone = ex?.sets.some(s => !s.done) ?? false;
    if (!hasUndone) addSet(uid);
    if (rest?.uid === uid) setRest(null);
  };

  const handlePickTier = (uid: string, tier: Exclude<RestTier, "custom">) => {
    if (rest?.uid !== uid) return;
    const secs = restPrefs[tier];
    setLastTier(tier);
    setRest({ uid, endAt: Date.now() + secs * 1000, totalSec: secs, tier });
  };

  const handleAdjust = (uid: string, delta: number) => {
    if (rest?.uid !== uid) return;
    setRest(r => r && r.uid === uid
      ? { ...r, endAt: Math.max(Date.now() + 1000, r.endAt + delta * 1000), totalSec: Math.max(5, r.totalSec + delta) }
      : r);
  };

  const handleStartCustom = (uid: string, seconds: number) => {
    if (rest?.uid !== uid) return;
    const secs = Math.max(5, Math.min(3600, Math.round(seconds)));
    setLastTier("custom");
    setLastCustomSec(secs);
    setRest({ uid, endAt: Date.now() + secs * 1000, totalSec: secs, tier: "custom" });
  };

  return (
    <>
      <OnboardingHint hintKey="active" step="GO TIME" title={t("Log each set as you go", "Log each set as you go", "Log each set as you serve")}>
        {t(
          "For every set: type weight + reps, then check the box. The bar at the bottom of the card fills up while you rest — when it's full, tap it to start your next set.",
          "Punch in weight + reps, tap the checkbox. The bar at the bottom fills up while you rest — tap it when it's full for your next set. Hit FINISH when you're cooked.",
          "Punch in weight + reps, tap the checkbox. Rest bar fills while you breathe — tap it when full for the next set. Hit FINISH when you're cooked, bestie."
        )}
      </OnboardingHint>

      <div className="wx-actions">
        <button className="btn-add-ex" onClick={() => setShowPick(true)}>+ ADD EXERCISE</button>
        {hasAnyAnalysis && (
          <button
            className="btn-progress-all"
            onClick={applyProgressionAll}
            title="Apply coach progression to every exercise"
          >
            <TrendingUp size={14} /> PROGRESS
          </button>
        )}
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
          analysis={analyzeEx(ex.id, history, analyzeOpts)}
          restPrefs={restPrefs}
          rest={rest?.uid === ex.uid ? { endAt: rest.endAt, totalSec: rest.totalSec, tier: rest.tier } : null}
          onRemove={() => removeExercise(ex.uid)}
          updateSet={(idx, field, val) => updateSet(ex.uid, idx, field, val)}
          toggleSet={(idx) => handleToggleSet(ex.uid, idx)}
          addSet={() => handleAddSet(ex.uid)}
          removeSet={(idx) => removeSet(ex.uid, idx)}
          isNewPr={(w) => isNewPr(ex.id, w)}
          onPickRestTier={(tier) => handlePickTier(ex.uid, tier)}
          onAdjustRest={(delta) => handleAdjust(ex.uid, delta)}
          onStartCustomRest={(s) => handleStartCustom(ex.uid, s)}
        />
      ))}

      {showPick && (
        <ExercisePicker prs={prs} onAdd={handleAdd} onClose={() => setShowPick(false)} />
      )}
    </>
  );
}
