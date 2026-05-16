import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Pause, Play, RotateCcw, X } from "lucide-react";

interface Props {
  /** Initial seconds. Per-exercise defaults are picked by the parent. */
  initialSeconds: number;
  onClose: () => void;
  /** Persists the user's tweaked default so the next set on the same lift
   *  starts here. */
  onChangeDefault?: (seconds: number) => void;
}

const PRESETS = [60, 90, 120, 180, 240];

function fmt(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.max(0, s) % 60;
  return `${String(m).padStart(1, "0")}:${String(r).padStart(2, "0")}`;
}

/** Floating rest timer pinned to the bottom of the screen. Plays a short beep
 *  when it runs out (Web Audio, no external file). The user can stop it any
 *  time and the parent can fire a push notification when it ends. */
export default function RestTimer({ initialSeconds, onClose, onChangeDefault }: Props) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const [silent, setSilent] = useState(false);
  const baseRef = useRef<number>(Date.now());
  const initRef = useRef<number>(initialSeconds);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - baseRef.current) / 1000);
      setRemaining(initRef.current - elapsed);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining > 0) return;
    if (!silent) beep();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    setRunning(false);
  }, [remaining, silent]);

  const restart = (secs: number) => {
    initRef.current = secs;
    baseRef.current = Date.now();
    setRemaining(secs);
    setRunning(true);
    onChangeDefault?.(secs);
  };

  const toggle = () => {
    if (running) {
      setRunning(false);
      initRef.current = remaining;
    } else {
      baseRef.current = Date.now();
      setRunning(true);
    }
  };

  return (
    <div className="rest-timer">
      <div className="rest-timer-row">
        <div className="rest-timer-time">{fmt(remaining)}</div>
        <button className="rest-timer-btn" aria-label={running ? "Pause" : "Resume"} onClick={toggle}>
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="rest-timer-btn" aria-label="Restart" onClick={() => restart(initRef.current)}>
          <RotateCcw size={16} />
        </button>
        <button
          className="rest-timer-btn"
          aria-label={silent ? "Enable sound" : "Mute"}
          onClick={() => setSilent(s => !s)}
        >
          {silent ? <BellOff size={16} /> : <Bell size={16} />}
        </button>
        <button className="rest-timer-btn rest-timer-close" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="rest-timer-presets">
        {PRESETS.map(p => (
          <button
            key={p}
            className={`rest-timer-preset${initRef.current === p ? " active" : ""}`}
            onClick={() => restart(p)}
          >
            {fmt(p)}
          </button>
        ))}
      </div>
    </div>
  );
}

let _ctx: AudioContext | null = null;
function beep(): void {
  try {
    if (!_ctx) _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = _ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore — autoplay policies may prevent this until user gesture.
  }
}
