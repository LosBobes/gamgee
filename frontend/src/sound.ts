// Rest-timer alarm: audible "ring" + vibration when a rest period fills up.
//
// Mobile browsers (iOS Safari especially) start every AudioContext in a
// `suspended` state and refuse to play audio unless the context was created or
// resumed from inside a user gesture. The rest-timer alarm fires from a
// setInterval tick — *not* a gesture — so we keep a single shared context and
// unlock it on the user's taps (checking a set, hitting a rest tier) while they
// train. By the time the timer rings, the context is already running.

let ctx: AudioContext | null = null;
let unlockBound = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try { ctx = new Ctor(); } catch { return null; }
  }
  return ctx;
}

/** Create + resume the shared AudioContext. Safe to call on every user gesture;
 * resuming an already-running context is a no-op. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** Attach capture-phase gesture listeners that keep the audio context unlocked
 * for the lifetime of an active workout. Returns a teardown function. */
export function bindAudioUnlock(): () => void {
  if (typeof document === "undefined") return () => {};
  if (unlockBound) return () => {};
  unlockBound = true;
  const handler = () => unlockAudio();
  document.addEventListener("pointerdown", handler, true);
  document.addEventListener("keydown", handler, true);
  return () => {
    document.removeEventListener("pointerdown", handler, true);
    document.removeEventListener("keydown", handler, true);
    unlockBound = false;
  };
}

/** Loud, repeating two-tone alarm that "rings" when the rest timer fills up. */
export function playTimerAlarm(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t0 = c.currentTime;
  const tone = (when: number, freq: number, dur = 0.18, peak = 0.32) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + when);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur);
    osc.start(t0 + when);
    osc.stop(t0 + when + dur + 0.02);
  };
  // Three rising high/low couplets — an unmistakable alarm, ~1.4s long.
  for (let i = 0; i < 3; i++) {
    const base = i * 0.46;
    tone(base, 880);
    tone(base + 0.2, 1320);
  }
}

/** Strong, repeating buzz to pair with the audible alarm. */
export function vibrateAlarm(): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([400, 120, 400, 120, 400]);
  }
}
