import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Moon, Wrench, Sparkles, Search, X, Heart, Eye } from "lucide-react";
import type { WeekPlanDay, WeeklyPlan, DayPlan, ProgressionSpeed, Regime, ExerciseDef } from "../../types";
import { WEEK_DAYS } from "../../data/weeklyPlan";
import { FOCUS, getFocusDef } from "../../data/focuses";
import { ALL_EX, isCustomExerciseId } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";
import RegimeQuestionnairePanel from "../regime/RegimeQuestionnaire";
import ExerciseInspectModal from "../exercise/ExerciseInspectModal";

interface Props {
  initial:   WeeklyPlan | null;
  onPersist: (plan: WeeklyPlan) => void;
  onDone:    () => void;
  progressionSpeed: ProgressionSpeed;
  onProgressionSpeedChange: (speed: ProgressionSpeed) => void;
  authFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
}

const PROGRESSION_OPTIONS: Array<{ id: ProgressionSpeed; label: string; desc: string }> = [
  { id: "slow",     label: "Slow & Steady", desc: "Smaller weight jumps (1.25/2.5 kg)." },
  { id: "moderate", label: "Moderate",      desc: "Standard 2.5/5 kg jumps." },
  { id: "fast",     label: "Aggressive",    desc: "Bigger jumps (5/10 kg)." },
];

const DEFAULT_FOCUS = Object.keys(FOCUS)[0];

function makeDayPlan(enabled: boolean): DayPlan {
  return { focus: DEFAULT_FOCUS, exerciseIds: [], enabled };
}

