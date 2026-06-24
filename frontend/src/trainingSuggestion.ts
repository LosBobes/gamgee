import type {
  WorkoutSession, WeeklyPlan, DayPlan, GymPrefs, TrainingSuggestion, WeekPlanDay,
} from "./types";
import { DEFAULT_GYM_RADIUS_M } from "./types";
import { dayMapForCurrentWeek } from "./data/weeklyPlan";

/** How close (in hours) the current time has to be to a historic training hour
 * for the time-of-week signal to fire. */
export const TIME_WINDOW_HOURS = 2;
/** Minimum number of past sessions on a given weekday before we treat it as a
 * "usual training day". Two keeps it responsive without firing on a one-off. */
export const MIN_WEEKDAY_SESSIONS = 2;

const WEEKDAY_KEYS: WeekPlanDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABELS: Record<WeekPlanDay, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** Great-circle distance between two lat/lng points, in metres. */
export function haversineMeters(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371000; // Earth radius, metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function weekdayKey(d: Date): WeekPlanDay {
  return WEEKDAY_KEYS[d.getDay()];
}

function parseSessionDate(date: string): Date | null {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A session string carries a time-of-day only when it's a full ISO timestamp
 * (e.g. "2026-06-24T18:30:00Z"). Legacy "YYYY-MM-DD" rows are date-only and
 * parse to midnight, so we must not read an hour from them. */
function hasTimeComponent(date: string): boolean {
  return date.includes("T");
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Most frequently trained focus across the given sessions, or null. */
function mostCommonFocus(sessions: WorkoutSession[]): string | null {
  const freq: Record<string, number> = {};
  sessions.forEach(s => {
    const f = (s.focus || "").trim();
    if (f) freq[f] = (freq[f] ?? 0) + 1;
  });
  let best: string | null = null;
  let bestN = 0;
  Object.entries(freq).forEach(([f, n]) => { if (n > bestN) { best = f; bestN = n; } });
  return best;
}

interface WeekdayPattern {
  /** Sessions recorded on this weekday. */
  sessions: WorkoutSession[];
  /** Start hours (0–23) from sessions that carry a time component. */
  hours: number[];
}

function analyzeWeekday(history: WorkoutSession[], weekday: WeekPlanDay, now: Date): WeekdayPattern {
  const sessions: WorkoutSession[] = [];
  const hours: number[] = [];
  history.forEach(s => {
    const d = parseSessionDate(s.date);
    if (!d) return;
    // Don't count today's own session as part of the "usual" pattern.
    if (sameCalendarDay(d, now)) return;
    if (weekdayKey(d) !== weekday) return;
    sessions.push(s);
    if (hasTimeComponent(s.date)) hours.push(d.getHours());
  });
  return { sessions, hours };
}

export interface SuggestionInputs {
  history: WorkoutSession[];
  weeklyPlan: WeeklyPlan | null;
  gym: GymPrefs | null;
  /** Current device coordinates, or null if unavailable / not yet read. */
  coords: { latitude: number; longitude: number } | null;
  now: Date;
  /** Resolve a focus id to its display name (e.g. via getFocusDef). */
  focusLabel?: (focus: string) => string;
}

/** Decide whether to recommend starting a training right now, and which one.
 *
 * Fires when the user is physically at their saved gym (location signal) OR
 * when it's a day/time of week they usually train (time signal) — provided
 * they haven't already logged a session today. Returns null when no signal
 * fires or reminders are disabled. */
export function buildSuggestion(input: SuggestionInputs): TrainingSuggestion | null {
  const { history, weeklyPlan, gym, coords, now } = input;
  const label = input.focusLabel ?? ((f: string) => f);

  // Reminders off → never suggest.
  if (gym && gym.remindersEnabled === false) return null;

  // Already trained today → don't nag.
  const trainedToday = history.some(s => {
    const d = parseSessionDate(s.date);
    return d != null && sameCalendarDay(d, now);
  });
  if (trainedToday) return null;

  // ── Location signal ────────────────────────────────────────────────────────
  let locationMatch = false;
  let distanceM: number | undefined;
  if (gym && gym.latitude != null && gym.longitude != null && coords) {
    distanceM = haversineMeters(gym.latitude, gym.longitude, coords.latitude, coords.longitude);
    locationMatch = distanceM <= (gym.radiusM ?? DEFAULT_GYM_RADIUS_M);
  }

  // ── Time-of-week signal ──────────────────────────────────────────────────────
  const todayKey = weekdayKey(now);
  const pattern = analyzeWeekday(history, todayKey, now);
  const usualDay = pattern.sessions.length >= MIN_WEEKDAY_SESSIONS;
  let timeMatch = false;
  if (usualDay) {
    if (pattern.hours.length > 0) {
      const hour = now.getHours();
      timeMatch = pattern.hours.some(h => Math.abs(h - hour) <= TIME_WINDOW_HOURS);
    } else {
      // Only date-only history available — fall back to a weekday-level match.
      timeMatch = true;
    }
  }

  if (!locationMatch && !timeMatch) return null;

  // ── Pick the focus to recommend ──────────────────────────────────────────────
  const dayMap = dayMapForCurrentWeek(weeklyPlan);
  const today: DayPlan | undefined = dayMap[todayKey];
  let focus: string;
  let dayPlan: DayPlan | null;
  if (today && today.enabled && today.focus) {
    focus = today.focus;
    dayPlan = today;
  } else {
    focus = mostCommonFocus(pattern.sessions) ?? mostCommonFocus(history) ?? "full";
    dayPlan = null;
  }
  const focusName = label(focus);

  // ── Compose the banner copy ──────────────────────────────────────────────────
  const reason: TrainingSuggestion["reason"] =
    locationMatch && timeMatch ? "both" : locationMatch ? "location" : "time";
  const gymName = gym?.name || "your gym";
  const weekdayLabel = WEEKDAY_LABELS[todayKey];

  let title: string;
  let detail: string;
  if (reason === "both") {
    title = `You're at ${gymName} — your usual time`;
    detail = `Looks like ${focusName} day. Ready to start?`;
  } else if (reason === "location") {
    title = `You're at ${gymName}`;
    detail = `Time for ${focusName}? Tap to start your session.`;
  } else {
    title = `Your usual ${weekdayLabel} session`;
    detail = `You normally train around now. Start ${focusName}?`;
  }

  return { reason, focus, dayPlan, title, detail, distanceM };
}
