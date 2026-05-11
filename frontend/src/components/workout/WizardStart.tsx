import { useState } from "react";
import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";
import { QUOTES } from "../../data/quotes";
import { useTxt } from "../../context/ToneContext";

interface Props {
  lastSession: WorkoutSession | null;
  onStart:     () => void;
}

export default function WizardStart({ lastSession, onStart }: Props) {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const t = useTxt();

  return (
    <div className="start-screen">
      <p className="start-pre">{t("Ready to crush it?", `"${quote}"`)}</p>
      <h1 className="start-hero">LET'S<br /><span>WORK</span></h1>
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
