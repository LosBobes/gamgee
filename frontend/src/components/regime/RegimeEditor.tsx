import { useMemo, useState } from "react";
import { ArrowLeft, Save, Search, X, Plus, Settings2, Check } from "lucide-react";
import type {
  Regime, DayPlan, WeekPlanDay, RegimeMode, ExerciseConfig, ExerciseDef,
} from "../../types";
import { WEEK_DAYS } from "../../data/weeklyPlan";
import { ALL_EX } from "../../data/exercises";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  regime: Regime;
  onSaved: (regime: Regime) => void;
  onCancel: () => void;
}

const WEEK_KEYS: WeekPlanDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const MODE_OPTIONS: Array<{ id: RegimeMode; label: string; desc: string }> = [
  {
    id: "per_exercise_rpe",
    label: "Per-exercise RPE",
    desc: "Tune the target RPE for every exercise individually.",
  },
  {
    id: "general_rpe",
    label: "General RPE",
    desc: "One RPE for the whole regime. The app auto-adjusts every weight.",
  },
  {
    id: "manual",
    label: "Fully manual",
    desc: "Set explicit sets / reps / weight per exercise. No auto-progression.",
  },
];

const DEFAULT_RPE = 7;
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;
const DEFAULT_WEIGHT = 0;

function cloneDay(d: DayPlan | undefined, dayKey: WeekPlanDay): DayPlan {
  const isRestDefault = dayKey === "sat" || dayKey === "sun";
  if (!d) return { focus: "upper", exerciseIds: [], enabled: !isRestDefault };
  return {
    focus: d.focus,
    exerciseIds: [...(d.exerciseIds ?? [])],
    enabled: d.enabled,
    exerciseConfig: d.exerciseConfig ? { ...d.exerciseConfig } : undefined,
  };
}

