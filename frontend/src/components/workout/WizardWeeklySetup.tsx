import { useState } from "react";
import { ArrowLeft, Check, Moon, Wrench } from "lucide-react";
import type { WeekPlanDay, WeeklyPlan, DayPlan } from "../../types";
import { WEEK_DAYS } from "../../data/weeklyPlan";
import { FOCUS, getFocusDef } from "../../data/focuses";
import { ALL_EX, isCustomExerciseId } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";

interface Props {
  initial: WeeklyPlan | null;
  onSave:  (plan: WeeklyPlan) => void;
  onBack:  () => void;
}

const DEFAULT_FOCUS = Object.keys(FOCUS)[0];

function makeDayPlan(enabled: boolean): DayPlan {
  return { focus: DEFAULT_FOCUS, exerciseIds: [], enabled };
}

export default function WizardWeeklySetup({ initial, onSave, onBack }: Props) {
  const t = useTxt();

  const [plan, setPlan] = useState<WeeklyPlan>(() => {
    if (initial) return { ...initial };
    const p: WeeklyPlan = {};
    WEEK_DAYS.forEach(d => {
      p[d.key] = makeDayPlan(!["sat", "sun"].includes(d.key));
    });
    return p;
  });

  const [activeDay, setActiveDay] = useState<WeekPlanDay>("mon");

  const day        = plan[activeDay] ?? makeDayPlan(true);
  const focusDef   = getFocusDef(day.focus);
  const focusIds   = focusDef?.exIds ?? [];
  const customExs  = ALL_EX.filter(e => isCustomExerciseId(e.id));

  const setDay = (updates: Partial<DayPlan>) =>
    setPlan(p => ({ ...p, [activeDay]: { ...(p[activeDay] ?? makeDayPlan(true)), ...updates } }));

  const toggleExercise = (id: string) => {
    const cur  = day.exerciseIds ?? [];
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    setDay({ exerciseIds: next });
  };

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">{t("WEEKLY PLAN", "THE PROGRAM", "WEEKLY ERA")}</span>
        <button className="wz-next" onClick={() => onSave(plan)}>
          SAVE <Check size={13} />
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

      {/* Day tabs */}
      <div className="ww-day-tabs">
        {WEEK_DAYS.map(d => {
          const dp = plan[d.key];
          return (
            <button
              key={d.key}
              className={`ww-day-tab${activeDay === d.key ? " active" : ""}${!dp?.enabled ? " rest" : ""}`}
              onClick={() => setActiveDay(d.key)}
            >
              {d.short}
            </button>
          );
        })}
      </div>

      {/* Day editor */}
      <div className="ww-day-editor">
        <div className="ww-day-header">
          <div className="ww-day-name">{WEEK_DAYS.find(d => d.key === activeDay)?.label}</div>
          <button
            className={`ww-rest-toggle${!day.enabled ? " active" : ""}`}
            onClick={() => setDay({ enabled: !day.enabled })}
          >
            <Moon size={11} /> {day.enabled ? t("Mark Rest", "Rest Day") : t("Activate", "Activate")}
          </button>
        </div>

        {day.enabled && (
          <>
            {/* Focus picker */}
            <div className="ww-section-label">{t("Focus", "Focus")}</div>
            <div className="ww-focus-row">
              {Object.entries(FOCUS).map(([k, f]) => (
                <button
                  key={k}
                  className={`ww-focus-chip${day.focus === k ? " selected" : ""}`}
                  onClick={() => setDay({ focus: k, exerciseIds: [] })}
                >
                  <f.icon size={12} /> {f.name}
                </button>
              ))}
            </div>

            {/* Exercise checklist */}
            {focusIds.length > 0 ? (
              <>
                <div className="ww-section-label" style={{ marginTop: 16 }}>
                  {t("Exercises", "Exercises")}
                  <span className="ww-section-hint">
                    {t("blank = auto-pick", "blank = app picks")}
                  </span>
                </div>
                <div className="ww-exercise-list">
                  {focusIds.map(id => {
                    const ex      = ALL_EX.find(e => e.id === id);
                    if (!ex) return null;
                    const checked = day.exerciseIds.includes(id);
                    return (
                      <button
                        key={id}
                        className={`ww-ex-row${checked ? " checked" : ""}`}
                        onClick={() => toggleExercise(id)}
                      >
                        <span className="ww-ex-check">
                          {checked && <Check size={10} />}
                        </span>
                        <span className="ww-ex-name">{ex.name}</span>
                      </button>
                    );
                  })}
                </div>
                {customExs.length > 0 && (
                  <>
                    <div className="ww-section-label" style={{ marginTop: 16 }}>
                      <Wrench size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      {t("Your Custom Exercises", "Your Custom Lifts", "Your Custom Moves")}
                    </div>
                    <div className="ww-exercise-list">
                      {customExs.map(ex => {
                        const checked = day.exerciseIds.includes(ex.id);
                        return (
                          <button
                            key={ex.id}
                            className={`ww-ex-row${checked ? " checked" : ""}`}
                            onClick={() => toggleExercise(ex.id)}
                          >
                            <span className="ww-ex-check">
                              {checked && <Check size={10} />}
                            </span>
                            <span className="ww-ex-name">{ex.name}</span>
                          </button>
                        );
                      })}
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
    </>
  );
}
