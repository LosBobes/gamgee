import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Moon, Wrench, Sparkles, Search, X, Heart, Eye, Plus, Copy, Trash2, Gauge } from "lucide-react";
import type { WeekPlanDay, WeeklyPlan, DayPlan, WeekPlan, Regime, ExerciseDef, ExerciseConfig } from "../../types";
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
  authFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
}

const DEFAULT_FOCUS = Object.keys(FOCUS)[0];
const WEEK_KEYS: WeekPlanDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
/** Default RPE shown in the per-exercise control before the user has set
 * one. We don't persist this value until the user actually touches the
 * control, so a freshly-picked exercise still leaves `exerciseConfig.rpe`
 * undefined unless they care about effort. */
const DEFAULT_RPE = 7;

function makeDayPlan(enabled: boolean): DayPlan {
  return { focus: DEFAULT_FOCUS, exerciseIds: [], enabled };
}

function cloneDay(d: DayPlan | undefined, dayKey: WeekPlanDay): DayPlan {
  const isRestDefault = dayKey === "sat" || dayKey === "sun";
  if (!d) return makeDayPlan(!isRestDefault);
  return {
    focus: d.focus,
    exerciseIds: [...(d.exerciseIds ?? [])],
    enabled: d.enabled,
    exerciseConfig: d.exerciseConfig ? { ...d.exerciseConfig } : undefined,
    mode: d.mode ?? null,
    general_rpe: d.general_rpe ?? null,
  };
}

function cloneWeek(w: WeekPlan | undefined, label?: string | null): WeekPlan {
  // Only clone days that were actually defined — keeps the saved plan slim
  // and avoids polluting missing days with weekday/rest defaults. The day
  // editor still shows defaults for absent days via `setDay`'s fallback.
  const days: Partial<Record<WeekPlanDay, DayPlan>> = {};
  WEEK_KEYS.forEach(k => {
    const d = w?.days?.[k];
    if (d) days[k] = cloneDay(d, k);
  });
  return { label: label !== undefined ? label : (w?.label ?? null), days };
}

/** Normalize the incoming WeeklyPlan (flat single-week or multi-week) into
 * a working WeekPlan[] for the editor.
 *
 * Days the caller never set stay absent — `setDay` will lazily fill them in
 * the moment the user actually edits them. That keeps the saved plan slim
 * and stops empty weekday entries from showing up as "today's workout" in
 * WizardMode just because the user opened the editor. */
function planToWeeks(plan: WeeklyPlan | null): WeekPlan[] {
  if (plan?.weeks && plan.weeks.length > 0) {
    return plan.weeks.map(w => cloneWeek(w));
  }
  if (!plan) return [{ label: null, days: {} }];
  const flatDays: Partial<Record<WeekPlanDay, DayPlan>> = {};
  WEEK_KEYS.forEach(k => {
    const v = plan[k];
    if (v) flatDays[k] = cloneDay(v, k);
  });
  return [{ label: null, days: flatDays }];
}

/** Serialize the working WeekPlan[] back into a WeeklyPlan. Single-week
 * plans round-trip as the legacy flat shape so existing consumers
 * (`weeklyPlan[day]`) keep working. Multi-week plans use the canonical
 * `weeks[]` shape plus `current_week_index` so the active workout picks
 * the right week each session.
 *
 * `currentWeekIdx` is the user's training-progress index (which week of
 * the program they're on), NOT the index of the week being edited — those
 * are intentionally independent. */
function weeksToPlan(weeks: WeekPlan[], currentWeekIdx: number): WeeklyPlan {
  if (weeks.length <= 1) {
    const out: WeeklyPlan = { weeks: null, current_week_index: null };
    const days = weeks[0]?.days ?? {};
    WEEK_KEYS.forEach(k => {
      const d = days[k];
      if (d) out[k] = d;
    });
    return out;
  }
  return {
    weeks: weeks.map(w => cloneWeek(w)),
    current_week_index: Math.max(0, Math.min(currentWeekIdx, weeks.length - 1)),
  };
}

