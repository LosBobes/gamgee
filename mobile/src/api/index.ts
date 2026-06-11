import { Platform } from "react-native";

import { AppNotification, User, WorkoutSession } from "../types";
import { apiFetch } from "./client";

/** OAuth2 password flow — the backend expects form-encoded username/password. */
export async function login(username: string, password: string): Promise<string> {
  const form = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const res = await apiFetch<{ access_token: string; token_type: string }>(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
  );
  return res.access_token;
}

export function register(input: {
  username: string;
  password: string;
  name: string;
  email: string;
  gender: string;
}): Promise<User> {
  return apiFetch<User>("/api/auth/register", { method: "POST", json: input });
}

export function getMe(token: string): Promise<User> {
  return apiFetch<User>("/api/auth/me", { token });
}

export function listNotifications(token: string, limit = 50): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>(`/api/notifications?limit=${limit}`, { token });
}

export function unreadCount(token: string): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/api/notifications/unread-count", { token });
}

export function markRead(token: string, id: number): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/api/notifications/${id}/read`, { method: "POST", token });
}

export function markAllRead(token: string): Promise<void> {
  return apiFetch<void>("/api/notifications/read-all", { method: "POST", token });
}

export function deleteNotification(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/api/notifications/${id}`, { method: "DELETE", token });
}

export function listWorkouts(token: string): Promise<WorkoutSession[]> {
  return apiFetch<WorkoutSession[]>("/api/workouts", { token });
}

// ── Native push (FCM) device tokens ──────────────────────────────────────────

export function nativePushStatus(token: string): Promise<{ enabled: boolean }> {
  return apiFetch<{ enabled: boolean }>("/api/notifications/devices/status", { token });
}

export function registerDevice(token: string, fcmToken: string, deviceInfo?: string): Promise<void> {
  return apiFetch<void>("/api/notifications/devices/register", {
    method: "POST",
    token,
    json: {
      token: fcmToken,
      platform: Platform.OS, // "android" | "ios"
      device_info: deviceInfo,
    },
  });
}

export function unregisterDevice(token: string, fcmToken: string): Promise<void> {
  return apiFetch<void>("/api/notifications/devices/unregister", {
    method: "POST",
    token,
    json: { token: fcmToken },
  });
}
