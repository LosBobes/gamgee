import { useState } from "react";
import { Sparkles, RefreshCw, Save, Calendar } from "lucide-react";
import type { RegimeQuestionnaire, RegimeDraft, Regime } from "../../types";

const GOALS: Array<{ id: RegimeQuestionnaire["goal"]; label: string; desc: string }> = [
  { id: "strength",    label: "Strength",     desc: "Heavier weights, lower reps." },
  { id: "hypertrophy", label: "Muscle Size",  desc: "Moderate reps, high volume." },
  { id: "endurance",   label: "Endurance",    desc: "Lighter weights, more reps." },
  { id: "weight_loss", label: "Fat Loss",     desc: "High volume + optional cardio." },
  { id: "general",     label: "General Fit",  desc: "Balanced, easy to stick with." },
];

const LEVELS: Array<{ id: RegimeQuestionnaire["experience"]; label: string }> = [
  { id: "beginner",     label: "Beginner (< 6 months)" },
  { id: "intermediate", label: "Intermediate (6 mo – 2 yr)" },
  { id: "advanced",     label: "Advanced (2+ years)" },
];

const FOCUS_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core", "Quads", "Hamstrings", "Glutes", "Calves"];
const EQUIPMENT = ["barbell", "dumbbell", "machine", "bodyweight"];

const WEEK_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onSaved?: (regime: Regime) => void;
}

export default function RegimeQuestionnairePanel({ authFetch, onSaved }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<RegimeQuestionnaire["goal"]>("general");
  const [experience, setExperience] = useState<RegimeQuestionnaire["experience"]>("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [avoidMuscles, setAvoidMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>(["barbell", "dumbbell", "machine"]);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [draft, setDraft] = useState<RegimeDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const toggle = (list: string[], setList: (l: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const generate = async () => {
    setBusy(true); setErr(null); setSavedId(null);
    try {
      const r = await authFetch("/api/regimes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          goal, experience, days_per_week: daysPerWeek,
          focus_areas: focusAreas, avoid_muscles: avoidMuscles,
          equipment, include_cardio: includeCardio,
        } satisfies RegimeQuestionnaire),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setErr(e.detail || "Couldn't generate a plan");
        return;
      }
      const d: RegimeDraft = await r.json();
      setDraft(d);
      if (!name) setName(d.name);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true); setErr(null);
    try {
      const r = await authFetch("/api/regimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, name: name || draft.name }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setErr(e.detail || "Couldn't save the plan");
        return;
      }
      const saved: Regime = await r.json();
      setSavedId(saved.id);
      onSaved?.(saved);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="regime-questionnaire" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} /> Build your weekly plan
        </h3>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          Answer a few quick questions and we'll generate a 7-day workout regime.
        </p>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Plan name (optional)</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push/Pull/Legs Hypertrophy" style={{ width: "100%" }} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Goal</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`chip ${goal === g.id ? "active" : ""}`}
                style={{
                  padding: 10, border: `1px solid ${goal === g.id ? "var(--accent)" : "var(--ad)"}`,
                  borderRadius: 8, background: goal === g.id ? "var(--ad2)" : "transparent",
                  color: "inherit", cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 600 }}>{g.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{g.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Experience</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LEVELS.map(l => (
              <button
                key={l.id}
                onClick={() => setExperience(l.id)}
                className={`chip ${experience === l.id ? "active" : ""}`}
                style={{
                  padding: "6px 10px", border: `1px solid ${experience === l.id ? "var(--accent)" : "var(--ad)"}`,
                  borderRadius: 999, background: experience === l.id ? "var(--ad2)" : "transparent",
                  color: "inherit", cursor: "pointer",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Days per week: <strong>{daysPerWeek}</strong>
          </label>
          <input
            type="range" min={1} max={7} value={daysPerWeek}
            onChange={e => setDaysPerWeek(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Focus areas — these get extra volume
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {FOCUS_GROUPS.map(g => (
              <button
                key={g}
                onClick={() => toggle(focusAreas, setFocusAreas, g)}
                className={`chip ${focusAreas.includes(g) ? "active" : ""}`}
                style={{
                  padding: "4px 10px",
                  border: `1px solid ${focusAreas.includes(g) ? "var(--accent)" : "var(--ad)"}`,
                  borderRadius: 999, background: focusAreas.includes(g) ? "var(--ad2)" : "transparent",
                  color: "inherit", cursor: "pointer", fontSize: 12,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Avoid — skip these muscle groups entirely
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {FOCUS_GROUPS.map(g => (
              <button
                key={g}
                onClick={() => toggle(avoidMuscles, setAvoidMuscles, g)}
                className={`chip ${avoidMuscles.includes(g) ? "active" : ""}`}
                style={{
                  padding: "4px 10px",
                  border: `1px solid ${avoidMuscles.includes(g) ? "var(--red)" : "var(--ad)"}`,
                  borderRadius: 999, background: avoidMuscles.includes(g) ? "rgba(224,64,64,0.12)" : "transparent",
                  color: "inherit", cursor: "pointer", fontSize: 12,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Available equipment</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EQUIPMENT.map(e => (
              <button
                key={e}
                onClick={() => toggle(equipment, setEquipment, e)}
                className={`chip ${equipment.includes(e) ? "active" : ""}`}
                style={{
                  padding: "4px 10px",
                  border: `1px solid ${equipment.includes(e) ? "var(--accent)" : "var(--ad)"}`,
                  borderRadius: 999, background: equipment.includes(e) ? "var(--ad2)" : "transparent",
                  color: "inherit", cursor: "pointer", fontSize: 12, textTransform: "capitalize",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={includeCardio} onChange={e => setIncludeCardio(e.target.checked)} />
          Include a cardio block
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-pri" onClick={generate} disabled={busy}>
            {draft ? <RefreshCw size={14} /> : <Sparkles size={14} />}
            {draft ? "Regenerate" : "Generate plan"}
          </button>
          {draft && (
            <button className="btn-sec" onClick={save} disabled={busy || savedId != null}>
              <Save size={14} /> {savedId != null ? "Saved" : "Save plan"}
            </button>
          )}
        </div>
        {err && <div style={{ color: "var(--red)", fontSize: 12 }}>{err}</div>}
      </div>

      {draft && (
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={16} /> {name || draft.name}
          </h3>
          {draft.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{draft.description}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {Object.entries(draft.days).map(([key, day]) => (
              <div
                key={key}
                className="card"
                style={{
                  padding: 10, opacity: day.enabled ? 1 : 0.55,
                  border: day.enabled ? "1px solid var(--accent)" : "1px solid var(--ad)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong>{WEEK_LABELS[key] || key.toUpperCase()}</strong>
                  <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>{day.focus}</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>
                  {day.enabled ? (
                    day.exerciseIds.length > 0
                      ? <span>{day.exerciseIds.length} exercises</span>
                      : <em>Rest</em>
                  ) : <em>Rest day</em>}
                </div>
                {day.enabled && day.exerciseIds.length > 0 && (
                  <ul style={{ margin: "6px 0 0 14px", padding: 0, fontSize: 12 }}>
                    {day.exerciseIds.slice(0, 8).map(id => <li key={id}>{id.replace(/_/g, " ")}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