export default function WizardWeeklySetup({ initial, onPersist, onDone, progressionSpeed, onProgressionSpeedChange, authFetch }: Props) {
  const t = useTxt();
  const [showGenerator, setShowGenerator] = useState(false);

  const [plan, setPlan] = useState<WeeklyPlan>(() => {
    if (initial) return { ...initial };
    const p: WeeklyPlan = {};
    WEEK_DAYS.forEach(d => {
      p[d.key] = makeDayPlan(!["sat", "sun"].includes(d.key));
    });
    return p;
  });

  const applyGeneratedRegime = (regime: Regime) => {
    // Take week 1 of the (possibly multi-week) generated regime for the local
    // weekly-plan editor. The user can apply the full multi-week version via
    // the Regimes tab if they want all weeks tracked.
    const week1Days = regime.weeks && regime.weeks.length > 0
      ? regime.weeks[0].days
      : regime.days;
    const next: WeeklyPlan = {};
    (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as WeekPlanDay[]).forEach(k => {
      const d = week1Days?.[k];
      if (d) next[k] = {
        focus: d.focus, exerciseIds: d.exerciseIds, enabled: d.enabled,
        exerciseConfig: d.exerciseConfig,
      };
    });
    setPlan(next);
    // closeOnSave on the questionnaire flips showGenerator back to false,
    // so this just commits the generated plan to local state.
  };

  // Persist edits to the parent on every change so back-navigation
  // (in-app BACK button or mobile back gesture) never discards user work.
  // Skip the initial mount — we don't want to overwrite a null parent plan
  // until the user actually edits something.
  const skipInitialPersist = useRef(true);
  useEffect(() => {
    if (skipInitialPersist.current) { skipInitialPersist.current = false; return; }
    onPersist(plan);
  }, [plan, onPersist]);

  const [activeDay, setActiveDay] = useState<WeekPlanDay>("mon");
  const [query, setQuery] = useState("");
  const [inspectId, setInspectId] = useState<string | null>(null);

  // Reset search when switching days so each day starts fresh.
  useEffect(() => { setQuery(""); }, [activeDay]);

  const day        = plan[activeDay] ?? makeDayPlan(true);
  const focusDef   = getFocusDef(day.focus);
  const focusIds   = focusDef?.exIds ?? [];
  const customExs  = useMemo(() => ALL_EX.filter(e => isCustomExerciseId(e.id)), []);

  const setDay = (updates: Partial<DayPlan>) =>
    setPlan(p => ({ ...p, [activeDay]: { ...(p[activeDay] ?? makeDayPlan(true)), ...updates } }));

  // Clicking an exercise only adds it. Unchecking by clicking the row used
  // to wipe selections in surprising ways (especially combined with focus
  // chip changes) — removal now lives on an explicit X button per row so
  // the user is never one stray tap from losing their picks.
  const addExercise = (id: string) => {
    const cur = day.exerciseIds ?? [];
    if (cur.includes(id)) return;
    setDay({ exerciseIds: [...cur, id] });
  };
  const removeExercise = (id: string) => {
    const cur = day.exerciseIds ?? [];
    if (!cur.includes(id)) return;
    setDay({ exerciseIds: cur.filter(x => x !== id) });
  };

  // Search filters across every known exercise, so users can pull in moves
  // that aren't in the current focus's pool (e.g. add cardio to a strength day).
  const searchResults = useMemo<ExerciseDef[] | null>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ALL_EX
      .filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      .slice(0, 80);
  }, [query]);

  const renderExerciseRow = (ex: ExerciseDef) => {
    const checked = day.exerciseIds.includes(ex.id);
    // Once an exercise is checked, the row is no longer a toggle — taps on it
    // are inert. Removal happens through the explicit X button below so we
    // can't accidentally wipe a curated list with one stray tap.
    const handleActivate = () => { if (!checked) addExercise(ex.id); };
    return (
      <div
        key={ex.id}
        role="button"
        tabIndex={0}
        className={`ww-ex-row${checked ? " checked" : ""}`}
        onClick={handleActivate}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); }
        }}
      >
        <span className="ww-ex-check">
          {checked && <Check size={11} />}
        </span>
        <span className="ww-ex-name">{ex.name}</span>
        {ex.type === "cardio" && (
          <span className="ww-ex-badge" title="Cardio">
            <Heart size={10} /> CARDIO
          </span>
        )}
        <button
          type="button"
          className="ww-ex-info-btn"
          onClick={e => { e.stopPropagation(); setInspectId(ex.id); }}
          aria-label={`Details for ${ex.name}`}
          title="Details"
        >
          <Eye size={14} />
        </button>
        {checked && (
          <button
            type="button"
            className="ww-ex-info-btn"
            onClick={e => { e.stopPropagation(); removeExercise(ex.id); }}
            aria-label={`Remove ${ex.name}`}
            title="Remove"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  const pickedCount = day.exerciseIds.length;

  // Auto-generate runs as its own dedicated page — it replaces the day
  // editor entirely so the user isn't scrolling past two stacked UIs on
  // mobile. Saving the regime closes the page and returns here.
  if (showGenerator && authFetch) {
    return (
      <RegimeQuestionnairePanel
        authFetch={authFetch}
        onSaved={applyGeneratedRegime}
        progressionSpeed={progressionSpeed}
        onProgressionSpeedChange={onProgressionSpeedChange}
        onCancel={() => setShowGenerator(false)}
        backLabel={t("BACK TO PLAN", "BACK TO PROGRAM", "BACK TO ERA")}
        closeOnSave
      />
    );
  }

  return (
    <>
      <div className="wz-hdr wz-hdr-sticky">
        <button className="wz-back" onClick={onDone}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">{t("WEEKLY PLAN", "THE PROGRAM", "WEEKLY ERA")}</span>
        <button className="wz-next" onClick={onDone}>
          DONE <Check size={13} />
        </button>
      </div>

      <div className="wizard-title">{t("Your Weekly Routine", "The Weekly Program", "Your Weekly Era")}</div>
      <div className="wizard-sub">
        {t(
          "Set a focus and optional exercises for each day. Leave exercises blank for auto-selection.",
          "Lock in each day. Leave exercises empty and the app picks for you, or control every rep.",
          "Lock in each day, bestie. Leave it blank to let us cook, or curate every move yourself."
        )}
      </div>

      {/* Auto-generate entry point — opens a dedicated questionnaire page. */}
      {authFetch && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
          <button
            type="button"
            className="btn-sec"
            onClick={() => setShowGenerator(true)}
          >
            <Sparkles size={13} /> Auto-generate from questions
          </button>
        </div>
      )}

      {/* Progression speed — written through to user prefs immediately. */}
      <div style={{ margin: "4px 0 12px" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          {t("Progression speed", "Progression speed", "Progression speed")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PROGRESSION_OPTIONS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProgressionSpeedChange(p.id)}
              className={`chip ${progressionSpeed === p.id ? "active" : ""}`}
              style={{
                padding: "6px 10px",
                border: `1px solid ${progressionSpeed === p.id ? "var(--accent)" : "var(--ad)"}`,
                borderRadius: 999,
                background: progressionSpeed === p.id ? "var(--ad2)" : "transparent",
                color: "inherit", cursor: "pointer",
              }}
              title={p.desc}
            >
              <span style={{ fontWeight: 600 }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Day tabs — sticky so the active day stays visible while scrolling. */}
      <div className="ww-day-tabs ww-day-tabs-sticky">
        {WEEK_DAYS.map(d => {
          const dp = plan[d.key];
          const count = dp?.enabled ? (dp.exerciseIds?.length ?? 0) : 0;
          return (
            <button
              key={d.key}
              className={`ww-day-tab${activeDay === d.key ? " active" : ""}${!dp?.enabled ? " rest" : ""}`}
              onClick={() => setActiveDay(d.key)}
              aria-label={d.label}
            >
              <span className="ww-day-tab-short">{d.short}</span>
              <span className="ww-day-tab-letter">{d.short[0]}</span>
              {count > 0 && <span className="ww-day-tab-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Day editor */}
      <div className="ww-day-editor">
        <div className="ww-day-header">
          <div className="ww-day-name">
            {WEEK_DAYS.find(d => d.key === activeDay)?.label}
            {day.enabled && pickedCount > 0 && (
              <span className="ww-day-count">· {pickedCount} picked</span>
            )}
          </div>
          <button
            className={`ww-rest-toggle${!day.enabled ? " active" : ""}`}
            onClick={() => setDay({ enabled: !day.enabled })}
          >
            <Moon size={11} /> {day.enabled ? t("Mark Rest", "Rest Day") : t("Activate", "Activate")}
          </button>
        </div>

        {day.enabled && (
          <>
            {/* Focus picker — Cardio is one of the focuses, so picking it
                turns the day into a cardio day with cardio-only suggestions.
                The chips are self-explanatory (icon + name) so we skip a
                section label to keep the screen quieter. */}
            <div className="ww-focus-row">
              {Object.entries(FOCUS).map(([k, f]) => (
                <button
                  key={k}
                  className={`ww-focus-chip${day.focus === k ? " selected" : ""}`}
                  onClick={() => setDay({ focus: k })}
                >
                  <f.icon size={12} /> {f.name}
                </button>
              ))}
            </div>

            {/* Search — filters across every exercise so you can pull cardio
                into a strength day, or any move you can't see in the focus pool. */}
            <div className="ww-search-wrap">
              <Search size={13} className="ww-search-icon" />
              <input
                className="ww-search-input"
                type="search"
                inputMode="search"
                placeholder={t(`Search ${ALL_EX.length} exercises…`, `Search ${ALL_EX.length} lifts…`)}
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  className="ww-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  type="button"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {searchResults ? (
              searchResults.length > 0 ? (
                <>
                  <div className="ww-search-count">
                    {searchResults.length} {searchResults.length === 1 ? "match" : "matches"}
                  </div>
                  <div className="ww-exercise-list">
                    {searchResults.map(renderExerciseRow)}
                  </div>
                </>
              ) : (
                <div className="ww-auto-note">
                  {t(`No exercises match "${query}".`, `Nothing matches "${query}". Try another term.`)}
                </div>
              )
            ) : focusIds.length > 0 ? (
              <>
                <div className="ww-exercise-list" style={{ marginTop: 8 }}>
                  {focusIds.map(id => {
                    const ex = ALL_EX.find(e => e.id === id);
                    return ex ? renderExerciseRow(ex) : null;
                  })}
                </div>
                {customExs.length > 0 && (
                  <>
                    <div className="ww-section-label" style={{ marginTop: 14 }}>
                      <Wrench size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      {t("Your Custom Exercises", "Your Custom Lifts", "Your Custom Moves")}
                    </div>
                    <div className="ww-exercise-list">
                      {customExs.map(renderExerciseRow)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="ww-auto-note">
                {t(
                  "Exercises will be auto-selected on workout start.",
                  "Auto-pick mode. Exercises chosen on the fly.",
                  "Auto-pick mode. Let us cook on the fly."
                )}
              </div>
            )}
          </>
        )}

        {!day.enabled && (
          <div className="ww-rest-msg">
            <Moon size={24} style={{ opacity: 0.35, marginBottom: 8 }} />
            <div>{t("Rest day. Recover and come back stronger.", "Rest day. The Swoly Bible demands it. You'll thank yourself tomorrow.", "Rest day. Rest is also girlbossing. You'll thank yourself tomorrow.")}</div>
          </div>
        )}
      </div>

      {inspectId && (
        <ExerciseInspectModal
          exerciseId={inspectId}
          exerciseName={ALL_EX.find(e => e.id === inspectId)?.name ?? inspectId}
          onClose={() => setInspectId(null)}
        />
      )}
    </>
  );
}
