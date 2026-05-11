import { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, Check, X, Search, Star, Plus, Clock, Zap } from "lucide-react";
import type { ExerciseDef, SuggExercise, WorkoutSession } from "../../types";
import { GROUPS, getActive, muscleGroups } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, ALL_EX } from "../../data/exercises";
import { FOCUS, getFocusDef } from "../../data/focuses";
import BodyMap from "../BodyMap";
import SuggCard from "../SuggCard";
import { useTxt } from "../../context/ToneContext";

interface Props {
  focus:      string;
  planned:    ExerciseDef[];
  setPlanned: (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  onBack:     () => void;
  onNext:     () => void;
  history:    WorkoutSession[];
}

export default function WizardBuild({ focus, planned, setPlanned, onBack, onNext, history }: Props) {
  const t = useTxt();
  const [hovEx,  setHovEx]  = useState<ExerciseDef | null>(null);
  const [search, setSearch] = useState("");

  // Most recent prior session matching this focus (used for the auto-populate prompt)
  const lastFocusSession = history.find(s => s.focus === focus && s.exercises.length > 0) ?? null;
  const lastExercises: ExerciseDef[] = lastFocusSession
    ? lastFocusSession.exercises
        .map(e => ALL_EX.find(x => x.id === e.id))
        .filter((x): x is ExerciseDef => !!x)
    : [];

  // Show the popup once per wizard build entry, only when there's something to populate
  // and the user hasn't already added exercises.
  const [showAutoPopup, setShowAutoPopup] = useState(
    () => lastExercises.length > 0 && planned.length === 0
  );
  // Re-trigger the prompt if the focus changes mid-session
  useEffect(() => {
    setShowAutoPopup(lastExercises.length > 0 && planned.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const handleAutoPopulate = () => {
    setPlanned(() => lastExercises);
    setShowAutoPopup(false);
  };
  const handleSkipAutoPopulate = () => setShowAutoPopup(false);

  const activeMuscles  = getActive(planned);
  const previewMuscles = hovEx ? getActive([hovEx]) : {};
  const plannedIds     = new Set(planned.map(e => e.id));

  // Muscles the focus type expects to train
  const focusDef     = getFocusDef(focus) ?? { name: focus, icon: FOCUS.full.icon, desc: "", exIds: [] };
  const focusMuscles = getActive(focusDef.exIds.flatMap(id => {
    const ex = ALL_EX.find(e => e.id === id);
    return ex ? [ex] : [];
  }));

  const focusGroups        = muscleGroups(focusMuscles);
  const coveredGroups      = muscleGroups(activeMuscles);
  const missingFocusGroups = GROUPS.filter(g => focusGroups.has(g) && !coveredGroups.has(g));
  const missingMids        = new Set(Object.keys(focusMuscles).filter(mid => !activeMuscles[mid]));

  // User favourites: how often each exercise appears in sessions with the same focus
  const favFreq: Record<string, number> = {};
  history.filter(s => s.focus === focus).forEach(s =>
    s.exercises.forEach(ex => { favFreq[ex.id] = (favFreq[ex.id] || 0) + 1; })
  );
  const maxFav = Math.max(1, ...Object.values(favFreq));

  const addPlanned    = (ex: ExerciseDef) => setPlanned(p => [...p, ex]);
  const removePlanned = (id: string)      => setPlanned(p => p.filter(e => e.id !== id));

  const allSuggs: SuggExercise[] = ALL_EX
    .filter(ex => ex.type !== "cardio")
    .map(ex => {
      const m       = EM[ex.id] || { p: [], s: [] };
      const newP    = m.p.filter(mid => !activeMuscles[mid]);
      const ovP     = m.p.filter(mid => activeMuscles[mid] === "primary");
      const newS    = m.s.filter(mid => !activeMuscles[mid]);
      const isFocus = focusDef.exIds.includes(ex.id);
      const gap     = m.p.filter(mid => missingMids.has(mid)).length;
      const fav     = (favFreq[ex.id] || 0) / maxFav;
      return { ...ex, score: gap * 30 + fav * 20 + (isFocus ? 10 : 0) + newS.length * 2, newP, ovP, newS, isFocus };
    });

  const q = search.trim().toLowerCase();

  const searchResults = q
    ? allSuggs
        .filter(ex => ex.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name))
    : null;

  const sorted     = allSuggs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const focusSuggs = sorted.filter(s => s.isFocus);
  const otherSuggs = sorted.filter(s => !s.isFocus);

  const FocusIcon = focusDef.icon;

  const renderCard = (ex: SuggExercise) => (
    <SuggCard key={ex.id} ex={ex}
      isAdded={plannedIds.has(ex.id)}
      onAdd={()    => addPlanned(ex)}
      onRemove={()  => removePlanned(ex.id)}
      onHover={()   => setHovEx(ex)}
      onLeave={()   => setHovEx(null)}
    />
  );

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">
          <FocusIcon size={13} /> {focusDef.name.toUpperCase()}
        </span>
        <button className="wz-next" onClick={onNext} disabled={planned.length === 0}>REVIEW <ChevronRight size={13} /></button>
      </div>

      <div className="build-layout">

        {/* ── LEFT COLUMN: body map + coverage + added exercises ── */}
        <div className="build-left">
          <BodyMap active={activeMuscles} preview={previewMuscles} focusMuscles={focusMuscles} />

          <div className="coverage-bar-wrap">
            <div className="coverage-top">
              <span className="coverage-title">Coverage</span>
              <span className="coverage-count">
                {coveredGroups.size}
                <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'Nunito',sans-serif", fontWeight: 400 }}>
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
              <div className="section-title" style={{ marginBottom: 6 }}>
                <Check size={12} /> ADDED ({planned.length})
              </div>
              {planned.map((ex, i) => {
                const m = EM[ex.id] || { p: [], s: [] };
                return (
                  <div key={ex.id} className="planned-card">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "'Nunito',sans-serif", fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</span>
                        <div className="planned-name">{ex.name}</div>
                      </div>
                      <div className="planned-muscles">{m.p.map(mid => MI[mid]?.n).join(" · ")}</div>
                    </div>
                    <button className="btn-rm" onClick={() => removePlanned(ex.id)}><X size={14} /></button>
                  </div>
                );
              })}
              <button
                className="wz-next"
                style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}
                onClick={onNext}
              >
                REVIEW WORKOUT <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: search + exercise browser ── */}
        <div className="build-right">
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Search exercises…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {search
              ? <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={11} /></button>
              : <Search size={13} className="search-icon-hint" />
            }
          </div>

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
                    <Star size={12} /> {focusDef.name.toUpperCase()}
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'Nunito',sans-serif", fontWeight: 400, letterSpacing: 0 }}>
                      hover to preview
                    </span>
                  </div>
                  {focusSuggs.map(renderCard)}
                </>
              )}

              {otherSuggs.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 14 }}>
                    <Plus size={12} /> ALL EXERCISES
                  </div>
                  {otherSuggs.map(renderCard)}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showAutoPopup && lastFocusSession && (
        <div className="cf-overlay" onClick={handleSkipAutoPopulate}>
          <div className="cf-modal autopop-modal" onClick={e => e.stopPropagation()}>
            <div className="autopop-top">
              <Clock size={16} />
              <div>
                <div className="cf-modal-title" style={{ marginBottom: 4 }}>{t("Auto-populate?", "Reload last session?")}</div>
                <div className="autopop-sub">
                  {t(
                    `Load the ${lastExercises.length} exercise${lastExercises.length !== 1 ? "s" : ""} from your last ${focusDef.name.toLowerCase()} workout. You can edit before starting.`,
                    `Grab the ${lastExercises.length} exercise${lastExercises.length !== 1 ? "s" : ""} from your last ${focusDef.name.toLowerCase()} session. Tweak as needed, it's your workout.`
                  )}
                </div>
              </div>
            </div>
            <div className="autopop-list">
              {lastExercises.map((ex, i) => (
                <div key={ex.id} className="autopop-row">
                  <span className="autopop-num">{i + 1}</span>
                  <span className="autopop-name">{ex.name}</span>
                </div>
              ))}
            </div>
            <div className="cf-modal-actions">
              <button className="cf-btn-cancel" onClick={handleSkipAutoPopulate}>{t("Start Blank", "Start Fresh")}</button>
              <button className="cf-btn-save" onClick={handleAutoPopulate}>
                <Zap size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                {t("Auto-populate", "Load Last Session")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
