import { useMemo, useState } from "react";
import { ArrowLeft, Save, Search, X, Plus, Settings2, Check, Copy, Trash2, Bookmark } from "lucide-react";
import type {
  Regime, DayPlan, WeekPlanDay, ExerciseConfig, ExerciseDef, WeekPlan, WorkoutTemplate,
} from "../../types";
import { WEEK_DAYS } from "../../data/weeklyPlan";
import { getFocusDef } from "../../data/focuses";
import { ALL_EX } from "../../data/exercises";
import { prescribeExercise, weightForRpe } from "../../analysis";
import { orm1 } from "../../utils";
import { UPPER_IDS } from "../../constants";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  regime: Regime;
  templates?: WorkoutTemplate[];
  onSaved: (regime: Regime) => void;
  onCancel: () => void;
}

const WEEK_KEYS: WeekPlanDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DEFAULT_RPE = 7;
const DEFAULT_WORKING_SETS = 3;
const DEFAULT_WORKING_REPS = 8;
const DEFAULT_WARMUP_SETS = 2;

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

function cloneWeek(w: WeekPlan | undefined, label?: string | null): WeekPlan {
  const days: Partial<Record<WeekPlanDay, DayPlan>> = {};
  WEEK_KEYS.forEach(k => { days[k] = cloneDay(w?.days?.[k], k); });
  return { label: label ?? w?.label ?? null, days };
}

/** Coerce a regime payload (which may carry the legacy single-week `days`
 * field instead of `weeks`) into a list of weeks for the editor. */
function regimeToWeeks(r: Regime): WeekPlan[] {
  if (r.weeks && r.weeks.length > 0) {
    return r.weeks.map(w => cloneWeek(w));
  }
  return [cloneWeek({ label: "Week 1", days: r.days || {} })];
}

