import { useState } from "react";
import { ArrowLeft, Check, X, Search, Star, Plus, Wrench, Bookmark } from "lucide-react";
import type { ExerciseDef, SuggExercise, WorkoutSession, WorkoutTemplate, WorkoutTemplateDraft } from "../../types";
import { GROUPS, getActive, muscleGroups } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, ALL_EX } from "../../data/exercises";
import { FOCUS, getFocusDef } from "../../data/focuses";
import BodyMap from "../BodyMap";
import SuggCard from "../SuggCard";
import CustomExerciseModal from "./CustomExerciseModal";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  /** When set, the builder edits this existing template instead of creating a
   * new one (prefilled name/focus/exercises; Save calls onUpdateTemplate). */
  initial?: WorkoutTemplate | null;
  /** Persist a brand-new template. */
  onSaveTemplate: (draft: WorkoutTemplateDraft) => Promise<WorkoutTemplate | null>;
  /** Overwrite the template identified by `initial`. */
  onUpdateTemplate: (id: number, draft: WorkoutTemplateDraft) => Promise<WorkoutTemplate | null>;
  /** Return to the mode screen (after save or cancel). */
  onDone:  () => void;
  history: WorkoutSession[];
}

/**
 * Dedicated template builder — assemble a reusable workout (name + optional
 * focus + exercises) and save it, *without* starting or logging a workout.
 * Holds its own local state so it never touches the live workout wizard's
 * `planned` list. Doubles as the editor when `initial` is supplied.
 */
