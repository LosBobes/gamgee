import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs   = reduceMotion ? 350 : 1500;
    const fadeMs   = reduceMotion ? 150 : 400;
    const leaveTimer = setTimeout(() => setLeaving(true), holdMs);
    const doneTimer  = setTimeout(onDone, holdMs + fadeMs);
    return () => { clearTimeout(leaveTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`splash${leaving ? " splash-leaving" : ""}`} role="presentation" aria-hidden={leaving}>
      <div className="splash-inner">
        <div className="splash-logo-wrap">
          <span className="splash-ring" />
          <span className="splash-ring splash-ring-2" />
          <img src="/logo.png" alt="" className="splash-logo" />
        </div>
        <div className="splash-text">
          <div className="splash-name">GAMGEE</div>
          <div className="splash-sub">Workout Tracker</div>
        </div>
        <div className="splash-bar"><span /></div>
      </div>
    </div>
  );
}
