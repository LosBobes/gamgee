import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Gauge, Target, AlertCircle, RotateCcw } from "lucide-react";
import type { ExerciseDef, ExerciseConfig, PRDict, WorkoutSession } from "../../types";
import { prescribeExercise } from "../../analysis";
import { MI } from "../../data/muscles";
import { EM } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";

interface Props {
  planned: ExerciseDef[];
  prs: PRDict;
  history: WorkoutSession[];
  /** Pre-existing per-exercise configs (from a regime day, or the user's
   * last-used prescribe configs saved to localStorage). */
  initialConfigs: Record<string, ExerciseConfig>;
  onBack: () => void;
  /** Called when the user starts the workout. Passes the final per-exercise
   * config map; the workout starter consumes it via {@link prescribeExercise}
   * to lay out warmup + working sets. */
  onStart: (configs: Record<string, ExerciseConfig>) => void;
}

const DEFAULT_RPE = 7;
const DEFAULT_WORKING_SETS = 3;
const DEFAULT_WORKING_REPS = 8;
const DEFAULT_WARMUP_SETS = 2;

/** Pick the most recent top-set (heaviest × reps) for an exercise from the
 * user's history, as a fallback reference when no PR is recorded. */
function refFromHistory(exId: string, history: WorkoutSession[]): { weight: number; reps: number } | null {
  for (const w of history) {
    const ex = w.exercises.find(e => e.id === exId);
    if (!ex || !ex.sets.length) continue;
    let top: { w: number; r: number } | null = null;
    for (const s of ex.sets) {
      if (s.is_warmup) continue;
      const wt = parseFloat(s.weight);
      const r = parseInt(s.reps);
      if (!Number.isFinite(wt) || wt <= 0) continue;
      const reps = Number.isFinite(r) && r > 0 ? r : 0;
      if (!top || wt > top.w || (wt === top.w && reps > top.r)) top = { w: wt, r: reps };
    }
    if (top) return { weight: top.w, reps: Math.max(1, top.r || 1) };
  }
  return null;
}

/** Short label for a given RPE level — mirrors WorkoutComplete's vocabulary
 * so the post- and pre-session prompts feel like one consistent scale. */
function rpeLabel(level: number): string {
  if (level <= 2) return "Way too easy";
  if (level <= 4) return "Easy day";
  if (level <= 6) return "On point";
  if (level <= 7) return "Solid grind";
  if (level <= 8) return "Hard";
  if (level <= 9) return "Brutal";
  return "Max effort";
}

