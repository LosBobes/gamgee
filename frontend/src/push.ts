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

// iOS only delivers Web Push to PWAs that have been installed to the home
// screen (iOS 16.4+). Plain Safari can call subscribe() and the toggle will
// look fine, but no notification ever arrives — detect that here so the UI
// can show a useful hint instead of pretending it's enabled.
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iPad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; sniff via touch + platform.
  const iPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return iPad || iPadOS;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  // Safari sets navigator.standalone on iOS installed PWAs.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return !!mq || iosStandalone;
}

export function iosNeedsInstall(): boolean {
  return isIOS() && !isStandalone();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  if (swRegistration?.active) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    // Wait until the SW is actually active — pushManager.subscribe() can be
    // rejected when the worker is still installing (this is the cause of a
    // lot of "I clicked Enable and nothing happened" reports, especially on
    // iOS PWAs).
    if (!swRegistration.active) {
      await navigator.serviceWorker.ready;
      swRegistration = (await navigator.serviceWorker.getRegistration("/")) ?? swRegistration;
    }
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

// Compare the public key the browser baked into ``sub`` against the public
// key the server is currently advertising. If the server rotated VAPID keys
// (or this is a fresh deploy with a different keypair) the old subscription
// will never deliver — push services reject it with 401. We can't see those
// 401s from the client, so the only signal is the key mismatch itself.
function subscriptionMatchesKey(sub: PushSubscription, publicKeyB64: string): boolean {
  const raw = sub.options?.applicationServerKey;
  if (!raw) return false;
  const actual = bufferToUrlBase64(raw);
  const expected = publicKeyB64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return actual === expected;
}

export async function subscribePush(authFetch: AuthFetch): Promise<void> {
  if (!pushSupported()) throw new Error("Your browser doesn't support push notifications.");
  if (iosNeedsInstall()) {
    throw new Error(
      "On iPhone/iPad, push works only after you add Gamgee to your Home Screen. " +
      "Tap the share icon in Safari, then \"Add to Home Screen\", and open the app from there.",
    );
  }

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
  if (sub && !subscriptionMatchesKey(sub, public_key)) {
    // Server rotated VAPID keys — the existing browser subscription will
    // never deliver. Drop it locally + on the server before resubscribing.
    const staleEndpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch { /* ignore */ }
    try {
      await authFetch("/api/notifications/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: staleEndpoint }),
      });
    } catch { /* best-effort */ }
    sub = null;
  }

  if (sub) {
    // Refresh server copy in case the DB row was lost (rotation / reset /
    // pruned by 410). Idempotent on the server.
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

// Resync state for the Settings card: if the browser thinks it has a sub but
// the server's VAPID key doesn't match, drop it so the toggle accurately
// shows "off" and the user can re-enable cleanly. Also re-uploads a valid
// sub to the server in case its row was pruned (e.g. after a 410, or a
// `python -m app.init_db` wipe), so a stale "Enabled" toggle self-heals.
//
// Returns the *effective* state — true means we believe pushes will deliver,
// false means the user needs to tap Enable.
export async function refreshPushSubscription(authFetch: AuthFetch): Promise<boolean> {
  if (!pushSupported()) return false;
  const { public_key, enabled } = await fetchPushPublicKey(authFetch);
  if (!enabled || !public_key) return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  if (!subscriptionMatchesKey(sub, public_key)) {
    const staleEndpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch { /* ignore */ }
    try {
      await authFetch("/api/notifications/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: staleEndpoint }),
      });
    } catch { /* best-effort */ }
    return false;
  }

  try {
    await sendSubscription(authFetch, sub);
    return true;
  } catch {
    return false;
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

function bufferToUrlBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
