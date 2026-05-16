import type {
  WorkoutTemplate, ExerciseNote, StreakSummary, SorenessLog,
  TwoFactorStatus, TwoFactorEnrollment, CoachAIResponse,
} from "../types";

type Fetcher = (url: string, opts?: RequestInit) => Promise<Response>;

async function jsonOr<T>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) return fallback;
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export const templatesApi = {
  list:   (f: Fetcher) => f("/api/templates").then(r => jsonOr<WorkoutTemplate[]>(r, [])),
  create: (f: Fetcher, body: Partial<WorkoutTemplate>) => f("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(jsonOrThrow<WorkoutTemplate>),
  update: (f: Fetcher, id: number, body: Partial<WorkoutTemplate>) => f(`/api/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(jsonOrThrow<WorkoutTemplate>),
  markUsed: (f: Fetcher, id: number) => f(`/api/templates/${id}/use`, { method: "POST" })
    .then(jsonOrThrow<WorkoutTemplate>),
  remove: (f: Fetcher, id: number) => f(`/api/templates/${id}`, { method: "DELETE" }),
};

export const notesApi = {
  list: (f: Fetcher) => f("/api/exercise-notes").then(r => jsonOr<ExerciseNote[]>(r, [])),
  put:  (f: Fetcher, exId: string, body: string) => f(`/api/exercise-notes/${exId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  }).then(jsonOrThrow<ExerciseNote>),
  remove: (f: Fetcher, exId: string) => f(`/api/exercise-notes/${exId}`, { method: "DELETE" }),
};

export const streaksApi = {
  summary: (f: Fetcher) => f("/api/streaks").then(r => jsonOr<StreakSummary>(r, {
    current_streak: 0, best_streak: 0, sessions_total: 0,
    days_active_30: 0, last_workout_date: null, earned_badges: [],
  })),
};

export const sorenessApi = {
  list:    (f: Fetcher) => f("/api/soreness").then(r => jsonOr<SorenessLog[]>(r, [])),
  upsert:  (f: Fetcher, body: SorenessLog) => f("/api/soreness", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(jsonOrThrow<SorenessLog>),
  remove:  (f: Fetcher, dateIso: string) => f(`/api/soreness/${dateIso}`, { method: "DELETE" }),
};

export const twoFactorApi = {
  status:  (f: Fetcher) => f("/api/auth/2fa/status").then(jsonOrThrow<TwoFactorStatus>),
  enroll:  (f: Fetcher) => f("/api/auth/2fa/enroll", { method: "POST" }).then(jsonOrThrow<TwoFactorEnrollment>),
  verify:  (f: Fetcher, code: string) => f("/api/auth/2fa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }),
  disable: (f: Fetcher, password: string, code?: string) => f("/api/auth/2fa/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, code }),
  }),
};

export const accountApi = {
  exportUrl: "/api/account/export",
  remove:    (f: Fetcher, password: string) => f("/api/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, confirm: "DELETE" }),
  }),
};

export const importApi = {
  csv: (f: Fetcher, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return f("/api/import/csv", { method: "POST", body: form })
      .then(jsonOrThrow<{ imported_sessions: number; exercises: number; layout: string }>);
  },
};

export const coachAiApi = {
  ask: (f: Fetcher, question: string, exerciseId?: string) => f("/api/coach-ai/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, exercise_id: exerciseId ?? null }),
  }).then(jsonOrThrow<CoachAIResponse>),
  health: (f: Fetcher) => f("/api/coach-ai/health").then(r => jsonOr<{
    configured: boolean; key_set: boolean; sdk_installed: boolean;
    model: string; daily_cap: number;
  }>(r, { configured: false, key_set: false, sdk_installed: false, model: "", daily_cap: 0 })),
};