function clampInt(v: string, min: number, max: number): number | null {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function clampFloat(v: string, min: number, max: number): number | null {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

export default function WizardPrescribe({ planned, prs, history, initialConfigs, onBack, onStart }: Props) {
  const t = useTxt();

  // Seed per-exercise configs from (1) the regime's day plan / saved configs,
  // (2) the user's PR for that exercise, (3) the top set from history. If
  // none of those exist the user has to fill in the reference manually — the
  // "no reference, ask for every exercise" case.
  const initial = useMemo<Record<string, ExerciseConfig>>(() => {
    const out: Record<string, ExerciseConfig> = {};
    for (const ex of planned) {
      if (ex.type !== "strength") continue;
      const fromCfg = initialConfigs[ex.id] ?? {};
      const pr = prs[ex.id];
      const hist = !pr ? refFromHistory(ex.id, history) : null;
      const max_weight = fromCfg.max_weight ?? pr?.weight ?? hist?.weight ?? undefined;
      const max_reps   = fromCfg.max_reps   ?? pr?.reps   ?? hist?.reps   ?? undefined;
      out[ex.id] = {
        rpe: fromCfg.rpe ?? DEFAULT_RPE,
        max_weight,
        max_reps,
        warmup_sets:  fromCfg.warmup_sets  ?? DEFAULT_WARMUP_SETS,
        working_sets: fromCfg.working_sets ?? DEFAULT_WORKING_SETS,
        working_reps: fromCfg.working_reps ?? DEFAULT_WORKING_REPS,
      };
    }
    return out;
  }, [planned, prs, history, initialConfigs]);

  const [configs, setConfigs] = useState<Record<string, ExerciseConfig>>(initial);

  const strengthExs = planned.filter(ex => ex.type === "strength");
  const missingRef = strengthExs.filter(ex => {
    const cfg = configs[ex.id];
    return !cfg?.max_weight || cfg.max_weight <= 0 || !cfg?.max_reps || cfg.max_reps <= 0;
  });
  const allReady = missingRef.length === 0;

  const setCfg = (exId: string, patch: Partial<ExerciseConfig>) =>
    setConfigs(prev => ({ ...prev, [exId]: { ...(prev[exId] ?? {}), ...patch } }));

  const resetCfg = (exId: string) => {
    const ex = planned.find(e => e.id === exId);
    if (!ex) return;
    const pr = prs[exId];
    const hist = !pr ? refFromHistory(exId, history) : null;
    setConfigs(prev => ({
      ...prev,
      [exId]: {
        rpe: DEFAULT_RPE,
        max_weight: pr?.weight ?? hist?.weight ?? undefined,
        max_reps:   pr?.reps   ?? hist?.reps   ?? undefined,
        warmup_sets:  DEFAULT_WARMUP_SETS,
        working_sets: DEFAULT_WORKING_SETS,
        working_reps: DEFAULT_WORKING_REPS,
      },
    }));
  };

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label"><Gauge size={13} /> RPE SETUP</span>
        <button
          className="wz-next"
          onClick={() => onStart(configs)}
          disabled={!allReady}
        >
          START <ChevronRight size={13} />
        </button>
      </div>

      <div className="prescribe-intro">
        <Target size={14} />
        <div>
          <div className="prescribe-intro-title">
            {t("Effort-based prescription", "Pick your effort", "Set the vibe")}
          </div>
          <div className="prescribe-intro-sub">
            {t(
              "Tell us how hard you want to push each lift (1 easy, 10 max). We'll generate the warmup ramp and working sets for you.",
              "Set how hard you want to go on each lift. We'll do the math for sets and weight.",
              "Pick the effort, bestie. We'll handle the sets and weight from there."
            )}
          </div>
        </div>
      </div>

      {missingRef.length > 0 && (
        <div className="prescribe-warn">
          <AlertCircle size={13} />
          <span>
            {t(
              `Add a reference max (the heaviest weight × reps you can clean) for ${missingRef.length} lift${missingRef.length === 1 ? "" : "s"} below before starting.`,
              `Drop a reference max for ${missingRef.length} lift${missingRef.length === 1 ? "" : "s"} so we know where to load you up.`,
              `Plug in a reference max for ${missingRef.length} lift${missingRef.length === 1 ? "" : "s"} so we can do the math, bestie.`
            )}
          </span>
        </div>
      )}

      <div className="prescribe-list">
        {strengthExs.map(ex => {
          const cfg = configs[ex.id] ?? {};
          const rpe = cfg.rpe ?? DEFAULT_RPE;
          const hasRef = !!(cfg.max_weight && cfg.max_weight > 0 && cfg.max_reps && cfg.max_reps > 0);
          const refSource = prs[ex.id]
            ? "from PR"
            : refFromHistory(ex.id, history)
              ? "from history"
              : null;
          const presc = hasRef ? prescribeExercise(ex.id, cfg) : null;
          const muscleNames = (EM[ex.id]?.p ?? []).map(mid => MI[mid]?.n).filter(Boolean).join(" · ");

          return (
            <div key={ex.id} className={`prescribe-card${hasRef ? "" : " prescribe-card-needs-ref"}`}>
              <div className="prescribe-card-head">
                <div className="prescribe-card-title">
                  <div className="prescribe-ex-name">{ex.name}</div>
                  {muscleNames && <div className="prescribe-ex-muscles">{muscleNames}</div>}
                </div>
                <button
                  className="prescribe-reset"
                  onClick={() => resetCfg(ex.id)}
                  title="Reset to defaults"
                  aria-label="Reset to defaults"
                >
                  <RotateCcw size={11} />
                </button>
              </div>

              <div className="prescribe-rpe-row">
                <span className="prescribe-rpe-label">
                  <Gauge size={11} /> RPE
                  <strong className="prescribe-rpe-val">{rpe}</strong>
                  <span className="prescribe-rpe-text">{rpeLabel(rpe)}</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={rpe}
                  onChange={e => setCfg(ex.id, { rpe: Number(e.target.value) })}
                  aria-label={`RPE for ${ex.name} (1 easy, 10 max)`}
                  className="prescribe-rpe-slider"
                />
              </div>

              <div className="prescribe-row">
                <label className="prescribe-field">
                  <span className="prescribe-field-label">Max weight (kg)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={cfg.max_weight ?? ""}
                    onChange={e => setCfg(ex.id, { max_weight: clampFloat(e.target.value, 0, 1000) ?? undefined })}
                    placeholder="—"
                  />
                </label>
                <label className="prescribe-field">
                  <span className="prescribe-field-label">× reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    step={1}
                    value={cfg.max_reps ?? ""}
                    onChange={e => setCfg(ex.id, { max_reps: clampInt(e.target.value, 1, 30) ?? undefined })}
                    placeholder="—"
                  />
                </label>
                {refSource && hasRef && (
                  <span className="prescribe-ref-source">{refSource}</span>
                )}
              </div>

              <div className="prescribe-row">
                <label className="prescribe-field">
                  <span className="prescribe-field-label">Warmup sets</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={6}
                    step={1}
                    value={cfg.warmup_sets ?? DEFAULT_WARMUP_SETS}
                    onChange={e => setCfg(ex.id, { warmup_sets: clampInt(e.target.value, 0, 6) ?? 0 })}
                  />
                </label>
                <label className="prescribe-field">
                  <span className="prescribe-field-label">Working sets</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    step={1}
                    value={cfg.working_sets ?? DEFAULT_WORKING_SETS}
                    onChange={e => setCfg(ex.id, { working_sets: clampInt(e.target.value, 1, 10) ?? DEFAULT_WORKING_SETS })}
                  />
                </label>
                <label className="prescribe-field">
                  <span className="prescribe-field-label">Target reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    step={1}
                    value={cfg.working_reps ?? DEFAULT_WORKING_REPS}
                    onChange={e => setCfg(ex.id, { working_reps: clampInt(e.target.value, 1, 30) ?? DEFAULT_WORKING_REPS })}
                  />
                </label>
              </div>

              {presc && presc.working.weight > 0 && (
                <div className="prescribe-preview">
                  <span className="prescribe-preview-label">PRESCRIPTION</span>
                  {presc.warmup.length > 0 && (
                    <span className="prescribe-preview-warmup">
                      Warmup: {presc.warmup.map(w => `${w.weight}×${w.reps}`).join(" → ")}
                    </span>
                  )}
                  <span className="prescribe-preview-working">
                    Working: {presc.working.count} × {presc.working.weight}kg × {presc.working.reps}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="prescribe-footer">
        <button className="wz-back" onClick={onBack}>
          {t("Switch to manual entry", "Skip RPE, do it manually", "Skip RPE, manual mode")}
        </button>
        <button className="wz-next" onClick={() => onStart(configs)} disabled={!allReady}>
          {t("START WORKOUT", "START THE GRIND", "START IT")} <ChevronRight size={13} />
        </button>
      </div>
    </>
  );
}