export default function WizardWeeklySetup({ initial, onPersist, onDone, authFetch }: Props) {
  const t = useTxt();
  const [showGenerator, setShowGenerator] = useState(false);

  const [weeks, setWeeks] = useState<WeekPlan[]>(() => planToWeeks(initial));
  // `activeWeek` = which week the user is currently editing.
  // `progressWeek` = which week of the program the user is currently training
  // through (persisted as `current_week_index` on the WeeklyPlan). The two are
  // intentionally independent: editing Week 3 in a 4-week program shouldn't
  // jump the user's training rotation forward.
  const [activeWeek, setActiveWeek] = useState(() =>
    Math.max(0, Math.min(initial?.current_week_index ?? 0, (initial?.weeks?.length ?? 1) - 1))
  );
  const [progressWeek, setProgressWeek] = useState(() => initial?.current_week_index ?? 0);

  const applyGeneratedRegime = (regime: Regime) => {
    // Preserve the regime's full multi-week structure if it has one — the
    // user can keep tweaking each week independently. Fall back to the
    // single-week legacy `days` field for older saved regimes.
    const incoming: WeekPlan[] = regime.weeks && regime.weeks.length > 0
      ? regime.weeks.map(w => cloneWeek(w))
      : [cloneWeek({ label: null, days: regime.days || {} })];
    setWeeks(incoming);
    setActiveWeek(0);
    setProgressWeek(0);
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
    onPersist(weeksToPlan(weeks, progressWeek));
  }, [weeks, progressWeek, onPersist]);

  const [activeDay, setActiveDay] = useState<WeekPlanDay>("mon");
  const [query, setQuery] = useState("");
  const [inspectId, setInspectId] = useState<string | null>(null);

  // Reset search when switching days or weeks so each surface starts fresh.
  useEffect(() => { setQuery(""); }, [activeDay, activeWeek]);

  const week       = weeks[activeWeek] ?? weeks[0];
  const day        = week?.days?.[activeDay] ?? makeDayPlan(true);
  const focusDef   = getFocusDef(day.focus);
  const focusIds   = focusDef?.exIds ?? [];
  const customExs  = useMemo(() => ALL_EX.filter(e => isCustomExerciseId(e.id)), []);

  const setDay = (updates: Partial<DayPlan>) =>
    setWeeks(prev => prev.map((w, i) => {
      if (i !== activeWeek) return w;
      const cur = w.days[activeDay] ?? makeDayPlan(true);
      return { ...w, days: { ...w.days, [activeDay]: { ...cur, ...updates } } };
    }));

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
    const nextCfg = day.exerciseConfig ? { ...day.exerciseConfig } : undefined;
    if (nextCfg) delete nextCfg[id];
    setDay({ exerciseIds: cur.filter(x => x !== id), exerciseConfig: nextCfg });
  };
  const setExerciseRpe = (id: string, rpe: number) => {
    const clamped = Math.max(1, Math.min(10, Math.round(rpe)));
    const prevCfg: ExerciseConfig = day.exerciseConfig?.[id] ?? {};
    setDay({
      exerciseConfig: {
        ...(day.exerciseConfig ?? {}),
        [id]: { ...prevCfg, rpe: clamped },
      },
    });
  };

  // ── Multi-week controls ────────────────────────────────────────────────
  const addWeek = () => {
    setWeeks(prev => {
      // New week starts as a copy of the currently-active week so the user
      // keeps their day structure and tweaks RPEs/exercises from there.
      const base = prev[activeWeek] ?? prev[0];
      const copy = cloneWeek(base, `Week ${prev.length + 1}`);
      // If this is the first week being added we also need to label the
      // original so the tab strip isn't ambiguous ("Week 1" + "Week 2").
      const labelled = prev.length === 1 && !prev[0].label
        ? [{ ...prev[0], label: "Week 1" }]
        : prev;
      const next = [...labelled, copy];
      setActiveWeek(next.length - 1);
      return next;
    });
  };

  const duplicateWeek = (idx: number) => {
    setWeeks(prev => {
      const baseLabel = prev[idx].label || `Week ${idx + 1}`;
      const labelled = prev.length === 1 && !prev[0].label
        ? [{ ...prev[0], label: "Week 1" }]
        : prev;
      const copy = cloneWeek(labelled[idx], `${baseLabel} copy`);
      const next = [...labelled.slice(0, idx + 1), copy, ...labelled.slice(idx + 1)];
      setActiveWeek(idx + 1);
      return next;
    });
  };

  const deleteWeek = (idx: number) => {
    setWeeks(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      setActiveWeek(i => Math.max(0, Math.min(i >= idx ? i - 1 : i, next.length - 1)));
      // Shift the training-progress index too so the user doesn't get
      // bumped onto a different week's plan as a side effect of editing.
      setProgressWeek(i => Math.max(0, Math.min(i >= idx ? i - 1 : i, next.length - 1)));
      return next;
    });
  };

  const renameWeek = (idx: number, label: string) => {
    setWeeks(prev => prev.map((w, i) => i === idx ? { ...w, label } : w));
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

  const renderRpeControl = (exId: string) => {
    const cfg = day.exerciseConfig?.[exId];
    const value = cfg?.rpe ?? DEFAULT_RPE;
    const isSet = cfg?.rpe !== undefined;
    return (
      <div
        className={`ww-rpe-row${isSet ? " ww-rpe-row-set" : ""}`}
        onClick={e => e.stopPropagation()}
      >
        <span className="ww-rpe-label">
          <Gauge size={11} /> RPE
          <strong className="ww-rpe-val">{value}</strong>
          {!isSet && <span className="ww-rpe-hint">default</span>}
        </span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={e => setExerciseRpe(exId, Number(e.target.value))}
          aria-label={`RPE for this exercise (1 easy, 10 max)`}
          className="ww-rpe-slider"
        />
      </div>
    );
  };

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
        <div className="ww-ex-main">
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
        {checked && renderRpeControl(ex.id)}
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
        onCancel={() => setShowGenerator(false)}
        backLabel={t("BACK TO PLAN", "BACK TO PROGRAM", "BACK TO ERA")}
        closeOnSave
      />
    );
  }

  const isMultiWeek = weeks.length > 1;
  const weekLabel = (w: WeekPlan, i: number) => w.label || `Week ${i + 1}`;

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

      {/* Week tabs — adding a week clones the active week so day structures
          and RPEs carry over and the user tweaks from there. Each week is
          edited independently and applied in sequence across calendar weeks. */}
      <div className="ww-week-bar">
        <div className="ww-week-tabs">
          {weeks.map((w, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveWeek(i)}
              className={`ww-week-tab${activeWeek === i ? " active" : ""}`}
              aria-pressed={activeWeek === i}
            >
              {weekLabel(w, i)}
            </button>
          ))}
          <button
            type="button"
            onClick={addWeek}
            className="ww-week-add"
            aria-label="Add a week to the program"
            title="Add a week"
          >
            <Plus size={12} /> Add week
          </button>
        </div>
        {isMultiWeek && (
          <div className="ww-week-controls">
            <input
              value={week?.label ?? ""}
              placeholder={`Week ${activeWeek + 1} label`}
              onChange={e => renameWeek(activeWeek, e.target.value)}
              className="ww-week-name"
              aria-label="Rename this week"
              maxLength={32}
            />
            <button
              type="button"
              className="ww-ex-info-btn"
              onClick={() => duplicateWeek(activeWeek)}
              aria-label="Duplicate this week"
              title="Duplicate this week"
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              className="ww-ex-info-btn"
              onClick={() => deleteWeek(activeWeek)}
              aria-label="Delete this week"
              title="Delete this week"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Day tabs — sticky so the active day stays visible while scrolling. */}
      <div className="ww-day-tabs ww-day-tabs-sticky">
        {WEEK_DAYS.map(d => {
          const dp = week?.days?.[d.key];
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
