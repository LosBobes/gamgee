// Typed client for the /api/content/* endpoints. Read endpoints are public;
// write endpoints require an admin token (handled by the caller via
// `authFetch`).

import type { ExerciseMotion } from "./exerciseMotions";

const API = "/api/content";

export interface QuoteRow {
  id: number;
  bucket: "bro" | "grl" | "pro" | "hero_bro" | "hero_grl";
  text: string;
  source?: string | null;
  line2?: string | null;
  sort: number;
}

export interface TipRow {
  id: string;
  icon: string;
  title: string;
  body: string;
  body_bro?: string | null;
  body_grl?: string | null;
  sort: number;
}

export interface FocusRow {
  id: string;
  name: string;
  icon: string;
  description: string;
  exercise_ids: string[];
  sort: number;
}

export interface MuscleRow {
  id: string;
  name: string;
  muscle_group: string;
  sort: number;
}

export interface StretchRow {
  id: number;
  muscle_group: string;
  name: string;
  duration: number;
  per_side: boolean;
  cue: string;
  sort: number;
}

export interface ExerciseInfoRow {
  exercise_id: string;
  setup: string;
  execute: string;
  cue: string;
}

export interface MetricDefRow {
  id: string;
  label: string;
  unit: string;
  color: string;
  step: number;
  min_value: number;
  max_value: number;
  sort: number;
}

export interface BodyMapShapeRow {
  id: string;
  data: unknown;
}

export interface WeekDayRow {
  key: string;
  label: string;
  short: string;
  sort: number;
}

export interface MotionRow {
  exercise_id: string;
  name: string;
  category?: string | null;
  duration?: number | null;
  bench: boolean;
  floor: boolean;
  rig: NonNullable<ExerciseMotion["rig"]>;
  frames: ExerciseMotion["frames"];
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
  return r.json();
}

export const Content = {
  // Reads
  quotes:        () => getJson<QuoteRow[]>("/quotes"),
  tips:          () => getJson<TipRow[]>("/tips"),
  focuses:       () => getJson<FocusRow[]>("/focuses"),
  muscles:       () => getJson<MuscleRow[]>("/muscles"),
  stretches:     () => getJson<StretchRow[]>("/stretches"),
  exerciseInfo:  () => getJson<ExerciseInfoRow[]>("/exercise-info"),
  metrics:       () => getJson<MetricDefRow[]>("/metrics"),
  bodymap:       () => getJson<BodyMapShapeRow[]>("/bodymap"),
  weekDays:      () => getJson<WeekDayRow[]>("/week-days"),
  motions:       () => getJson<MotionRow[]>("/motions"),
  motion:        (id: string) => getJson<MotionRow>(`/motions/${id}`),
};

// Convert a backend MotionRow into the frontend `ExerciseMotion` shape used by
// the renderer / editor. The DB stores frames as plain JSON; the renderer is
// happy to consume that directly.
export function motionFromRow(row: MotionRow): ExerciseMotion {
  return {
    name: row.name,
    frames: row.frames as ExerciseMotion["frames"],
    duration: row.duration ?? undefined,
    bench: row.bench,
    floor: row.floor,
    category: row.category ?? undefined,
    rig: row.rig,
  };
}

// Writes — caller must supply an `authFetch` so the admin JWT travels.
export type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

async function writeJson<T>(
  authFetch: AuthFetch, method: string, path: string, body?: unknown,
): Promise<T> {
  const r = await authFetch(`${API}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = `${method} ${path} failed: ${r.status}`;
    try { msg += " " + (await r.text()); } catch { /* empty */ }
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  return r.json();
}

export const ContentAdmin = {
  // Quotes
  createQuote:   (f: AuthFetch, body: Omit<QuoteRow, "id">) => writeJson<QuoteRow>(f, "POST",   "/quotes", body),
  updateQuote:   (f: AuthFetch, id: number, body: Omit<QuoteRow, "id">) => writeJson<QuoteRow>(f, "PUT",    `/quotes/${id}`, body),
  deleteQuote:   (f: AuthFetch, id: number) => writeJson<void>(f, "DELETE", `/quotes/${id}`),

  // Tips
  createTip:     (f: AuthFetch, body: TipRow) => writeJson<TipRow>(f, "POST",  "/tips", body),
  updateTip:     (f: AuthFetch, id: string, body: Partial<TipRow>) => writeJson<TipRow>(f, "PATCH", `/tips/${id}`, body),
  deleteTip:     (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/tips/${id}`),

  // Focuses
  createFocus:   (f: AuthFetch, body: FocusRow) => writeJson<FocusRow>(f, "POST",  "/focuses", body),
  updateFocus:   (f: AuthFetch, id: string, body: Partial<FocusRow>) => writeJson<FocusRow>(f, "PATCH", `/focuses/${id}`, body),
  deleteFocus:   (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/focuses/${id}`),

  // Muscles
  createMuscle:  (f: AuthFetch, body: MuscleRow) => writeJson<MuscleRow>(f, "POST",  "/muscles", body),
  updateMuscle:  (f: AuthFetch, id: string, body: Partial<MuscleRow>) => writeJson<MuscleRow>(f, "PATCH", `/muscles/${id}`, body),
  deleteMuscle:  (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/muscles/${id}`),

  // Stretches
  createStretch: (f: AuthFetch, body: Omit<StretchRow, "id">) => writeJson<StretchRow>(f, "POST", "/stretches", body),
  updateStretch: (f: AuthFetch, id: number, body: Omit<StretchRow, "id">) => writeJson<StretchRow>(f, "PUT", `/stretches/${id}`, body),
  deleteStretch: (f: AuthFetch, id: number) => writeJson<void>(f, "DELETE", `/stretches/${id}`),

  // Exercise info
  upsertExerciseInfo: (f: AuthFetch, body: ExerciseInfoRow) => writeJson<ExerciseInfoRow>(f, "PUT", `/exercise-info/${body.exercise_id}`, body),
  deleteExerciseInfo: (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/exercise-info/${id}`),

  // Metrics
  createMetric:  (f: AuthFetch, body: MetricDefRow) => writeJson<MetricDefRow>(f, "POST", "/metrics", body),
  updateMetric:  (f: AuthFetch, id: string, body: Partial<MetricDefRow>) => writeJson<MetricDefRow>(f, "PATCH", `/metrics/${id}`, body),
  deleteMetric:  (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/metrics/${id}`),

  // Bodymap
  upsertShape:   (f: AuthFetch, body: BodyMapShapeRow) => writeJson<BodyMapShapeRow>(f, "PUT", `/bodymap/${body.id}`, body),
  deleteShape:   (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/bodymap/${id}`),

  // Week days
  upsertWeekDay: (f: AuthFetch, body: WeekDayRow) => writeJson<WeekDayRow>(f, "PUT", `/week-days/${body.key}`, body),

  // Motions
  upsertMotion:  (f: AuthFetch, body: MotionRow) => writeJson<MotionRow>(f, "PUT", `/motions/${body.exercise_id}`, body),
  patchMotion:   (f: AuthFetch, id: string, body: Partial<MotionRow>) => writeJson<MotionRow>(f, "PATCH", `/motions/${id}`, body),
  deleteMotion:  (f: AuthFetch, id: string) => writeJson<void>(f, "DELETE", `/motions/${id}`),
};
