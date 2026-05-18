import { useEffect, useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { RestPrefs } from "../../types";

export type RestTier = "short" | "medium" | "long" | "custom";

interface Props {
  prefs:      RestPrefs;
  /** Active rest state — null means we're idle and the button shows "+ ADD SET". */
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

function beep() {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const tone = (when: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + 0.28);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + 0.32);
    };
    tone(0,    880);
    tone(0.35, 1175);
  } catch { /* silent */ }
}

export default function SetRestButton({ prefs, rest, onAddSet, onPickTier, onAdjust, onStartCustom }: Props) {
  const [now, setNow] = useState(Date.now());
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState<number>(prefs.medium);
  const firedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [rest]);

  // Beep + vibrate the moment the bar fills up. firedRef keys on endAt so a
  // fresh timer (new endAt) is allowed to fire again.
  useEffect(() => {
    if (!rest) return;
    if (rest.endAt <= now && firedRef.current !== rest.endAt) {
      firedRef.current = rest.endAt;
      beep();
      if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
    }
  }, [now, rest]);

  if (!rest) {
    return (
      <button className="btn-add-set" onClick={onAddSet}>+ add set</button>
    );
  }

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
            onChange={e => setCustomVal(Math.max(5, Math.min(3600, Number(e.target.value) || 0)))}
            aria-label="Custom rest seconds"
          />
          <span>sec</span>
          <button
            type="button"
            onClick={() => { onStartCustom(customVal); setCustomOpen(false); }}
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
}
