import { Calendar, Zap, ArrowLeft } from "lucide-react";
import type { DayPlan, WeeklyPlan } from "../../types";
import { WEEK_DAYS, getTodayKey } from "../../data/weeklyPlan";
import { getFocusDef } from "../../data/focuses";
import { ALL_EX } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";

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
  const todayPlan = weeklyPlan?.[todayKey];
  const focusDef  = todayPlan?.enabled ? (getFocusDef(todayPlan.focus) ?? null) : null;
  const hasAnyPlan = !!weeklyPlan && Object.values(weeklyPlan).some(d => d?.enabled);

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label">{t("WORKOUT TYPE", "HOW WE ROLLING")}</span>
        <div style={{ width: 72 }} />
      </div>

      <div className="wizard-title">{t("How do you want to train?", "What's the plan, bro?")}</div>
      <div className="wizard-sub">
        {t(
          "Follow your weekly routine or build a one-off workout.",
          "Stick to the program or go rogue. Either way, we lift."
        )}
      </div>

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
                "Auto-picking exercises. Trust the process."
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
              `It's ${todayMeta.short} time. Let's go.`
            )}
          </button>
        </div>
      )}

      {/* Today is a rest day */}
      {todayPlan && !todayPlan.enabled && (
        <div className="wm-rest-card">
          <div className="wm-rest-label">
            {t(`${todayMeta.label} is a rest day.`, `${todayMeta.label} is rest day per the Swoly Bible.`)}
          </div>
          <div className="wm-rest-sub">
            {t("Going rogue? Build a one-off workout below.", "Going off-script? Respect. Pick your own workout below.")}
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div className="wm-options">
        <div className="focus-card" onClick={onSingle}>
          <div className="focus-icon"><Zap size={24} /></div>
          <div className="focus-name">{t("One-Off", "Go Rogue")}</div>
          <div className="focus-desc">
            {t("Build a custom workout for today.", "Ignore the plan. Pick your own exercises.")}
          </div>
        </div>

        <div className="focus-card" onClick={onSetupPlan}>
          <div className="focus-icon"><Calendar size={24} /></div>
          <div className="focus-name">
            {hasAnyPlan ? t("Edit Plan", "Edit The Program") : t("Weekly Plan", "Build The Program")}
          </div>
          <div className="focus-desc">
            {hasAnyPlan
              ? t("Edit your weekly routine.", "Tweak your weekly program.")
              : t("Set up a repeating weekly routine.", "Build your weekly program. Show up. Grow.")}
          </div>
        </div>
      </div>
    </>
  );
}
