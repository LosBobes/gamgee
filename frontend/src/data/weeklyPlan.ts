import type { WeekPlanDay, WeeklyPlan } from "../types";

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

export function loadWeeklyPlan(): WeeklyPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WeeklyPlan) : null;
  } catch { return null; }
}

export function saveWeeklyPlan(plan: WeeklyPlan): void {
  localStorage.setItem(KEY, JSON.stringify(plan));
}

export function getTodayKey(): WeekPlanDay {
  const map: WeekPlanDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[new Date().getDay()];
}
