import type { WeekPlanDay, WeeklyPlan, DayPlan, WeekPlan } from "../types";

export const WEEK_DAYS: { key: WeekPlanDay; label: string; short: string }[] = [
  { key: "mon", label: "Monday",    short: "MON" },
  { key: "tue", label: "Tuesday",   short: "TUE" },
  { key: "wed", label: "Wednesday", short: "WED" },
  { key: "thu", label: "Thursday",  short: "THU" },
  { key: "fri", label: "Friday",    short: "FRI" },
  { key: "sat", label: "Saturday",  short: "SAT" },
  { key: "sun", label: "Sunday",    short: "SUN" },
];

const KEY = "gamgee_weekly_plan";
const WEEK_KEYS: WeekPlanDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function loadWeeklyPlan(): WeeklyPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WeeklyPlan) : null;
  } catch { return null; }
}

export function saveWeeklyPlan(plan: WeeklyPlan): void {
  localStorage.setItem(KEY, JSON.stringify(plan));
}

export function clearWeeklyPlan(): void {
  localStorage.removeItem(KEY);
}

export function getTodayKey(): WeekPlanDay {
  const map: WeekPlanDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[new Date().getDay()];
}

/** Helper: extract the day map for the currently-active week. Multi-week
 * regimes store every week in `weeks`; single-week applications keep the
 * legacy flat day map on the WeeklyPlan itself. */
export function dayMapForCurrentWeek(plan: WeeklyPlan | null): Partial<Record<WeekPlanDay, DayPlan>> {
  if (!plan) return {};
  if (plan.weeks && plan.weeks.length > 0) {
    const idx = Math.max(0, Math.min((plan.current_week_index ?? 0), plan.weeks.length - 1));
    return plan.weeks[idx].days || {};
  }
  // Strip the multi-week scaffolding keys before returning the flat map.
  const flat: Partial<Record<WeekPlanDay, DayPlan>> = {};
  WEEK_KEYS.forEach(k => {
    const v = (plan as Partial<Record<WeekPlanDay, DayPlan>>)[k];
    if (v) flat[k] = v;
  });
  return flat;
}

/** Build a fresh WeeklyPlan from a multi-week regime structure. Always
 * resets the current_week_index to 0. */
export function weeklyPlanFromWeeks(weeks: WeekPlan[]): WeeklyPlan {
  if (!weeks || weeks.length === 0) {
    return { weeks: [], current_week_index: 0 };
  }
  return { weeks, current_week_index: 0 };
}

/** Advance the current_week_index by one (wraps to 0 at the end). */
export function advanceWeek(plan: WeeklyPlan): WeeklyPlan {
  if (!plan.weeks || plan.weeks.length === 0) return plan;
  const cur = plan.current_week_index ?? 0;
  return { ...plan, current_week_index: (cur + 1) % plan.weeks.length };
}
