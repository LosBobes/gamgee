import { API_BASE_URL } from "../config";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  token?: string | null;
  /** JSON body — serialized automatically. */
  json?: unknown;
  /** Pre-encoded body (e.g. URL-encoded form for the OAuth2 login). */
  body?: string;
  headers?: Record<string, string>;
}

/**
 * Low-level fetch wrapper around the Gamgee backend. Adds the bearer token,
 * serializes JSON, and surfaces non-2xx responses as {@link ApiError} so callers
 * can branch on `.status` (notably 401 → session expired).
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  let body = opts.body;

  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  if (opts.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : undefined) ?? `Request failed (HTTP ${res.status})`;
    throw new ApiError(res.status, detail);
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
