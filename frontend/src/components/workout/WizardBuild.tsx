import { useState } from "react";
import type { ExerciseDef, SuggExercise } from "../../types";
import { GROUPS, getActive, muscleGroups } from "../../constants";
import { MI } from "../../data/muscles";
import { EM, ALL_EX } from "../../data/exercises";
import { FOCUS } from "../../data/focuses";
import BodyMap from "../BodyMap";
import SuggCard from "../SuggCard";

interface Props {
  focus:       string;
  planned:     ExerciseDef[];
  setPlanned:  (fn: (p: ExerciseDef[]) => ExerciseDef[]) => void;
  onBack:      () => void;
  onNext:      () => void;
}

export default function WizardBuild({ focus, planned, setPlanned, onBack, onNext }: Props) {
  const [hovEx,   setHovEx]   = useState<ExerciseDef | null>(null);
  const [showAll, setShowAll] = useState(false);

  const activeMuscles  = getActive(planned);
  const previewMuscles = hovEx ? getActive([hovEx]) : {};
  const coveredGroups  = muscleGroups(activeMuscles);

  const suggestions: SuggExercise[] = (() => {
    const focusIds   = FOCUS[focus].exIds;
    const plannedIds = new Set(planned.map(e => e.id));
    return ALL_EX
      .filter(ex => !plannedIds.has(ex.id) && ex.type !== "cardio")
      .map(ex => {
        const m       = EM[ex.id] || { p: [], s: [] };
        const newP    = m.p.filter(mid => !activeMuscles[mid]);
        const ovP     = m.p.filter(mid => activeMuscles[mid] === "primary");
        const newS    = m.s.filter(mid => !activeMuscles[mid]);
        const isFocus = focusIds.includes(ex.id);
        return { ...ex, score: (isFocus ? 100 : 0) + newP.length * 10 + newS.length * 2, newP, ovP, newS, isFocus };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  })();

  const focusSuggs   = suggestions.filter(s => s.isFocus);
  const otherSuggs   = suggestions.filter(s => !s.isFocus);
  const displayOther = showAll ? otherSuggs : otherSuggs.slice(0, 8);

  const addPlanned    = (ex: ExerciseDef) => setPlanned(p => [...p, ex]);
  const removePlanned = (id: string)      => setPlanned(p => p.filter(e => e.id !== id));

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}>← BACK</button>
        <span className="wz-focus-label">{FOCUS[focus]?.icon} {FOCUS[focus]?.name.toUpperCase()}</span>
        <button className="wz-next" onClick={onNext} disabled={planned.length === 0}>REVIEW →</button>
      </div>

      <BodyMap active={activeMuscles} preview={previewMuscles} />

      <div className="coverage-bar-wrap">
        <div className="coverage-top">
          <span className="coverage-title">Muscle Coverage</span>
          <span className="coverage-count">
            {coveredGroups.size}
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>
              &nbsp;/ {GROUPS.length} groups
            </span>
          </span>
        </div>
        <div className="coverage-groups">
          {GROUPS.map(g => {
            const hit     = coveredGroups.has(g);
            const preview = hovEx && muscleGroups(previewMuscles).has(g) && !hit;
            return (
              <span key={g} className="group-chip" style={{
                color:       preview ? "#52B788" : hit ? "#E8981E" : "var(--muted)",
                background:  preview ? "rgba(82,183,136,0.1)" : hit ? "var(--ad)" : "transparent",
                borderColor: preview ? "rgba(82,183,136,0.3)" : hit ? "rgba(232,152,30,0.3)" : "var(--border)",
              }}>
                {g}
              </span>
            );
          })}
        </div>
      </div>

      {focusSuggs.length > 0 && (
        <>
          <div className="section-title">
            ⭐ SUGGESTED FOR {FOCUS[focus]?.name.toUpperCase()}
            <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400, letterSpacing: 0 }}>
              hover to preview on map
            </span>
          </div>
          {focusSuggs.map(ex => (
            <SuggCard key={ex.id} ex={ex}
              isAdded={planned.some(p => p.id === ex.id)}
              onAdd={()    => addPlanned(ex)}
              onRemove={()  => removePlanned(ex.id)}
              onHover={()   => setHovEx(ex)}
              onLeave={()   => setHovEx(null)}
            />
          ))}
        </>
      )}

      <div className="section-title" style={{ marginTop: 16 }}>➕ MORE EXERCISES</div>
      {displayOther.map(ex => (
        <SuggCard key={ex.id} ex={ex}
          isAdded={planned.some(p => p.id === ex.id)}
          onAdd={()    => addPlanned(ex)}
          onRemove={()  => removePlanned(ex.id)}
          onHover={()   => setHovEx(ex)}
          onLeave={()   => setHovEx(null)}
        />
      ))}
      {!showAll && otherSuggs.length > 8 && (
        <button
          onClick={() => setShowAll(true)}
          style={{ width: "100%", background: "transparent", border: "1px dashed var(--border)", color: "var(--muted)", borderRadius: 6, padding: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 12 }}
        >
          show {otherSuggs.length - 8} more exercises…
        </button>
      )}

      {planned.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>✓ ADDED ({planned.length})</div>
          {planned.map((ex, i) => {
            const m = EM[ex.id] || { p: [], s: [] };
            return (
              <div key={ex.id} className="planned-card">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{i + 1}</span>
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
            style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 15 }}
            onClick={onNext}
          >
            REVIEW WORKOUT →
          </button>
        </>
      )}
    </>
  );
}