export default function RegimeEditor({ authFetch, regime, onSaved, onCancel }: Props) {
  const [name, setName] = useState(regime.name);
  const [description, setDescription] = useState(regime.description ?? "");
  const [mode, setMode] = useState<RegimeMode>(regime.mode ?? "general_rpe");
  const [generalRpe, setGeneralRpe] = useState<number>(regime.general_rpe ?? DEFAULT_RPE);
  const [days, setDays] = useState<Record<WeekPlanDay, DayPlan>>(() => {
    const out = {} as Record<WeekPlanDay, DayPlan>;
    WEEK_KEYS.forEach(k => { out[k] = cloneDay(regime.days?.[k], k); });
    return out;
  });
  const [activeDay, setActiveDay] = useState<WeekPlanDay>(() => {
    return WEEK_KEYS.find(k => days[k]?.enabled) ?? "mon";
  });
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const day = days[activeDay];

  const setDayState = (updates: Partial<DayPlan>) => {
    setDays(prev => ({ ...prev, [activeDay]: { ...prev[activeDay], ...updates } }));
  };

  const removeExercise = (exId: string) => {
    const nextIds = (day.exerciseIds ?? []).filter(x => x !== exId);
    const nextCfg = day.exerciseConfig ? { ...day.exerciseConfig } : undefined;
    if (nextCfg) delete nextCfg[exId];
    setDayState({ exerciseIds: nextIds, exerciseConfig: nextCfg });
    if (popoverFor === exId) setPopoverFor(null);
  };

  const addExercise = (exId: string) => {
    if ((day.exerciseIds ?? []).includes(exId)) return;
    setDayState({ exerciseIds: [...(day.exerciseIds ?? []), exId] });
  };

  const setExerciseConfig = (exId: string, patch: Partial<ExerciseConfig>) => {
    const prev = day.exerciseConfig?.[exId] ?? {};
    const next: ExerciseConfig = { ...prev, ...patch };
    // Strip undefined keys so the payload stays compact.
    (Object.keys(next) as (keyof ExerciseConfig)[]).forEach(k => {
      if (next[k] === undefined) delete next[k];
    });
    setDayState({
      exerciseConfig: { ...(day.exerciseConfig ?? {}), [exId]: next },
    });
  };

  const pickResults = useMemo<ExerciseDef[]>(() => {
    const q = pickQuery.trim().toLowerCase();
    const have = new Set(day.exerciseIds ?? []);
    const base = ALL_EX.filter(e => !have.has(e.id));
    if (!q) return base.slice(0, 60);
    return base
      .filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      .slice(0, 60);
  }, [pickQuery, day.exerciseIds]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: name.trim() || regime.name,
        description: description.trim() || null,
        goal: regime.goal,
        experience: regime.experience,
        days_per_week: regime.days_per_week,
        focus_areas: regime.focus_areas,
        avoid_muscles: regime.avoid_muscles,
        equipment: regime.equipment,
        days,
        mode,
        general_rpe: mode === "general_rpe" ? generalRpe : null,
      };
      const r = await authFetch(`/api/regimes/${regime.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setErr(e.detail || "Couldn't save");
        return;
      }
      const saved: Regime = await r.json();
      onSaved(saved);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const renderConfigChip = (exId: string) => {
    const cfg = day.exerciseConfig?.[exId];
    if (mode === "per_exercise_rpe") {
      const rpe = cfg?.rpe ?? DEFAULT_RPE;
      return <span className="re-cfg-chip">RPE {rpe}</span>;
    }
    if (mode === "manual") {
      const s = cfg?.sets ?? DEFAULT_SETS;
      const reps = cfg?.reps ?? DEFAULT_REPS;
      const w = cfg?.weight ?? DEFAULT_WEIGHT;
      return <span className="re-cfg-chip">{s}×{reps} @ {w}kg</span>;
    }
    return null;
  };

  const renderPopover = (exId: string) => {
    const cfg = day.exerciseConfig?.[exId] ?? {};
    if (mode === "per_exercise_rpe") {
      const rpe = cfg.rpe ?? DEFAULT_RPE;
      return (
        <div className="re-popover" onClick={e => e.stopPropagation()}>
          <div className="re-popover-row">
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Target RPE</span>
            <strong style={{ fontSize: 16 }}>{rpe}</strong>
          </div>
          <input
            type="range" min={1} max={10} step={1} value={rpe}
            onChange={e => setExerciseConfig(exId, { rpe: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
            <span>1 easy</span><span>10 max</span>
          </div>
          <button className="btn-sec" onClick={() => setPopoverFor(null)} style={{ marginTop: 6 }}>
            <Check size={12} /> Done
          </button>
        </div>
      );
    }
    if (mode === "manual") {
      const s = cfg.sets ?? DEFAULT_SETS;
      const reps = cfg.reps ?? DEFAULT_REPS;
      const w = cfg.weight ?? DEFAULT_WEIGHT;
      return (
        <div className="re-popover" onClick={e => e.stopPropagation()}>
          <div className="re-popover-grid">
            <label>Sets
              <input
                type="number" min={1} max={20} value={s}
                onChange={e => setExerciseConfig(exId, { sets: Math.max(1, Number(e.target.value) || 1) })}
              />
            </label>
            <label>Reps
              <input
                type="number" min={1} max={100} value={reps}
                onChange={e => setExerciseConfig(exId, { reps: Math.max(1, Number(e.target.value) || 1) })}
              />
            </label>
            <label>Weight (kg)
              <input
                type="number" min={0} step={2.5} value={w}
                onChange={e => setExerciseConfig(exId, { weight: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          </div>
          <button className="btn-sec" onClick={() => setPopoverFor(null)} style={{ marginTop: 6 }}>
            <Check size={12} /> Done
          </button>
        </div>
      );
    }
    return null;
  };

  const exerciseDef = (id: string): ExerciseDef | null => ALL_EX.find(e => e.id === id) ?? null;

  return (
    <div className="regime-editor" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="wz-hdr wz-hdr-sticky">
        <button className="wz-back" onClick={onCancel}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">EDIT REGIME</span>
        <button className="wz-next" onClick={save} disabled={busy}>
          {busy ? "…" : "SAVE"} <Save size={13} />
        </button>
      </div>

      <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Description</label>
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Optional"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Mode
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {MODE_OPTIONS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                style={{
                  textAlign: "left", padding: 10,
                  border: `1px solid ${mode === m.id ? "var(--accent)" : "var(--ad)"}`,
                  borderRadius: 8,
                  background: mode === m.id ? "var(--ad2)" : "transparent",
                  color: "inherit", cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {mode === "general_rpe" && (
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
              General RPE: <strong>{generalRpe}</strong>
            </label>
            <input
              type="range" min={1} max={10} step={1} value={generalRpe}
              onChange={e => setGeneralRpe(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
              <span>1 — easy (big jumps)</span><span>10 — max (back off)</span>
            </div>
          </div>
        )}
      </div>

      {/* Day tabs */}
      <div className="ww-day-tabs ww-day-tabs-sticky">
        {WEEK_DAYS.map(d => {
          const dp = days[d.key];
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
      <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong>{WEEK_DAYS.find(d => d.key === activeDay)?.label}</strong>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <input
              type="checkbox" checked={day.enabled}
              onChange={e => setDayState({ enabled: e.target.checked })}
            />
            Training day
          </label>
        </div>

        {day.enabled && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(day.exerciseIds ?? []).length === 0 && (
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  No exercises yet. Tap "Add exercise" to pick some.
                </div>
              )}
              {(day.exerciseIds ?? []).map(id => {
                const ex = exerciseDef(id);
                if (!ex) return null;
                const isOpen = popoverFor === id;
                const clickable = mode === "per_exercise_rpe" || mode === "manual";
                return (
                  <div key={id} style={{ position: "relative" }}>
                    <div
                      className="re-ex-row"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        border: "1px solid var(--ad)",
                        borderRadius: 8,
                        background: isOpen ? "var(--ad2)" : "transparent",
                        cursor: clickable ? "pointer" : "default",
                      }}
                      onClick={() => clickable && setPopoverFor(isOpen ? null : id)}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ex.name}
                      </span>
                      {renderConfigChip(id)}
                      {clickable && (
                        <Settings2 size={13} style={{ opacity: 0.55 }} aria-label="Configure" />
                      )}
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={e => { e.stopPropagation(); removeExercise(id); }}
                        aria-label={`Remove ${ex.name}`}
                        title="Remove"
                        style={{ padding: 4 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {isOpen && renderPopover(id)}
                  </div>
                );
              })}
            </div>

            <div>
              {picking ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  <div className="ww-search-wrap">
                    <Search size={13} className="ww-search-icon" />
                    <input
                      className="ww-search-input"
                      type="search"
                      placeholder={`Search ${ALL_EX.length} exercises…`}
                      value={pickQuery}
                      onChange={e => setPickQuery(e.target.value)}
                      autoFocus
                    />
                    {pickQuery && (
                      <button className="ww-search-clear" onClick={() => setPickQuery("")} aria-label="Clear">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {pickResults.map(ex => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => addExercise(ex.id)}
                        style={{
                          textAlign: "left", padding: "8px 10px",
                          border: "1px solid var(--ad)", borderRadius: 6,
                          background: "transparent", color: "inherit", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                        }}
                      >
                        <Plus size={12} />
                        <span>{ex.name}</span>
                      </button>
                    ))}
                    {pickResults.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>No matches.</div>
                    )}
                  </div>
                  <button className="btn-sec" onClick={() => { setPicking(false); setPickQuery(""); }}>
                    Close picker
                  </button>
                </div>
              ) : (
                <button className="btn-pri" onClick={() => setPicking(true)} style={{ marginTop: 6 }}>
                  <Plus size={14} /> Add exercise
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {err && <div style={{ color: "var(--red)", fontSize: 12 }}>{err}</div>}
    </div>
  );
}
