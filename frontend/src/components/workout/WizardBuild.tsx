import { useState } from "react";
import type { ExerciseDef, SuggExercise } from "../../types";
import { GROUPS, getActive, muscleGroups } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, ALL_EX } from "../../data/exercises";
import { FOCUS } from "../../data/focuses";
import BodyMap from "../BodyMap";
import SuggCard from "../SuggCard";

interface Props {
  focus:      string;
  planned:    ExerciseDef[];
  setPlanned: (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  onBack:     () => void;
  onNext:     () => void;
}

export default function WizardBuild({ focus, planned, setPlanned, onBack, onNext }: Props) {
  const [hovEx,  setHovEx]  = useState<ExerciseDef | null>(null);
  const [search, setSearch] = useState("");

  const activeMuscles  = getActive(planned);
  const previewMuscles = hovEx ? getActive([hovEx]) : {};
  const coveredGroups  = muscleGroups(activeMuscles);
  const plannedIds     = new Set(planned.map(e => e.id));

  const addPlanned    = (ex: ExerciseDef) => setPlanned(p => [...p, ex]);
  const removePlanned = (id: string)      => setPlanned(p => p.filter(e => e.id !== id));

  // Enrich all non-cardio exercises with suggestion metadata
  const allSuggs: SuggExercise[] = ALL_EX
    .filter(ex => ex.type !== "cardio")
    .map(ex => {
      const m       = EM[ex.id] || { p: [], s: [] };
      const newP    = m.p.filter(mid => !activeMuscles[mid]);
      const ovP     = m.p.filter(mid => activeMuscles[mid] === "primary");
      const newS    = m.s.filter(mid => !activeMuscles[mid]);
      const isFocus = FOCUS[focus].exIds.includes(ex.id);
      return { ...ex, score: (isFocus ? 100 : 0) + newP.length * 10 + newS.length * 2, newP, ovP, newS, isFocus };
    });

  const q = search.trim().toLowerCase();

  // Search: filter by name, sort alphabetically
  // Default: score-sorted, split into focus / others
  const searchResults = q
    ? allSuggs
        .filter(ex => ex.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name))
    : null;

  const sorted     = allSuggs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const focusSuggs = sorted.filter(s => s.isFocus);
  const otherSuggs = sorted.filter(s => !s.isFocus);

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
        <button className="wz-back" onClick={onBack}>← BACK</button>
        <span className="wz-focus-label">{FOCUS[focus]?.icon} {FOCUS[focus]?.name.toUpperCase()}</span>
        <button className="wz-next" onClick={onNext} disabled={planned.length === 0}>REVIEW →</button>
      </div>

      <div className="build-layout">

        {/* ── LEFT COLUMN: body map + coverage + added exercises ── */}
        <div className="build-left">
          <BodyMap active={activeMuscles} preview={previewMuscles} />

          <div className="coverage-bar-wrap">
            <div className="coverage-top">
              <span className="coverage-title">Coverage</span>
              <span className="coverage-count">
                {coveredGroups.size}
                <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>
                  &nbsp;/ {GROUPS.length}
                </span>
              </span>
            </div>
            <div className="coverage-groups">
              {GROUPS.map(g => {
                const hit  = coveredGroups.has(g);
                const prev = hovEx && muscleGroups(previewMuscles).has(g) && !hit;
                return (
                  <span key={g} className="group-chip" style={{
                    color:       prev ? "#52B788" : hit ? "#E8981E" : "var(--muted)",
                    background:  prev ? "rgba(82,183,136,0.1)" : hit ? "var(--ad)" : "transparent",
                    borderColor: prev ? "rgba(82,183,136,0.3)" : hit ? "rgba(232,152,30,0.3)" : "var(--border)",
                  }}>{g}</span>
                );
              })}
            </div>
          </div>

          {planned.length > 0 && (
            <div className="build-planned">
              <div className="section-title" style={{ marginBottom: 6 }}>✓ ADDED ({planned.length})</div>
              {planned.map((ex, i) => {
                const m = EM[ex.id] || { p: [], s: [] };
                return (
                  <div key={ex.id} className="planned-card">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</span>
                        <div className="planned-name">{ex.name}</div>
                      </div>
                      <div className="planned-muscles">{m.p.map(mid => MI[mid]?.n).join(" · ")}</div>
                    </div>
                    <button className="btn-rm" onClick={() => removePlanned(ex.id)}>✕</button>
                  </div>
                );
              })}
              <button
                className="wz-next"
                style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}
                onClick={onNext}
              >
                REVIEW WORKOUT →
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: search + exercise browser ── */}
        <div className="build-right">
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="🔍  Search exercises…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">✕</button>
            )}
          </div>

          {searchResults ? (
            /* ── Search results ── */
            searchResults.length > 0 ? (
              <>
                <div className="section-title" style={{ marginBottom: 6 }}>
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </div>
                {searchResults.map(renderCard)}
              </>
            ) : (
              <p className="search-empty">No exercises match "{search}"</p>
            )
          ) : (
            /* ── Default: focus suggestions + all others ── */
            <>
              {focusSuggs.length > 0 && (
                <>
                  <div className="section-title">
                    ⭐ {FOCUS[focus]?.name.toUpperCase()}
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400, letterSpacing: 0 }}>
                      hover to preview
                    </span>
                  </div>
                  {focusSuggs.map(renderCard)}
                </>
              )}

              {otherSuggs.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 14 }}>➕ ALL EXERCISES</div>
                  {otherSuggs.map(renderCard)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
