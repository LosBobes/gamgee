import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GymPrefs, TrainingSuggestion, WeeklyPlan, WorkoutSession } from "../types";
import { buildSuggestion } from "../trainingSuggestion";
import { getFocusDef } from "../data/focuses";

/** Re-evaluate the time-of-week signal on this cadence so a suggestion appears
 * as the user's usual training hour rolls around without a manual refresh. */
const NOW_TICK_MS = 5 * 60 * 1000;

interface Options {
  history: WorkoutSession[];
  weeklyPlan: WeeklyPlan | null;
  gym: GymPrefs | null;
  /** Only poll geolocation / surface a suggestion while this is true (e.g. the
   * user is on the idle workout screen, not mid-session). */
  active: boolean;
}

interface Result {
  suggestion: TrainingSuggestion | null;
  /** Dismiss the current suggestion for the rest of this app session. */
  dismiss: () => void;
}

/** A short, stable signature for a suggestion so a dismissal sticks until the
 * recommendation meaningfully changes (different day / focus / reason). */
function signature(s: TrainingSuggestion, now: Date): string {
  return `${now.toISOString().slice(0, 10)}:${s.reason}:${s.focus}`;
}

const focusLabel = (f: string) => getFocusDef(f)?.name ?? f;

/** Detect gym-location proximity and habitual training times, and recommend a
 * specific training to start. Reads the device location once per gym config
 * (only when a gym is saved and reminders are on) so we don't prompt for
 * geolocation unprompted. */
export function useTrainingSuggestion({ history, weeklyPlan, gym, active }: Options): Result {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  // Guards a repeat geolocation prompt for the same gym config.
  const lastGeoKeyRef = useRef<string | null>(null);

  const hasGym = !!(gym && gym.latitude != null && gym.longitude != null);
  const remindersOn = !gym || gym.remindersEnabled !== false;
  const wantGeo = active && hasGym && remindersOn;

  // Tick `now` so the time-based signal can fire as the hour comes around.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(new Date()), NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, [active]);

  // One-shot geolocation read per gym config. Re-runs only if the saved gym
  // coordinates change, so we never re-prompt on every render.
  useEffect(() => {
    if (!wantGeo || typeof navigator === "undefined" || !navigator.geolocation) return;
    const geoKey = `${gym!.latitude},${gym!.longitude}`;
    if (lastGeoKeyRef.current === geoKey && coords) return;
    lastGeoKeyRef.current = geoKey;
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { /* permission denied / unavailable — time signal still works */ },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10000 },
    );
  }, [wantGeo, gym, coords]);

  const suggestion = useMemo(() => {
    if (!active) return null;
    const s = buildSuggestion({ history, weeklyPlan, gym, coords, now, focusLabel });
    if (!s) return null;
    if (dismissed.has(signature(s, now))) return null;
    return s;
  }, [active, history, weeklyPlan, gym, coords, now, dismissed]);

  const dismiss = useCallback(() => {
    if (!suggestion) return;
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(signature(suggestion, new Date()));
      return next;
    });
  }, [suggestion]);

  return { suggestion, dismiss };
}
