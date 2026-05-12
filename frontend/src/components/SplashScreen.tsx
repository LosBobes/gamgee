import { useEffect, useState } from "react";
import { useTxt } from "../context/ToneContext";

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const t = useTxt();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduceMotion ? 350 : 2000;
    const fadeMs = reduceMotion ? 150 : 400;
    const leaveTimer = setTimeout(() => setLeaving(true), holdMs);
    const doneTimer  = setTimeout(onDone, holdMs + fadeMs);
    return () => { clearTimeout(leaveTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`splash${leaving ? " splash-leaving" : ""}`} role="presentation" aria-hidden={leaving}>
      <div className="splash-inner">
        <div className="splash-logo-wrap">
          <svg className="splash-progress" viewBox="0 0 128 128" fill="none" aria-hidden="true">
            {/* faint track */}
            <circle cx="64" cy="64" r="54" stroke="var(--primary)" strokeWidth="3.5" strokeOpacity="0.12" />
            {/* animated fill — starts from top (rotated -90°) */}
            <circle
              cx="64" cy="64" r="54"
              stroke="var(--primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="splash-progress-ring"
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="splash-logo" role="img" aria-hidden="true" />
        </div>
        <div className="splash-text">
          <div className="splash-name">GAMGEE</div>
          <div className="splash-sub">{t("Workout Tracker", "Built Different (Allegedly)")}</div>
        </div>
      </div>
    </div>
  );
}
