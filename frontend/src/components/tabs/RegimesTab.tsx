import { useEffect, useState } from "react";
import { Plus, Calendar, Trash2, Wand2, Pencil, Bookmark } from "lucide-react";
import type { Regime, WeeklyPlan, WeekPlanDay, WeekPlan, WorkoutTemplate } from "../../types";
import { weeklyPlanFromWeeks } from "../../data/weeklyPlan";
import { getFocusDef } from "../../data/focuses";
import RegimeQuestionnairePanel from "../regime/RegimeQuestionnaire";
import RegimeEditor from "../regime/RegimeEditor";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  weeklyPlan: WeeklyPlan | null;
  setWeeklyPlan: (plan: WeeklyPlan) => void;
  templates: WorkoutTemplate[];
  onDeleteTemplate: (id: number) => Promise<boolean>;
}

const WEEK_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export default function RegimesTab({ authFetch, weeklyPlan: _weeklyPlan, setWeeklyPlan, templates, onDeleteTemplate }: Props) {
  void _weeklyPlan;
  const [regimes, setRegimes] = useState<Regime[]>([]);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appliedId, setAppliedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Regime | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await authFetch("/api/regimes");
      if (r.ok) setRegimes(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyToWeek = (regime: Regime) => {
    const weeks: WeekPlan[] = (regime.weeks && regime.weeks.length > 0)
      ? regime.weeks.map(w => ({ label: w.label ?? null, days: { ...w.days } }))
      : [{
          label: "Week 1",
          days: Object.fromEntries(
            (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as WeekPlanDay[])
              .map(k => [k, regime.days?.[k]])
              .filter(([, v]) => v),
          ) as WeeklyPlan,
        }];
    const plan = weeklyPlanFromWeeks(weeks);
    setWeeklyPlan(plan);
    setAppliedId(regime.id);
    setTimeout(() => setAppliedId(null), 2500);
  };

  const deleteRegime = async (id: number) => {
    if (!confirm("Delete this regime? Any assignments to trainees will also be revoked.")) return;
    await authFetch(`/api/regimes/${id}`, { method: "DELETE" });
    refresh();
  };

  if (editing) {
    return (
      <RegimeEditor
        authFetch={authFetch}
        regime={editing}
        onSaved={() => { setEditing(null); refresh(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="regimes-tab tab-anim" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} /> MY REGIMES
        </h2>
        <button className="btn-pri" onClick={() => setBuilding(b => !b)}>
          {building ? <>Close builder</> : <><Plus size={14} /> New regime</>}
        </button>
      </div>

      {building && (
        <RegimeQuestionnairePanel
          authFetch={authFetch}
          onSaved={r => { refresh(); applyToWeek(r); }}
        />
      )}

      {loading && <div style={{ color: "var(--muted)" }}>Loading…</div>}

      {!loading && regimes.length === 0 && !building && (
        <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
          <div>
            No regimes yet. Run the questionnaire to generate a personalised weekly plan
            based on your goals, focus areas, and the muscle groups you'd rather skip.
          </div>
          <button className="btn-pri" onClick={() => setBuilding(true)}>
            <Wand2 size={14} /> Run the questionnaire
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {regimes.map(r => (
          <div key={r.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <strong>{r.name}</strong>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {r.days_per_week} days/week · {r.goal || "general"} · {r.experience || "any"}
                  {r.weeks && r.weeks.length > 1 && (
                    <> · <strong>{r.weeks.length}-week program</strong></>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn-pri" onClick={() => applyToWeek(r)}>
                  {appliedId === r.id ? "Applied!" : "Apply to my week"}
                </button>
                <button className="btn-sec" onClick={() => setEditing(r)} aria-label="Edit regime">
                  <Pencil size={14} />
                </button>
                <button className="btn-sec" onClick={() => deleteRegime(r.id)} aria-label="Delete regime">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {r.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.description}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as WeekPlanDay[]).map(k => {
                const d = r.days?.[k];
                const active = d?.enabled;
                return (
                  <div
                    key={k}
                    title={d?.focus}
                    style={{
                      padding: "6px 2px",
                      textAlign: "center",
                      borderRadius: 6,
                      background: active ? "var(--ad2)" : "transparent",
                      border: active ? "1px solid var(--accent)" : "1px solid var(--ad)",
                      fontSize: 11,
                      minWidth: 0,
                    }}
                  >
                    <div>{WEEK_LABELS[k]}</div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {active ? (d?.focus || "—") : "rest"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Saved templates — single-session blueprints. Loaded into a workout
          from the Workout tab, or dropped onto a weekday in the plan editor;
          here the user can just review and prune them. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: "4px 0 0", fontSize: 16, letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <Bookmark size={16} /> MY TEMPLATES
        </h2>
        {templates.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            No templates yet. Build a workout and tap “Save as template” to reuse it any time.
          </div>
        ) : (
          templates.map(tpl => {
            const fd = tpl.focus ? getFocusDef(tpl.focus) : null;
            return (
              <div key={tpl.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{tpl.name}</strong>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {fd ? `${fd.name} · ` : ""}{tpl.exercise_ids.length} exercise{tpl.exercise_ids.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button className="btn-sec" onClick={() => onDeleteTemplate(tpl.id)} aria-label="Delete template">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