export default function RegimeEditor({ authFetch, regime, templates = [], onSaved, onCancel }: Props) {
  const [name, setName] = useState(regime.name);
  const [description, setDescription] = useState(regime.description ?? "");
  const [weeks, setWeeks] = useState<WeekPlan[]>(() => regimeToWeeks(regime));
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeDay, setActiveDay] = useState<WeekPlanDay>(() => {
    const firstWeek = regimeToWeeks(regime)[0];
    return WEEK_KEYS.find(k => firstWeek.days?.[k]?.enabled) ?? "mon";
  });
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const week = weeks[activeWeek];
  const day = week?.days?.[activeDay] ?? { focus: "upper", exerciseIds: [], enabled: false };

  const updateDay = (updater: (d: DayPlan) => DayPlan) => {
    setWeeks(prev => prev.map((w, i) => {
      if (i !== activeWeek) return w;
      const cur = w.days[activeDay] ?? { focus: "upper", exerciseIds: [], enabled: false };
      const next = updater(cur);
      return { ...w, days: { ...w.days, [activeDay]: next } };
    }));
  };

  const setDayState = (updates: Partial<DayPlan>) => updateDay(d => ({ ...d, ...updates }));

  const removeExercise = (exId: string) => {
    updateDay(d => {
      const nextIds = (d.exerciseIds ?? []).filter(x => x !== exId);
      const nextCfg = d.exerciseConfig ? { ...d.exerciseConfig } : undefined;
      if (nextCfg) delete nextCfg[exId];
      return { ...d, exerciseIds: nextIds, exerciseConfig: nextCfg };
    });
    if (popoverFor === exId) setPopoverFor(null);
  };

  const addExercise = (exId: string) => {
    updateDay(d => {
      if ((d.exerciseIds ?? []).includes(exId)) return d;
      // Seed a default prescription so a user who just adds and saves gets a
      // sane starting point on game-day. They can edit it via the popover.
      const cfg: ExerciseConfig = {
        rpe: DEFAULT_RPE,
        warmup_sets: DEFAULT_WARMUP_SETS,
        working_sets: DEFAULT_WORKING_SETS,
        working_reps: DEFAULT_WORKING_REPS,
      };
      const nextCfg = { ...(d.exerciseConfig ?? {}), [exId]: cfg };
      return { ...d, exerciseIds: [...(d.exerciseIds ?? []), exId], exerciseConfig: nextCfg };
    });
  };

  // Load a saved template into the current day: set the focus and replace the
  // day's exercises with the template's, seeding the same default prescription
  // a manual add would so each lift has working sets/reps to prescribe from.
  // Any per-exercise targets the template carries override those defaults.
  const applyTemplate = (tpl: WorkoutTemplate) => {
    updateDay(d => {
      const cfg: Record<string, ExerciseConfig> = {};
      tpl.exercise_ids.forEach(id => {
        cfg[id] = {
          rpe: DEFAULT_RPE,
          warmup_sets: DEFAULT_WARMUP_SETS,
          working_sets: DEFAULT_WORKING_SETS,
          working_reps: DEFAULT_WORKING_REPS,
          ...(tpl.exercise_config?.[id] ?? {}),
        };
      });
      return {
        ...d,
        enabled: true,
        focus: tpl.focus || d.focus,
        exerciseIds: [...tpl.exercise_ids],
        exerciseConfig: cfg,
      };
    });
    setPopoverFor(null);
  };

  const setExerciseConfig = (exId: string, patch: Partial<ExerciseConfig>) => {
    updateDay(d => {
      const prev = d.exerciseConfig?.[exId] ?? {};
      const next: ExerciseConfig = { ...prev, ...patch };
      (Object.keys(next) as (keyof ExerciseConfig)[]).forEach(k => {
        if (next[k] === undefined) delete next[k];
      });
      return { ...d, exerciseConfig: { ...(d.exerciseConfig ?? {}), [exId]: next } };
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

  // ── Multi-week controls ────────────────────────────────────────────────
  const addWeek = () => {
    setWeeks(prev => {
      // New week starts as a copy of the currently-active week so the user
      // doesn't lose their structure — they tweak RPEs/reps from there.
      const base = prev[activeWeek] ?? prev[0];
      const copy = cloneWeek(base, `Week ${prev.length + 1}`);
      const next = [...prev, copy];
      setActiveWeek(next.length - 1);
      return next;
    });
  };

  const duplicateWeek = (idx: number) => {
    setWeeks(prev => {
      const copy = cloneWeek(prev[idx], `${prev[idx].label || `Week ${idx + 1}`} (copy)`);
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      setActiveWeek(idx + 1);
      return next;
    });
  };

  const deleteWeek = (idx: number) => {
    setWeeks(prev => {
      if (prev.length <= 1) return prev;  // keep at least one week
      const next = prev.filter((_, i) => i !== idx);
      setActiveWeek(i => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
  };

  const renameWeek = (idx: number, label: string) => {
    setWeeks(prev => prev.map((w, i) => i === idx ? { ...w, label } : w));
  };

  // ── Save ───────────────────────────────────────────────────────────────
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
        weeks,
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
    const rpe = cfg?.rpe ?? DEFAULT_RPE;
    const ws = cfg?.working_sets ?? DEFAULT_WORKING_SETS;
    const wr = cfg?.working_reps ?? DEFAULT_WORKING_REPS;
    return <span className="re-cfg-chip">{ws}×{wr} @ RPE {rpe}</span>;
  };

  const renderPopover = (exId: string) => {
    const cfg = day.exerciseConfig?.[exId] ?? {};
    const rpe = cfg.rpe ?? DEFAULT_RPE;
    const maxW = cfg.max_weight ?? "";
    const maxR = cfg.max_reps ?? "";
    const warmupSets = cfg.warmup_sets ?? DEFAULT_WARMUP_SETS;
    const workingSets = cfg.working_sets ?? DEFAULT_WORKING_SETS;
    const workingReps = cfg.working_reps ?? DEFAULT_WORKING_REPS;

    // Preview the prescription so the user sees what the active workout
    // will lay out for them on game day.
    const previewWeight = (() => {
      const mw = Number(maxW);
      const mr = Number(maxR);
      if (!mw || !mr) return null;
      const est = orm1(mw, mr);
      const plate = UPPER_IDS.has(exId) ? 2.5 : 5;
      return Math.max(plate, Math.round(weightForRpe(est, workingReps, rpe) / plate) * plate);
    })();

    const presc = prescribeExercise(exId, {
      rpe, max_weight: typeof maxW === "number" ? maxW : Number(maxW) || undefined,
      max_reps: typeof maxR === "number" ? maxR : Number(maxR) || undefined,
      warmup_sets: warmupSets, working_sets: workingSets, working_reps: workingReps,
    });

    return (
      <div className="re-popover" onClick={e => e.stopPropagation()}>
        <div className="re-popover-section">
          <div className="re-popover-row">
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Effort (RPE)</span>
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
        </div>

        <div className="re-popover-section">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
            Your reference max for this lift — we'll prescribe each working set from it.
          </div>
          <div className="re-popover-grid">
            <label>Max weight (kg)
              <input
                type="number" min={0} step={2.5} value={maxW}
                placeholder="e.g. 100"
                onChange={e => {
                  const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0);
                  setExerciseConfig(exId, { max_weight: v });
                }}
              />
            </label>
            <label>Max reps @ that
              <input
                type="number" min={1} max={20} value={maxR}
                placeholder="e.g. 5"
                onChange={e => {
                  const v = e.target.value === "" ? undefined : Math.max(1, Number(e.target.value) || 1);
                  setExerciseConfig(exId, { max_reps: v });
                }}
              />
            </label>
          </div>
        </div>

        <div className="re-popover-section">
          <div className="re-popover-grid">
            <label>Warmup sets
              <input
                type="number" min={0} max={6} value={warmupSets}
                onChange={e => setExerciseConfig(exId, { warmup_sets: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })}
              />
            </label>
            <label>Working sets
              <input
                type="number" min={1} max={10} value={workingSets}
                onChange={e => setExerciseConfig(exId, { working_sets: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
              />
            </label>
            <label>Reps / set
              <input
                type="number" min={1} max={30} value={workingReps}
                onChange={e => setExerciseConfig(exId, { working_reps: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
              />
            </label>
          </div>
        </div>

        {previewWeight != null && presc && (
          <div className="re-popover-section" style={{ background: "var(--ad2)", borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Preview</div>
            {presc.warmup.length > 0 && (
              <div style={{ fontSize: 11 }}>
                <strong>Warmup:</strong>{" "}
                {presc.warmup.map((w, i) => (
                  <span key={i}>{w.weight}kg × {w.reps}{i < presc.warmup.length - 1 ? " · " : ""}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <strong>Working:</strong> {workingSets} × {previewWeight}kg × {workingReps} <span style={{ color: "var(--muted)" }}>@ RPE {rpe}</span>
            </div>
          </div>
        )}
        {previewWeight == null && (
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Add a max weight + reps to see the prescribed working weight.
          </div>
        )}

        <button className="btn-sec" onClick={() => setPopoverFor(null)} style={{ marginTop: 6 }}>
          <Check size={12} /> Done
        </button>
      </div>
    );
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
      </div>

      {/* Week tabs */}
      <div className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Program weeks
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {weeks.map((w, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActiveWeek(i); setPopoverFor(null); }}
              style={{
                padding: "6px 10px", borderRadius: 999,
                border: `1px solid ${activeWeek === i ? "var(--accent)" : "var(--ad)"}`,
                background: activeWeek === i ? "var(--ad2)" : "transparent",
                color: "inherit", cursor: "pointer", fontSize: 12,
              }}
              aria-pressed={activeWeek === i}
            >
              {w.label || `Week ${i + 1}`}
            </button>
          ))}
          <button
            type="button"
            onClick={addWeek}
            className="btn-sec"
            style={{ padding: "4px 10px" }}
            aria-label="Add week"
          >
            <Plus size={12} /> Add week
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={week?.label ?? ""}
            placeholder={`Week ${activeWeek + 1}`}
            onChange={e => renameWeek(activeWeek, e.target.value)}
            style={{ flex: "1 1 160px", minWidth: 0 }}
            aria-label="Week label"
          />
          <button
            type="button"
            className="btn-sec"
            onClick={() => duplicateWeek(activeWeek)}
            style={{ padding: "4px 8px" }}
            aria-label="Duplicate week"
            title="Duplicate this week"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            className="btn-sec"
            onClick={() => deleteWeek(activeWeek)}
            disabled={weeks.length <= 1}
            style={{ padding: "4px 8px" }}
            aria-label="Delete week"
            title="Delete this week"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="ww-day-tabs ww-day-tabs-sticky">
        {WEEK_DAYS.map(d => {
          const dp = week?.days?.[d.key];
          const count = dp?.enabled ? (dp.exerciseIds?.length ?? 0) : 0;
          return (
            <button
              key={d.key}
              className={`ww-day-tab${activeDay === d.key ? " active" : ""}${!dp?.enabled ? " rest" : ""}`}
              onClick={() => { setActiveDay(d.key); setPopoverFor(null); }}
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

        {day.enabled && templates.length > 0 && (
          <div className="ww-template-row">
            <span className="ww-template-lbl"><Bookmark size={11} /> From template</span>
            {templates.map(tpl => {
              const fd = tpl.focus ? getFocusDef(tpl.focus) : null;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  className="ww-focus-chip"
                  title={`${fd ? `${fd.name} · ` : ""}${tpl.exercise_ids.length} exercise${tpl.exercise_ids.length !== 1 ? "s" : ""} — replaces this day`}
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl.name}
                </button>
              );
            })}
          </div>
        )}

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
                        cursor: "pointer",
                      }}
                      onClick={() => setPopoverFor(isOpen ? null : id)}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ex.name}
                      </span>
                      {renderConfigChip(id)}
                      <Settings2 size={13} style={{ opacity: 0.55 }} aria-label="Configure" />
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
