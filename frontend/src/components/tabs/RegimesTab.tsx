import { useEffect, useState } from "react";
import { Plus, Calendar, Trash2, Wand2 } from "lucide-react";
import type { Regime, WeeklyPlan, WeekPlanDay } from "../../types";
import RegimeQuestionnairePanel from "../regime/RegimeQuestionnaire";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  weeklyPlan: WeeklyPlan | null;
  setWeeklyPlan: (plan: WeeklyPlan) => void;
}

const WEEK_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export default function RegimesTab({ authFetch, weeklyPlan: _weeklyPlan, setWeeklyPlan }: Props) {
  void _weeklyPlan;
  const [regimes, setRegimes] = useState<Regime[]>([]);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appliedId, setAppliedId] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await authFetch("/api/regimes");
      if (r.ok) setRegimes(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyToWeek = (regime: Regime) => {
    const plan: WeeklyPlan = {};
    (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as WeekPlanDay[]).forEach(k => {
      const d = regime.days?.[k];
      if (d) plan[k] = { focus: d.focus, exerciseIds: d.exerciseIds, enabled: d.enabled };
    });
    setWeeklyPlan(plan);
    setAppliedId(regime.id);
    setTimeout(() => setAppliedId(null), 2500);
  };

  const deleteRegime = async (id: number) => {
    if (!confirm("Delete this regime? Any assignments to trainees will also be revoked.")) return;
    await authFetch(`/api/regimes/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <strong>{r.name}</strong>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {r.days_per_week} days/week · {r.goal || "general"} · {r.experience || "any"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-pri" onClick={() => applyToWeek(r)}>
                  {appliedId === r.id ? "Applied!" : "Apply to my week"}
                </button>
                <button className="btn-sec" onClick={() => deleteRegime(r.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {r.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.description}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
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
                    }}
                  >
                    <div>{WEEK_LABELS[k]}</div>
                    <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase" }}>
                      {active ? (d?.focus || "—") : "rest"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
