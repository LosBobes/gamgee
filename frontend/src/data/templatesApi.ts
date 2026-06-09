import type { WorkoutTemplate, WorkoutTemplateDraft } from "../types";

type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

/** Typed helpers for the `/api/templates` endpoints. Templates are a user's
 * saved, reusable workout blueprints. */
export async function listTemplates(authFetch: AuthFetch): Promise<WorkoutTemplate[]> {
  const r = await authFetch("/api/templates");
  if (!r.ok) return [];
  return r.json();
}

export async function createTemplate(
  authFetch: AuthFetch,
  draft: WorkoutTemplateDraft,
): Promise<WorkoutTemplate | null> {
  const r = await authFetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return r.ok ? r.json() : null;
}

export async function updateTemplate(
  authFetch: AuthFetch,
  id: number,
  draft: WorkoutTemplateDraft,
): Promise<WorkoutTemplate | null> {
  const r = await authFetch(`/api/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return r.ok ? r.json() : null;
}

export async function deleteTemplate(authFetch: AuthFetch, id: number): Promise<boolean> {
  const r = await authFetch(`/api/templates/${id}`, { method: "DELETE" });
  return r.ok;
}
