import { Zap, Target, Activity, Trophy, X, Sparkles } from "lucide-react";
import { useOnboarding } from "../context/OnboardingContext";
import { useTxt } from "../context/ToneContext";

export default function OnboardingWelcome() {
  const { showWelcome, closeWelcome, startTour } = useOnboarding();
  const t = useTxt();

  if (!showWelcome) return null;

  const features = [
    {
      Icon: Target,
      title: t("Pick a focus", "Pick your battleground", "Pick your vibe"),
      body:  t(
        "Tell us what you're training (push, pull, legs…) and we'll suggest the right exercises.",
        "Tell us what you're hitting and we'll line up the right exercises.",
        "Tell us what you're serving and we'll line up the moves."
      ),
    },
    {
      Icon: Activity,
      title: t("Build the workout", "Stack your lifts", "Stack your moves"),
      body:  t(
        "Add exercises from the list. The body map shows live muscle coverage so you don't skip anything.",
        "Add lifts from the list. The body map shows what you're hitting in real time.",
        "Add moves from the list. The body map shows your coverage as you go, bestie."
      ),
    },
    {
      Icon: Zap,
      title: t("Log sets as you train", "Crush it set by set", "Slay it set by set"),
      body:  t(
        "Enter weight and reps, check off each set. A timer runs in the header so you can pace yourself.",
        "Punch in weight and reps, check the box. We time it for you.",
        "Punch in weight and reps, check the box. We're timing it for you."
      ),
    },
    {
      Icon: Trophy,
      title: t("Track PRs & progress", "Stack the PRs", "Collect the PRs"),
      body:  t(
        "Personal records, history and a coach view are filed automatically — no spreadsheets.",
        "PRs and history get logged for you. No spreadsheets, no excuses.",
        "PRs and history log themselves. No spreadsheets, no excuses, bestie."
      ),
    },
  ];

  return (
    <div className="cf-overlay onboarding-overlay" onClick={closeWelcome}>
      <div className="cf-modal onboarding-modal" onClick={e => e.stopPropagation()}>
        <button className="onb-close" onClick={closeWelcome} aria-label="Close">
          <X size={14} />
        </button>

        <div className="onb-hero">
          <div className="onb-hero-icon"><Sparkles size={20} /></div>
          <div>
            <div className="onb-hero-title">
              {t("Welcome to Gamgee", "Welcome to Gamgee, bro", "Welcome to Gamgee, bestie")}
            </div>
            <div className="onb-hero-sub">
              {t(
                "A pocket workout tracker. Here's the short version:",
                "Your pocket gym buddy. The quick rundown:",
                "Your pocket gym bestie. Quick rundown:"
              )}
            </div>
          </div>
        </div>

        <div className="onb-features">
          {features.map(({ Icon, title, body }) => (
            <div key={title} className="onb-feature">
              <div className="onb-feature-icon"><Icon size={16} /></div>
              <div className="onb-feature-text">
                <div className="onb-feature-title">{title}</div>
                <div className="onb-feature-body">{body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="cf-modal-actions">
          <button className="cf-btn-cancel" onClick={closeWelcome}>
            {t("Skip", "I got it", "I got it")}
          </button>
          <button className="cf-btn-save" onClick={startTour}>
            <Sparkles size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            {t("Take the tour", "Show me around", "Walk me through it")}
          </button>
        </div>
      </div>
    </div>
  );
}
