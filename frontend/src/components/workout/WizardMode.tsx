import { Calendar, Zap, ArrowLeft, Bookmark, Plus, Pencil, Trash2 } from "lucide-react";
import type { DayPlan, WeeklyPlan, WorkoutTemplate } from "../../types";
import { WEEK_DAYS, getTodayKey, dayMapForCurrentWeek } from "../../data/weeklyPlan";
import { getFocusDef } from "../../data/focuses";
import { ALL_EX } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  weeklyPlan:     WeeklyPlan | null;
  templates:      WorkoutTemplate[];
  onSingle:       () => void;
  onLoadToday:    (plan: DayPlan) => void;
  onLoadTemplate: (tpl: WorkoutTemplate) => void;
  onNewTemplate:  () => void;
  onEditTemplate: (tpl: WorkoutTemplate) => void;
  onDeleteTemplate: (id: number) => Promise<boolean>;
  onSetupPlan:    () => void;
  onBack:         () => void;
}

export default function WizardMode({ weeklyPlan, templates, onSingle, onLoadToday, onLoadTemplate, onNewTemplate, onEditTemplate, onDeleteTemplate, onSetupPlan, onBack }: Props) {
  const t = useTxt();
  const todayKey  = getTodayKey();
  const todayMeta = WEEK_DAYS.find(d => d.key === todayKey)!;
  // dayMapForCurrentWeek transparently handles both legacy single-week plans
  // (where days hang directly off the WeeklyPlan) and the new multi-week
  // structure (where the current week's days live in weeks[current_week_index]).
  const todayMap  = dayMapForCurrentWeek(weeklyPlan);
  const todayPlan = todayMap[todayKey];
  const focusDef  = todayPlan?.enabled ? (getFocusDef(todayPlan.focus) ?? null) : null;
  const hasAnyPlan = Object.values(todayMap).some(d => d?.enabled);

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">{t("WORKOUT TYPE", "HOW WE ROLLING", "WHAT'S THE VIBE")}</span>
        <div style={{ width: 72 }} />
      </div>

      <div className="wizard-title">{t("How do you want to train?", "What's the plan, bro?", "What's the move, bestie?")}</div>
      <div className="wizard-sub">
        {t(
          "Build a one-off workout or follow your weekly regime.",
          "Build a one-off or run your weekly regime. Either way, we lift.",
          "Build a one-off or serve your weekly regime. Either way, we serve."
        )}
      </div>

      <OnboardingHint hintKey="mode" title={t("Two ways to train", "Two ways to roll", "Two ways to serve")}>
        {t(
          "One-off: plan today's exercises up front, save them as a reusable template, and add more ad-hoc once you're logging. Weekly regime: set the same routine on the same days once and we'll auto-load it.",
          "One-off: plan your lifts up front, save 'em as a template, and toss in more ad-hoc mid-workout. Weekly regime: lock the same routine on the same days, auto-load forever.",
          "One-off: plan your moves up front, save 'em as a template, and add more ad-hoc mid-workout. Weekly regime: lock the same routine on the same days, auto-load forever."
        )}
      </OnboardingHint>

      {/* Today's active plan */}
      {todayPlan?.enabled && focusDef && (
        <div className="wm-today-card">
          <div className="wm-today-head">
            <div className="wm-today-day">{todayMeta.label.toUpperCase()}</div>
            <div className="wm-today-focus">{focusDef.name}</div>
          </div>

          {todayPlan.exerciseIds.length > 0 ? (
            <div className="wm-today-exercises">
              {todayPlan.exerciseIds.map((id, i) => {
                const ex = ALL_EX.find(e => e.id === id);
                return ex ? (
                  <div key={id} className="wm-today-row">
                    <span className="wm-today-num">{i + 1}</span>
                    <span className="wm-today-name">{ex.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="wm-today-auto">
              {t(
                "Exercises auto-selected from your focus history.",
                "Auto-picking exercises. Trust the process.",
                "Auto-picking your moves. Manifest the rest."
              )}
            </div>
          )}

          <button
            className="btn-start"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => onLoadToday(todayPlan)}
          >
            <Zap size={14} />
            {t(
              `Start ${todayMeta.label}'s Workout`,
              `It's ${todayMeta.short} time. Let's go.`,
              `It's ${todayMeta.short} time, bestie. Let's serve.`
            )}
          </button>
        </div>
      )}

      {/* Today is a rest day */}
      {todayPlan && !todayPlan.enabled && (
        <div className="wm-rest-card">
          <div className="wm-rest-label">
            {t(`${todayMeta.label} is a rest day.`, `${todayMeta.label} is rest day per the Swoly Bible.`, `${todayMeta.label} is rest day — rest is also girlbossing.`)}
          </div>
          <div className="wm-rest-sub">
            {t("Going rogue? Build a one-off workout below.", "Going off-script? Respect. Pick your own workout below.", "Going off-script? Iconic. Pick your own workout below.")}
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div className="wm-options">
        <div className="focus-card" onClick={onSingle} style={{ gridColumn: "1 / -1" }}>
          <div className="focus-icon"><Zap size={24} /></div>
          <div className="focus-name">{t("One-Off", "Go Rogue", "Off-Script")}</div>
          <div className="focus-desc">
            {t(
              "Pick today's exercises up front — save them as a template, and add more ad-hoc mid-workout.",
              "Pick your lifts up front. Save 'em as a template, toss in more ad-hoc as you go.",
              "Pick your moves up front. Save 'em as a template, add more ad-hoc as you go."
            )}
          </div>
        </div>

        <div className="focus-card" onClick={onSetupPlan} style={{ gridColumn: "1 / -1" }}>
          <div className="focus-icon"><Calendar size={24} /></div>
          <div className="focus-name">
            {hasAnyPlan ? t("Edit Regime", "Edit The Regime", "Edit The Era") : t("Weekly Regime", "Build The Regime", "Map The Era")}
          </div>
          <div className="focus-desc">
            {hasAnyPlan
              ? t("Edit your recurring weekly regime.", "Tweak your weekly regime.", "Tweak your weekly era.")
              : t("Set up a recurring weekly regime — same routine, same days.", "Build a weekly regime. Same routine, same days. Show up. Grow.", "Map a weekly regime, bestie. Same routine, same days. Show up. Glow up.")}
          </div>
        </div>
      </div>

      {/* Saved templates — one tap loads a blueprint straight into the build step.
          The "New" button launches the build flow where the user can pick lifts
          and save them as a reusable template. */}
      <div className="wm-templates">
        <div className="wm-templates-head">
          <span className="wm-templates-title">
            <Bookmark size={13} /> {t("Your Templates", "Your Templates", "Your Templates")}
          </span>
          <button className="wm-template-new" onClick={onNewTemplate}>
            <Plus size={13} /> {t("New", "New", "New")}
          </button>
        </div>
        {templates.length > 0 ? (
          templates.map(tpl => {
            const fd = tpl.focus ? getFocusDef(tpl.focus) : null;
            const names = tpl.exercise_ids
              .map(id => ALL_EX.find(e => e.id === id)?.name)
              .filter((n): n is string => !!n);
            return (
              <div key={tpl.id} className="wm-template-card">
                <button className="wm-template-load" onClick={() => onLoadTemplate(tpl)} title={t("Load into a workout", "Load into a workout", "Load into a workout")}>
                  <div className="wm-template-main">
                    <div className="wm-template-name">{tpl.name}</div>
                    <div className="wm-template-meta">
                      {fd ? `${fd.name} · ` : ""}{tpl.exercise_ids.length} exercise{tpl.exercise_ids.length !== 1 ? "s" : ""}
                    </div>
                    {names.length > 0 && (
                      <div className="wm-template-exs">{names.slice(0, 4).join(", ")}{names.length > 4 ? "…" : ""}</div>
                    )}
                  </div>
                  <Zap size={15} className="wm-template-go" />
                </button>
                <div className="wm-template-actions">
                  <button
                    className="wm-template-act"
                    onClick={() => onEditTemplate(tpl)}
                    aria-label={`Edit ${tpl.name}`}
                    title={t("Edit", "Edit", "Edit")}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="wm-template-act danger"
                    onClick={() => {
                      if (confirm(`Delete template "${tpl.name}"?`)) onDeleteTemplate(tpl.id);
                    }}
                    aria-label={`Delete ${tpl.name}`}
                    title={t("Delete", "Delete", "Delete")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="wm-templates-empty">
            {t(
              "No templates yet. Tap New to build one and reuse it in a single tap.",
              "No templates yet. Tap New to build one — reuse it in one tap.",
              "No templates yet. Tap New to build one and serve it in one tap."
            )}
          </div>
        )}
      </div>
    </>
  );
}
