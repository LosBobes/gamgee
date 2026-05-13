import { useState } from "react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { BRO_QUOTES, GRL_QUOTES, PRO_QUOTES, HERO_CALLS, GRL_HERO_CALLS } from "../../data/quotes";
import { useToneMode, useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  lastSession: WorkoutSession | null;
  onStart:     () => void;
}

export default function WizardStart({ lastSession, onStart }: Props) {
  const mode = useToneMode();
  const t = useTxt();
  const [broQuote]  = useState(() => BRO_QUOTES[Math.floor(Math.random() * BRO_QUOTES.length)]);
  const [grlQuote]  = useState(() => GRL_QUOTES[Math.floor(Math.random() * GRL_QUOTES.length)]);
  const [proQuote]  = useState(() => PRO_QUOTES[Math.floor(Math.random() * PRO_QUOTES.length)]);
  const [broHero]   = useState(() => HERO_CALLS[Math.floor(Math.random() * HERO_CALLS.length)]);
  const [grlHero]   = useState(() => GRL_HERO_CALLS[Math.floor(Math.random() * GRL_HERO_CALLS.length)]);

  const hero      = mode === "grl" ? grlHero : broHero;
  const quoteText = mode === "grl" ? grlQuote : mode === "bro" ? broQuote : proQuote.text;
  const showAttr  = mode === "pro";

  return (
    <div className="start-screen">
      <OnboardingHint hintKey="start" step="START" title={t("Build your first workout", "Build your first session", "Build your first era")}>
        {t(
          "Tap the button below to start. We'll walk through picking a focus, optional cardio, and your exercises.",
          "Hit the button below. We'll guide you through focus, cardio, and your lifts.",
          "Tap the button below, bestie. We'll guide you through focus, cardio, and your moves."
        )}
      </OnboardingHint>
      <h1 className="start-hero">{hero[0]}<br /><span>{hero[1]}</span></h1>
      <div className="start-quote">
        &ldquo;{quoteText}&rdquo;
        {showAttr && <div className="start-quote-attr">{proQuote.source}</div>}
      </div>
      <button className="btn-start" onClick={onStart} style={{ marginBottom: 12 }}>
        BUILD WORKOUT
      </button>
      {lastSession && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          Last session: {fmtDate(lastSession.date)} · {fmtDur(lastSession.duration)}
        </p>
      )}
    </div>
  );
}
