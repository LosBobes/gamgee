// Web Push opt-in helper: registers the service worker, subscribes via the
// browser's PushManager, and tells the backend about the subscription.
//
// All errors are surfaced as thrown Error("user-friendly text") so the
// Profile toggle can render them inline without having to translate
// browser-specific exceptions.

type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

interface PublicKeyResponse {
  public_key: string | null;
  enabled: boolean;
}

let swRegistration: ServiceWorkerRegistration | null = null;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    return swRegistration;
  } catch (err) {
    console.warn("Service worker registration failed", err);
    return null;
  }
}

export async function fetchPushPublicKey(authFetch: AuthFetch): Promise<PublicKeyResponse> {
  const r = await authFetch("/api/notifications/push/public-key");
  if (!r.ok) return { public_key: null, enabled: false };
  return await r.json();
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

export async function subscribePush(authFetch: AuthFetch): Promise<void> {
  if (!pushSupported()) throw new Error("Your browser doesn't support push notifications.");

  const { public_key, enabled } = await fetchPushPublicKey(authFetch);
  if (!enabled || !public_key) {
    throw new Error("Push notifications aren't configured on this server yet.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const reg = await registerServiceWorker();
  if (!reg) throw new Error("Couldn't register the notifications service worker.");

  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    // Refresh server copy in case it was lost / DB reset
    await sendSubscription(authFetch, sub);
    return;
  }

  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource,
  });
  await sendSubscription(authFetch, sub);
}

export async function unsubscribePush(authFetch: AuthFetch): Promise<void> {
  const reg = await registerServiceWorker();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  try {
    await authFetch("/api/notifications/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // best-effort — local unsubscribe already succeeded
  }
}

async function sendSubscription(authFetch: AuthFetch, sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription from the browser.");
  }
  const r = await authFetch("/api/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      user_agent: navigator.userAgent.slice(0, 500),
    }),
  });
  if (!r.ok) {
    throw new Error(`Couldn't register with the server (HTTP ${r.status}).`);
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
