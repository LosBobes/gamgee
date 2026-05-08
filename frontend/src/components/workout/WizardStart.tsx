import type { WorkoutSession } from "../../types";
import { fmtDate, fmtDur } from "../../utils";

interface Props {
  lastSession: WorkoutSession | null;
  onStart:     () => void;
}

export default function WizardStart({ lastSession, onStart }: Props) {
  return (
    <div className="start-screen">
      <p className="start-pre">Ready to crush it?</p>
      <h1 className="start-hero">LET'S<br /><span>WORK</span></h1>
      <button className="btn-start" onClick={onStart} style={{ marginBottom: 12 }}>
        BUILD WORKOUT
      </button>
      {lastSession && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          Last: {fmtDate(lastSession.date)} · {fmtDur(lastSession.duration)}
        </p>
      )}
    </div>
  );
}