export default function WizardTemplate({ initial, onSaveTemplate, onUpdateTemplate, onDone, history }: Props) {
  const t = useTxt();
  const isEdit = !!initial;
  const [name,            setName]            = useState(initial?.name ?? "");
  const [focus,           setFocus]           = useState<string | null>(initial?.focus ?? null);
  const [planned,         setPlanned]         = useState<ExerciseDef[]>(() =>
    (initial?.exercise_ids ?? [])
      .map(id => ALL_EX.find(e => e.id === id))
      .filter((e): e is ExerciseDef => !!e),
  );
  const [hovEx,           setHovEx]           = useState<ExerciseDef | null>(null);
  const [search,          setSearch]          = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);

  const addPlanned    = (ex: ExerciseDef) => setPlanned(p => p.some(e => e.id === ex.id) ? p : [...p, ex]);
  const removePlanned = (id: string)      => setPlanned(p => p.filter(e => e.id !== id));

  const canSave = !!name.trim() && planned.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const ids = planned.map(p => p.id);
    // When editing, carry forward any per-exercise targets the template already
    // had for exercises that survive the edit — the builder has no config UI,
    // so we mustn't wipe them.
    const exercise_config = initial
      ? Object.fromEntries(
          Object.entries(initial.exercise_config || {}).filter(([id]) => ids.includes(id)),
        )
      : {};
    const draft: WorkoutTemplateDraft = { name: name.trim(), focus, exercise_ids: ids, exercise_config };
    const result = initial
      ? await onUpdateTemplate(initial.id, draft)
      : await onSaveTemplate(draft);
    setSaving(false);
    if (result) {
      setSaved(true);
      window.setTimeout(onDone, 750);
    }
  };

  const activeMuscles  = getActive(planned);
  const previewMuscles = hovEx ? getActive([hovEx]) : {};
  const plannedIds     = new Set(planned.map(e => e.id));

  // Focus is optional here — when set it drives suggestions + coverage targets.
  const focusDef     = focus ? getFocusDef(focus) : null;
  const focusMuscles = focusDef
    ? getActive(focusDef.exIds.flatMap(id => {
        const ex = ALL_EX.find(e => e.id === id);
        return ex ? [ex] : [];
      }))
    : {};
  const focusGroups        = muscleGroups(focusMuscles);
  const coveredGroups      = muscleGroups(activeMuscles);
  const missingFocusGroups = GROUPS.filter(g => focusGroups.has(g) && !coveredGroups.has(g));
  const missingMids        = new Set(Object.keys(focusMuscles).filter(mid => !activeMuscles[mid]));

  // Favourites by focus — exercises you log most under this focus rank higher.
  const favFreq: Record<string, number> = {};
  if (focus) history.filter(s => s.focus === focus).forEach(s =>
    s.exercises.forEach(ex => { favFreq[ex.id] = (favFreq[ex.id] || 0) + 1; })
  );
  const maxFav = Math.max(1, ...Object.values(favFreq));

  const allSuggs: SuggExercise[] = ALL_EX
    .filter(ex => ex.type !== "cardio")
    .map(ex => {
      const m       = EM[ex.id] || { p: [], s: [] };
      const newP    = m.p.filter(mid => !activeMuscles[mid]);
      const ovP     = m.p.filter(mid => activeMuscles[mid] === "primary");
      const newS    = m.s.filter(mid => !activeMuscles[mid]);
      const isFocus = !!focusDef && focusDef.exIds.includes(ex.id);
      const gap     = m.p.filter(mid => missingMids.has(mid)).length;
      const fav     = (favFreq[ex.id] || 0) / maxFav;
      return { ...ex, score: gap * 30 + fav * 20 + (isFocus ? 10 : 0) + newS.length * 2, newP, ovP, newS, isFocus };
    });

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? allSuggs.filter(ex => ex.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
    : null;

  const sorted     = allSuggs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const focusSuggs = sorted.filter(s => s.isFocus);
  const otherSuggs = sorted.filter(s => !s.isFocus);

  const renderCard = (ex: SuggExercise) => (
    <SuggCard key={ex.id} ex={ex}
      isAdded={plannedIds.has(ex.id)}
      onAdd={()    => addPlanned(ex)}
      onRemove={() => removePlanned(ex.id)}
      onHover={()  => setHovEx(ex)}
      onLeave={()  => setHovEx(null)}
    />
  );

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onDone}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">
          <Bookmark size={14} /> {isEdit ? t("EDIT TEMPLATE", "EDIT TEMPLATE", "EDIT TEMPLATE") : t("NEW TEMPLATE", "NEW TEMPLATE", "NEW TEMPLATE")}
        </span>
        <button className="wz-next" onClick={handleSave} disabled={!canSave}>
          {saved ? <>SAVED <Check size={14} /></> : <>SAVE <Check size={14} /></>}
        </button>
      </div>

      <div className="wizard-title">
        {isEdit
          ? t("Edit your template", "Tweak your template", "Edit your template, bestie")
          : t("Build a template", "Cook up a template", "Build a template, bestie")}
      </div>
      <div className="wizard-sub">
        {t(
          "Assemble a reusable workout and save it — no logging, no timer. Load it in one tap whenever you train.",
          "Stack the lifts, name it, save it. No reps logged. Load it in one tap next time you train.",
          "Stack the moves, name it, save it. No reps logged. Serve it in one tap next time, bestie."
        )}
      </div>

      <OnboardingHint hintKey="template" title={t("Just a blueprint", "Just a blueprint", "Just a blueprint")}>
        {t(
          "This only saves a reusable plan — it doesn't start a workout. Name it, optionally pick a focus for smart suggestions, add exercises, then Save.",
          "This just saves a reusable plan — no workout starts. Name it, pick a focus if you want suggestions, stack lifts, hit Save.",
          "This just saves a reusable plan — no workout starts. Name it, pick a vibe for suggestions, stack moves, hit Save."
        )}
      </OnboardingHint>

      {/* Name */}
      <input
        className="search-input tpl-name-input"
        placeholder={t("Template name (e.g. Push Day)", "Template name (e.g. Push Day)", "Template name (e.g. Push Day)")}
        value={name}
        onChange={e => setName(e.target.value)}
        maxLength={120}
        autoComplete="off"
      />

      {/* Optional focus selector */}
      <div className="tpl-focus-label">{t("Focus (optional)", "Focus (optional)", "Vibe (optional)")}</div>
      <div className="tpl-focus-row">
        <button
          className={`tpl-focus-chip${focus === null ? " selected" : ""}`}
          onClick={() => setFocus(null)}
        >
          {t("All", "All", "All")}
        </button>
        {Object.entries(FOCUS).map(([k, f]) => {
          const Icon = f.icon;
          return (
            <button
              key={k}
              className={`tpl-focus-chip${focus === k ? " selected" : ""}`}
              onClick={() => setFocus(k)}
            >
              <Icon size={13} /> {f.name}
            </button>
          );
        })}
      </div>

      <div className="build-layout">
        {/* ── LEFT: body map + coverage + added exercises ── */}
        <div className="build-left">
          <BodyMap active={activeMuscles} preview={previewMuscles} focusMuscles={focusDef ? focusMuscles : undefined} />

          <div className="coverage-bar-wrap">
            <div className="coverage-top">
              <span className="coverage-title">Coverage</span>
              <span className="coverage-count">
                {coveredGroups.size}
                <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'Nunito',sans-serif", fontWeight: 400 }}>
                  &nbsp;/ {GROUPS.length}
                </span>
              </span>
            </div>
            <div className="coverage-groups">
              {GROUPS.map(g => {
                const covered = coveredGroups.has(g);
                const inFocus = focusGroups.has(g);
                const prev    = !covered && !!hovEx && muscleGroups(previewMuscles).has(g);
                return (
                  <span key={g} className="group-chip" style={{
                    color:       prev ? "var(--green)" : covered ? "var(--accent)" : inFocus ? "#E8981E" : "var(--muted)",
                    background:  prev ? "rgba(82,183,136,0.1)" : covered ? "var(--ad)" : inFocus ? "rgba(232,152,30,0.08)" : "transparent",
                    borderColor: prev ? "rgba(82,183,136,0.3)" : covered ? "var(--ad2)" : inFocus ? "rgba(232,152,30,0.25)" : "transparent",
                    opacity:     inFocus || covered || prev ? 1 : 0.35,
                  }}>{g}</span>
                );
              })}
            </div>
            {missingFocusGroups.length > 0 && (
              <div className="gap-hint">
                <span className="gap-hint-label">MISSING</span>
                {missingFocusGroups.map(g => <span key={g} className="gap-chip">{g}</span>)}
              </div>
            )}
          </div>

          {planned.length > 0 && (
            <div className="build-planned">
              <div className="section-title" style={{ marginBottom: 8 }}>
                <Check size={14} /> ADDED ({planned.length})
              </div>
              {planned.map((ex, i) => {
                const m = EM[ex.id] || { p: [], s: [] };
                return (
                  <div key={ex.id} className="planned-card">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</span>
                        <div className="planned-name">{ex.name}</div>
                      </div>
                      <div className="planned-muscles">{m.p.map(mid => MI[mid]?.n).join(" · ")}</div>
                    </div>
                    <button className="btn-rm" onClick={() => removePlanned(ex.id)}><X size={18} /></button>
                  </div>
                );
              })}
              <button
                className="wz-next"
                style={{ width: "100%", marginTop: 10, padding: 16, fontSize: 15 }}
                onClick={handleSave}
                disabled={!canSave}
              >
                {saved
                  ? <>{isEdit ? t("Template Updated", "Template Updated", "Template Updated") : t("Template Saved", "Template Saved", "Template Saved")} <Check size={16} /></>
                  : <><Bookmark size={15} style={{ verticalAlign: -2, marginRight: 4 }} /> {isEdit ? t("Update Template", "Update Template", "Update Template") : t("Save Template", "Save Template", "Save Template")}</>}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: search + exercise browser ── */}
        <div className="build-right">
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder={`Search ${ALL_EX.filter(e => e.type !== "cardio").length} exercises…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {search
              ? <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>
              : <Search size={16} className="search-icon-hint" />
            }
          </div>

          <button className="cx-add-card" onClick={() => setShowCustomModal(true)}>
            <Wrench size={15} /> {t("Add Custom Exercise", "Build Your Own Lift", "Cook Your Own Move")}
          </button>

          {searchResults ? (
            searchResults.length > 0 ? (
              <>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </div>
                {searchResults.map(renderCard)}
              </>
            ) : (
              <p className="search-empty">{t(`No exercises match "${search}"`, `Nothing matches "${search}". Try a different name.`)}</p>
            )
          ) : (
            <>
              {focusSuggs.length > 0 && (
                <>
                  <div className="section-title">
                    <Star size={14} /> {(focusDef?.name ?? "").toUpperCase()}
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'Nunito',sans-serif", fontWeight: 400, letterSpacing: 0 }}>
                      hover to preview
                    </span>
                  </div>
                  {focusSuggs.map(renderCard)}
                </>
              )}

              {otherSuggs.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: focusSuggs.length > 0 ? 16 : 0 }}>
                    <Plus size={14} /> ALL EXERCISES
                  </div>
                  {otherSuggs.map(renderCard)}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showCustomModal && (
        <CustomExerciseModal
          onClose={() => setShowCustomModal(false)}
          onCreated={(def) => {
            const exDef: ExerciseDef = { id: def.id, name: def.name, type: def.type, cat: def.cat };
            addPlanned(exDef);
          }}
        />
      )}
    </>
  );
}
