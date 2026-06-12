import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Dumbbell, Layers, Square, TrendingUp, X } from "lucide-react";
import type { ExerciseDef, WorkoutExercise, WorkoutSet, PRDict, WorkoutSession, RestPrefs, ProgressionOverride } from "../../types";
import { analyzeEx } from "../../analysis";
import ExerciseCard from "./ExerciseCard";
import ExercisePicker from "../ExercisePicker";
import type { RestTier } from "./RestTimer";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";
import { bindAudioUnlock } from "../../sound";

interface Props {
  exercises:      WorkoutExercise[];
  prs:            PRDict;
  history:        WorkoutSession[];
  doneSets:       number;
  progressionOverrides: Record<string, ProgressionOverride>;
  restPrefs:      RestPrefs;
  bodyweight:     number | null;
  onFinish:       () => void;
  onCancel:       () => void;
  addExercise:    (ex: ExerciseDef) => void;
  removeExercise: (uid: string) => void;
  updateSet:      (uid: string, idx: number, field: keyof WorkoutSet, value: string) => void;
  setSetRpe:      (uid: string, idx: number, rpe: number | null) => void;
  toggleSet:      (uid: string, idx: number) => void;
  addSet:         (uid: string) => void;
  removeSet:      (uid: string, idx: number) => void;
  toggleExerciseLock: (uid: string) => void;
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
  exercises, prs, history, doneSets, progressionOverrides, restPrefs, bodyweight,
  onFinish, onCancel, addExercise, removeExercise, updateSet, setSetRpe, toggleSet, addSet, removeSet, toggleExerciseLock, isNewPr,
  applyProgressionAll,
}: Props) {
  const [showPick, setShowPick] = useState(false);
  // Most recent tier the user picked, reused as the auto-start default on the
  // next set check-off. Defaults to "medium" until they tell us otherwise.
  const [lastTier, setLastTier]       = useState<RestTier>("medium");
  const [lastCustomSec, setLastCustomSec] = useState<number>(restPrefs.medium);
  const [rest, setRest] = useState<RestState | null>(null);
  // View mode: "all" scrolls every exercise card (classic), "single" shows one
  // exercise per screen with prev/next navigation. Persisted across reloads so
  // the user's preference sticks for the session.
  const [viewMode, setViewMode] = useState<"all" | "single">(
    () => (typeof sessionStorage !== "undefined" && sessionStorage.getItem("gamgee_active_viewmode") === "single" ? "single" : "all")
  );
  const [focusIdx, setFocusIdx] = useState(0);
  const t = useTxt();

  useEffect(() => {
    try { sessionStorage.setItem("gamgee_active_viewmode", viewMode); } catch { /* private mode */ }
  }, [viewMode]);

  // Keep the focused index in range as exercises are added/removed.
  const safeIdx = exercises.length === 0 ? 0 : Math.min(focusIdx, exercises.length - 1);
  useEffect(() => {
    if (focusIdx !== safeIdx) setFocusIdx(safeIdx);
  }, [focusIdx, safeIdx]);

  // Unlock the shared AudioContext on the user's taps so the rest-timer alarm
  // can actually ring on mobile (contexts created outside a gesture stay muted).
  useEffect(() => bindAudioUnlock(), []);

  // Show the "PROGRESS ALL" affordance only when at least one strength
  // exercise has prior history (analyzeEx returns null otherwise) and nothing
  // has been logged yet — once you start checking sets, the per-card APPLY
  // remains available for surgical adjustments.
  const hasAnyAnalysis = exercises.some(ex => ex.type === "strength" && !ex.is_assisted && analyzeEx(ex.id, history, progressionOverrides[ex.id]) !== null);

  const tierSeconds = (tier: RestTier) =>
    tier === "custom" ? lastCustomSec : restPrefs[tier];

  const handleAdd = (ex: ExerciseDef) => {
    addExercise(ex);
    setShowPick(false);
    // Jump focus to the freshly-added exercise so single mode lands on it.
    setFocusIdx(exercises.length);
  };

  const handleCancel = () => {
    // Guard the throw-away: a workout in progress represents real effort the
    // user is about to discard, so make them confirm before we wipe it.
    const anyLogged = doneSets > 0 || exercises.length > 0;
    if (anyLogged && !confirm("Cancel this workout? Your logged sets won't be saved.")) return;
    onCancel();
  };

  // Wrap toggleSet so we start the rest timer when a strength set transitions
  // undone -> done, and queue up a fresh set for cardio/timed (which have no
  // rest UI to anchor an add-set button to) when the user checks the last one.
  const handleToggleSet = (uid: string, idx: number) => {
    const ex = exercises.find(e => e.uid === uid);
    const set = ex?.sets[idx];
    toggleSet(uid, idx);
    if (!ex || !set || set.done) return;
    if (ex.type === "strength") {
      const secs = tierSeconds(lastTier);
      setRest({ uid, endAt: Date.now() + secs * 1000, totalSec: secs, tier: lastTier });
    } else if (idx === ex.sets.length - 1) {
      addSet(uid);
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

  const renderCard = (ex: WorkoutExercise) => (
    <ExerciseCard
      key={ex.uid}
      ex={ex}
      pr={prs[ex.id]}
      analysis={ex.type === "strength" && !ex.is_assisted ? analyzeEx(ex.id, history, progressionOverrides[ex.id]) : null}
      restPrefs={restPrefs}
      bodyweight={bodyweight}
      rest={rest?.uid === ex.uid ? { endAt: rest.endAt, totalSec: rest.totalSec, tier: rest.tier } : null}
      onRemove={() => removeExercise(ex.uid)}
      onToggleLock={() => {
        // Clear any running rest timer for this card when it's being
        // locked so the cool-down bar doesn't linger on a frozen card.
        if (!ex.locked && rest?.uid === ex.uid) setRest(null);
        toggleExerciseLock(ex.uid);
      }}
      updateSet={(idx, field, val) => updateSet(ex.uid, idx, field, val)}
      setSetRpe={(idx, rpe) => setSetRpe(ex.uid, idx, rpe)}
      toggleSet={(idx) => handleToggleSet(ex.uid, idx)}
      addSet={() => handleAddSet(ex.uid)}
      removeSet={(idx) => removeSet(ex.uid, idx)}
      isNewPr={(w) => isNewPr(ex.id, w)}
      onPickRestTier={(tier) => handlePickTier(ex.uid, tier)}
      onAdjustRest={(delta) => handleAdjust(ex.uid, delta)}
      onStartCustomRest={(s) => handleStartCustom(ex.uid, s)}
    />
  );

  const focusEx = exercises[safeIdx];

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
        <button className="btn-cancel-wx" onClick={handleCancel}><X size={14} /> CANCEL</button>
        <button className="btn-finish" onClick={onFinish} disabled={doneSets === 0}><Check size={14} /> FINISH</button>
      </div>

      {/* View toggle: scroll-all vs. one-exercise-at-a-time. Hidden when there's
          nothing to page through (a single exercise reads the same either way). */}
      {exercises.length > 1 && (
        <div className="wx-viewmode" role="tablist" aria-label="Exercise view">
          <button
            role="tab"
            aria-selected={viewMode === "all"}
            className={`wx-viewmode-btn${viewMode === "all" ? " active" : ""}`}
            onClick={() => setViewMode("all")}
          >
            <Layers size={14} /> ALL
          </button>
          <button
            role="tab"
            aria-selected={viewMode === "single"}
            className={`wx-viewmode-btn${viewMode === "single" ? " active" : ""}`}
            onClick={() => setViewMode("single")}
          >
            <Square size={14} /> ONE AT A TIME
          </button>
        </div>
      )}

      {exercises.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><Dumbbell size={40} /></div>
          <div className="empty-label">{t("No exercises yet", "Add something. The bar isn't going to lift itself.", "Add something, bestie. The bar isn't lifting itself.")}</div>
        </div>
      )}

      {/* Single-exercise mode: one card per screen with a picker + prev/next. */}
      {viewMode === "single" && exercises.length > 1 && focusEx ? (
        <div className="wx-single">
          <div className="wx-single-nav">
            <button
              className="wx-nav-btn"
              onClick={() => setFocusIdx(i => Math.max(0, i - 1))}
              disabled={safeIdx === 0}
              aria-label="Previous exercise"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="wx-single-pick">
              <select
                value={safeIdx}
                onChange={e => setFocusIdx(Number(e.target.value))}
                aria-label="Jump to exercise"
              >
                {exercises.map((ex, i) => (
                  <option key={ex.uid} value={i}>
                    {ex.name} ({ex.sets.filter(s => s.done).length}/{ex.sets.length}){ex.locked ? " ✓" : ""}
                  </option>
                ))}
              </select>
              <div className="wx-single-sub">Exercise {safeIdx + 1} of {exercises.length}</div>
            </div>
            <button
              className="wx-nav-btn"
              onClick={() => setFocusIdx(i => Math.min(exercises.length - 1, i + 1))}
              disabled={safeIdx === exercises.length - 1}
              aria-label="Next exercise"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {renderCard(focusEx)}

          <div className="wx-single-foot">
            <button
              className="wx-single-foot-btn"
              onClick={() => setFocusIdx(i => Math.max(0, i - 1))}
              disabled={safeIdx === 0}
            >
              <ChevronLeft size={16} /> PREV
            </button>
            <button
              className="wx-single-foot-btn"
              onClick={() => setFocusIdx(i => Math.min(exercises.length - 1, i + 1))}
              disabled={safeIdx === exercises.length - 1}
            >
              NEXT <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        exercises.map(renderCard)
      )}

      {showPick && (
        <ExercisePicker prs={prs} onAdd={handleAdd} onClose={() => setShowPick(false)} />
      )}
    </>
  );
}
