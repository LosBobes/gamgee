import { useEffect, useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { RestPrefs } from "../../types";
import { playTimerAlarm, vibrateAlarm } from "../../sound";

export type RestTier = "short" | "medium" | "long" | "custom";

interface Props {
  prefs:      RestPrefs;
  /** Active rest state — null means we're idle and the component renders nothing. */
  rest:       { endAt: number; totalSec: number; tier: RestTier } | null;
  onAddSet:   () => void;
  onPickTier: (tier: Exclude<RestTier, "custom">) => void;
  onAdjust:   (deltaSec: number) => void;
  onStartCustom: (seconds: number) => void;
}

const fmt = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function SetRestButton({ prefs, rest, onAddSet, onPickTier, onAdjust, onStartCustom }: Props) {
  const [now, setNow] = useState(Date.now());
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState<string>(String(prefs.medium));
  const firedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [rest]);

  // Ring + vibrate the moment the bar fills up. firedRef keys on endAt so a
  // fresh timer (new endAt) is allowed to fire again.
  useEffect(() => {
    if (!rest) return;
    if (rest.endAt <= now && firedRef.current !== rest.endAt) {
      firedRef.current = rest.endAt;
      playTimerAlarm();
      vibrateAlarm();
    }
  }, [now, rest]);

  if (!rest) return null;

  const remainingMs = rest.endAt - now;
  const remaining   = remainingMs / 1000;
  const elapsedSec  = Math.max(0, rest.totalSec - remaining);
  const pct         = Math.min(100, (elapsedSec / rest.totalSec) * 100);
  const done        = remaining <= 0;

  const tierLabel = rest.tier === "short"  ? `LIGHT • ${prefs.short}s`
                  : rest.tier === "medium" ? `MED • ${prefs.medium}s`
                  : rest.tier === "long"   ? `LONG • ${prefs.long}s`
                  :                          `${Math.round(rest.totalSec)}s`;

  return (
    <div className="rest-block">
      <button
        className={`btn-add-set btn-add-set-resting${done ? " rest-done" : ""}`}
        onClick={onAddSet}
        aria-label={done ? "Add a set" : `Rest ${fmt(remaining)} remaining — tap to add a set now`}
      >
        <span className="rest-fill" style={{ width: `${pct}%` }} aria-hidden />
        <span className="rest-fg">
          {done ? (
            <>
              <Plus size={18} strokeWidth={3} />
              <span>ADD SET</span>
              <span className="rest-fg-sub">READY</span>
            </>
          ) : (
            <>
              <span className="rest-fg-time">{fmt(remaining)}</span>
              <span className="rest-fg-sub">{tierLabel}</span>
            </>
          )}
        </span>
      </button>

      <div className="rest-tier-row">
        <div className="rest-tier-tiers">
          <button type="button" className={`rest-tier${rest.tier === "short"  ? " active" : ""}`} onClick={() => onPickTier("short")}>
            LIGHT<span className="rest-tier-sec">{prefs.short}s</span>
          </button>
          <button type="button" className={`rest-tier${rest.tier === "medium" ? " active" : ""}`} onClick={() => onPickTier("medium")}>
            MED<span className="rest-tier-sec">{prefs.medium}s</span>
          </button>
          <button type="button" className={`rest-tier${rest.tier === "long"   ? " active" : ""}`} onClick={() => onPickTier("long")}>
            LONG<span className="rest-tier-sec">{prefs.long}s</span>
          </button>
          <button
            type="button"
            className={`rest-tier${rest.tier === "custom" ? " active" : ""}`}
            onClick={() => setCustomOpen(o => !o)}
            aria-expanded={customOpen}
          >
            CUSTOM
          </button>
        </div>
        <div className="rest-tier-adjust">
          <button type="button" onClick={() => onAdjust(-15)} aria-label="-15 seconds"><Minus size={13} />15</button>
          <button type="button" onClick={() => onAdjust(+15)} aria-label="+15 seconds"><Plus size={13} />15</button>
        </div>
      </div>

      {customOpen && (
        <div className="rest-custom">
          <input
            type="number" min={5} max={3600} step={5}
            value={customVal}
            onChange={e => setCustomVal(e.target.value)}
            aria-label="Custom rest seconds"
          />
          <span>sec</span>
          <button
            type="button"
            onClick={() => {
              const sec = Math.max(5, Math.min(3600, Math.round(Number(customVal) || 0)));
              setCustomVal(String(sec));
              onStartCustom(sec);
              setCustomOpen(false);
            }}
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
}
