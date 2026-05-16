import { useState } from "react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { useToneMode, useTxt } from "../../context/ToneContext";
import {
  useBroQuotes, useGrlQuotes, useProQuotes,
  useHeroCallsBro, useHeroCallsGrl,
} from "../../hooks/useContentLibrary";
import OnboardingHint from "../OnboardingHint";

interface Props {
  lastSession:  WorkoutSession | null;
  onStart:      () => void;
  onRepeatLast?: () => void;
  onUseTemplate?: () => void;
}

export default function WizardStart({ lastSession, onStart, onRepeatLast, onUseTemplate }: Props) {
  const mode = useToneMode();
  const t = useTxt();
  const broQuotes = useBroQuotes();
  const grlQuotes = useGrlQuotes();
  const proQuotes = useProQuotes();
  const heroBro   = useHeroCallsBro();
  const heroGrl   = useHeroCallsGrl();
  // Pick once on mount so a later refetch doesn't reshuffle what's on screen.
  const [broQuote] = useState(() => broQuotes[Math.floor(Math.random() * broQuotes.length)]);
  const [grlQuote] = useState(() => grlQuotes[Math.floor(Math.random() * grlQuotes.length)]);
  const [proQuote] = useState(() => proQuotes[Math.floor(Math.random() * proQuotes.length)]);
  const [broHero]  = useState(() => heroBro[Math.floor(Math.random() * heroBro.length)]);
  const [grlHero]  = useState(() => heroGrl[Math.floor(Math.random() * heroGrl.length)]);

  const hero      = mode === "grl" ? grlHero : broHero;
  const activeQuote =
    mode === "grl" ? grlQuote :
    mode === "bro" ? broQuote :
    proQuote;
  const quoteText = activeQuote.text;
  const attr      = activeQuote.source;

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
        {attr && <div className="start-quote-attr">{attr}</div>}
      </div>
      <button className="btn-start" onClick={onStart} style={{ marginBottom: 12 }}>
        BUILD WORKOUT
      </button>
      {onUseTemplate && (
        <button
          type="button"
          onClick={onUseTemplate}
          style={{
            background: "transparent", color: "var(--primary)", border: "1px solid var(--primary)",
            padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 12,
            fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Use a template
        </button>
      )}
      {lastSession && onRepeatLast && (
        <button
          type="button"
          onClick={onRepeatLast}
          style={{
            background: "transparent", color: "var(--primary)", border: "1px solid var(--primary)",
            padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 12,
            fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          }}
        >
          Repeat last session
        </button>
      )}
      {lastSession && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          Last session: {fmtDate(lastSession.date)} · {fmtDur(lastSession.duration)}
        </p>
      )}
    </div>
  );
}
