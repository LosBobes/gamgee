import { Calendar, Zap, ArrowLeft, Bookmark, Flame } from "lucide-react";
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
  /** Skip planning entirely — drop straight into the logging screen and add
   * exercises on the fly. */
  onFreestyle:    () => void;
  onLoadToday:    (plan: DayPlan) => void;
  onLoadTemplate: (tpl: WorkoutTemplate) => void;
  onSetupPlan:    () => void;
  onBack:         () => void;
}

export default function WizardMode({ weeklyPlan, templates, onSingle, onFreestyle, onLoadToday, onLoadTemplate, onSetupPlan, onBack }: Props) {
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
          "Build a one-off workout, freestyle as you go, or follow your weekly regime.",
          "Build a one-off, freestyle on the fly, or run your weekly regime. Either way, we lift.",
          "Build a one-off, freestyle on the fly, or serve your weekly regime. Either way, we serve."
        )}
      </div>

      <OnboardingHint hintKey="mode" title={t("Three ways to train", "Three ways to roll", "Three ways to serve")}>
        {t(
          "One-off: plan today's exercises up front and save them as a reusable template. Freestyle: start logging now and add exercises ad-hoc as you train. Weekly regime: set the same routine on the same days once and we'll auto-load it.",
          "One-off: plan your lifts up front, save 'em as a template to run back. Freestyle: start logging and add lifts ad-hoc as you go. Weekly regime: lock the same routine on the same days, auto-load forever.",
          "One-off: plan your moves up front, save 'em as a template to rerun. Freestyle: start logging and add moves ad-hoc as you go. Weekly regime: lock the same routine on the same days, auto-load forever."
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
        <div className="focus-card" onClick={onSingle}>
          <div className="focus-icon"><Zap size={24} /></div>
          <div className="focus-name">{t("One-Off", "Go Rogue", "Off-Script")}</div>
          <div className="focus-desc">
            {t(
              "Pick today's exercises up front — and save them as a reusable template.",
              "Pick your lifts up front. Save 'em as a template to run it back.",
              "Pick your moves up front. Save 'em as a template to rerun the era."
            )}
          </div>
        </div>

        <div className="focus-card" onClick={onFreestyle}>
          <div className="focus-icon"><Flame size={24} /></div>
          <div className="focus-name">{t("Freestyle", "As You Go", "As You Go")}</div>
          <div className="focus-desc">
            {t(
              "No plan up front — start logging and add exercises ad-hoc as you train.",
              "No plan, no problem. Start logging and add lifts ad-hoc as you go.",
              "No plan, all vibes. Start logging and add moves ad-hoc as you go."
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

      {/* Saved templates — one tap loads a blueprint straight into the build step. */}
      {templates.length > 0 && (
        <div className="wm-templates">
          <div className="wm-templates-head">
            <Bookmark size={13} /> {t("Your Templates", "Your Templates", "Your Templates")}
          </div>
          {templates.map(tpl => {
            const fd = tpl.focus ? getFocusDef(tpl.focus) : null;
            const names = tpl.exercise_ids
              .map(id => ALL_EX.find(e => e.id === id)?.name)
              .filter((n): n is string => !!n);
            return (
              <button key={tpl.id} className="wm-template-card" onClick={() => onLoadTemplate(tpl)}>
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
            );
          })}
        </div>
      )}
    </>
  );
}
