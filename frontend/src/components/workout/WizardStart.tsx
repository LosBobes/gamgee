import { useState } from "react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { BRO_QUOTES, PRO_QUOTES, HERO_CALLS } from "../../data/quotes";
import { useToneMode } from "../../context/ToneContext";

interface Props {
  lastSession: WorkoutSession | null;
  onStart:     () => void;
}

export default function WizardStart({ lastSession, onStart }: Props) {
  const mode = useToneMode();
  const [broQuote]  = useState(() => BRO_QUOTES[Math.floor(Math.random() * BRO_QUOTES.length)]);
  const [proQuote]  = useState(() => PRO_QUOTES[Math.floor(Math.random() * PRO_QUOTES.length)]);
  const [hero]      = useState(() => HERO_CALLS[Math.floor(Math.random() * HERO_CALLS.length)]);

  const isBro = mode === "bro";

  return (
    <div className="start-screen">
      <h1 className="start-hero">{hero[0]}<br /><span>{hero[1]}</span></h1>
      <div className="start-quote">
        &ldquo;{isBro ? broQuote : proQuote.text}&rdquo;
        {!isBro && <div className="start-quote-attr">{proQuote.source}</div>}
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
