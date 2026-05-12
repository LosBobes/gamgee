import { useState } from "react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { useToneMode } from "../../context/ToneContext";
import {
  useBroQuotes, useGrlQuotes, useProQuotes,
  useHeroCallsBro, useHeroCallsGrl,
} from "../../hooks/useContentLibrary";

interface Props {
  lastSession: WorkoutSession | null;
  onStart:     () => void;
}

export default function WizardStart({ lastSession, onStart }: Props) {
  const mode = useToneMode();
  const broQuotes = useBroQuotes();
  const grlQuotes = useGrlQuotes();
  const proQuotes = useProQuotes();
  const heroBro   = useHeroCallsBro();
  const heroGrl   = useHeroCallsGrl();
  // Pick once on mount so refetches don't reshuffle the displayed quote.
  const [broQuote] = useState(() => broQuotes[Math.floor(Math.random() * broQuotes.length)]);
  const [grlQuote] = useState(() => grlQuotes[Math.floor(Math.random() * grlQuotes.length)]);
  const [proQuote] = useState(() => proQuotes[Math.floor(Math.random() * proQuotes.length)]);
  const [broHero]  = useState(() => heroBro[Math.floor(Math.random() * heroBro.length)]);
  const [grlHero]  = useState(() => heroGrl[Math.floor(Math.random() * heroGrl.length)]);

  const hero      = mode === "grl" ? grlHero : broHero;
  const quoteText = mode === "grl" ? grlQuote : mode === "bro" ? broQuote : proQuote.text;
  const showAttr  = mode === "pro";

  return (
    <div className="start-screen">
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
