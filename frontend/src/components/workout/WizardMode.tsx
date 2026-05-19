import { Calendar, Zap, ArrowLeft } from "lucide-react";
import type { DayPlan, WeeklyPlan } from "../../types";
import { WEEK_DAYS, getTodayKey, dayMapForCurrentWeek } from "../../data/weeklyPlan";
import { getFocusDef } from "../../data/focuses";
import { ALL_EX } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  weeklyPlan:  WeeklyPlan | null;
  onSingle:    () => void;
  onLoadToday: (plan: DayPlan) => void;
  onSetupPlan: () => void;
  onBack:      () => void;
}

export default function WizardMode({ weeklyPlan, onSingle, onLoadToday, onSetupPlan, onBack }: Props) {
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
          "Follow your weekly routine or build a one-off workout.",
          "Stick to the program or go rogue. Either way, we lift.",
          "Stick to the program or go off-script. Either way, we serve."
        )}
      </div>

      <OnboardingHint hintKey="mode" title={t("One-off or weekly plan?", "Pick the vibe", "Pick the vibe")}>
        {t(
          "One-off builds a single workout for today. A weekly plan repeats the same routine on the same days — set it up once and we'll auto-load it.",
          "One-off is a workout for today only. Weekly plan locks in the same routine on the same days — set once, auto-load forever.",
          "One-off = workout for today only. Weekly plan = same routine on the same days, on repeat. Set once, auto-load forever."
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
            {t("Build a custom workout for today.", "Ignore the plan. Pick your own exercises.", "Ignore the plan. Manifest your own.")}
          </div>
        </div>

        <div className="focus-card" onClick={onSetupPlan}>
          <div className="focus-icon"><Calendar size={24} /></div>
          <div className="focus-name">
            {hasAnyPlan ? t("Edit Plan", "Edit The Program", "Edit The Era") : t("Weekly Plan", "Build The Program", "Map The Era")}
          </div>
          <div className="focus-desc">
            {hasAnyPlan
              ? t("Edit your weekly routine.", "Tweak your weekly program.", "Tweak your weekly era.")
              : t("Set up a repeating weekly routine.", "Build your weekly program. Show up. Grow.", "Map your week, bestie. Show up. Glow up.")}
          </div>
        </div>
      </div>
    </>
  );
}
