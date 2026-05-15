# Web Push & VAPID

This document explains what **VAPID** is, why Gamgee uses it, and how the
end-to-end push pipeline fits together. It's both a primer (if you've never
shipped Web Push before) and the operator reference for rotating, deploying,
and debugging the keys.

It covers:

1. The shape of the problem VAPID solves.
2. The actors involved (your server, the browser, the push service).
3. The cryptography: ECDSA P-256, JWTs, and message encryption.
4. How Gamgee generates, stores, and uses the keys.
5. Rotating keys, smoke-testing the pipe, and the failure modes.

---

## 1. What problem does VAPID solve?

Browsers expose a **Push API** that lets a server deliver messages to a user's
device even when the tab is closed. The flow is:

```
   browser ──► push service ──► browser
                    ▲
                    │
               your server
```

The **push service** is run by the browser vendor — Chrome uses Firebase Cloud
Messaging (FCM), Firefox uses Mozilla's autopush, Safari uses Apple Push
Notification service (APNs). Your server never talks to the user's device
directly; it asks the push service to deliver a message to an opaque
**endpoint URL** the browser handed you at subscribe time.

Two questions immediately come up:

1. **How does the push service know it's really your server asking, and not
   somebody who scraped an endpoint URL out of a database leak?**
2. **How does the push service avoid being a relay for spam — i.e. how can
   the service contact you if your server starts misbehaving?**

**VAPID** (Voluntary Application Server Identification, [RFC 8292][rfc8292])
answers both. Every push request your server makes carries a **JWT signed
with your server's private key**. The push service verifies the signature
against a public key it has on file for that subscription. If you're not
who you say you are, the push is rejected.

[rfc8292]: https://datatracker.ietf.org/doc/html/rfc8292

---

## 2. The actors

```
┌────────────┐    1. subscribe(pubKey)        ┌────────────────┐
│            │───────────────────────────────►│                │
│  browser   │                                │  push service  │
│  (client)  │◄─── 2. endpoint URL ───────────│  (FCM/Moz/APNs)│
│            │                                │                │
└─────┬──────┘                                └────────▲───────┘
      │ 3. POST { endpoint, p256dh, auth }             │
      │                                                │
      ▼                                                │
┌────────────┐                                         │
│  Gamgee    │                                         │
│  backend   │                                         │
│  (server)  │── 4. POST endpoint, JWT(privKey) ───────┘
└────────────┘     + AES-128-GCM(message)
```

Step-by-step:

1. The browser calls `pushManager.subscribe({ applicationServerKey: <pub> })`.
2. The push service mints a unique **endpoint URL** and permanently pins your
   public key to it. (It also generates two per-subscription encryption
   keys — `p256dh` and `auth` — that the browser keeps. These are *not*
   VAPID keys; they're for encrypting the message body.)
3. The browser hands the endpoint + the two encryption keys to your server.
   You store them in `push_subscriptions`.
4. To send, your server POSTs to the endpoint URL with:
   - `Authorization: vapid t=<JWT>, k=<pub>` — proves you're the one who
     issued the subscription.
   - An AES-128-GCM-encrypted body keyed off `p256dh` + `auth` — only the
     browser can decrypt it. The push service sees ciphertext, not the
     message content.

The push service routes the encrypted blob to the device; the service worker
in the browser decrypts it and calls `showNotification(...)`.

---

## 3. The cryptography

### 3.1 The VAPID keypair (server identity)

A standard **ECDSA on the P-256 curve** keypair — the same curve TLS uses
for ECDHE. Two byte strings, both encoded as **URL-safe base64 (no padding)**:

- **Public key** — 65 bytes: `0x04 || X (32 bytes) || Y (32 bytes)` (the
  SEC1 uncompressed point form). After base64url it's 87 chars long. This is
  what `applicationServerKey` expects.
- **Private key** — 32 bytes: the raw scalar `d`. After base64url it's 43
  chars long. Stays on your server forever.
- **Subject claim** — a `mailto:` or `https:` URI baked into every JWT so the
  push service has a way to contact you. Gamgee uses `VAPID_SUBJECT`.

The JWT looks like:

```json
{
  "aud": "https://fcm.googleapis.com",    // origin of the endpoint URL
  "exp": 1715512345,                      // unix time, must be ≤ 24h ahead
  "sub": "mailto:admin@example.com"       // your contact
}
```

…signed `ES256` with the private key. The push service verifies the
signature against the public key it pinned at subscribe time. If it doesn't
match, you get `401 Unauthorized`.

### 3.2 The per-subscription keys (message confidentiality)

`p256dh` and `auth` come from the **browser**, not from your server:

- `p256dh` — the browser's ECDH P-256 public key for this subscription
  (65 bytes, base64url-encoded). Used in ECDH with an ephemeral key your
  server generates per message to derive a shared secret, then a content key
  with HKDF.
- `auth` — 16 random bytes from the browser, also base64url. Mixes into the
  HKDF derivation so even another tab subscribed to the same push service
  with the same `p256dh` can't decrypt your message.

Both follow the **Message Encryption for Web Push** spec, [RFC 8291][rfc8291].
`pywebpush` handles all of this for you — you just pass the subscription
dict and the message string.

[rfc8291]: https://datatracker.ietf.org/doc/html/rfc8291

### 3.3 Why this whole edifice matters

| Threat                                            | Mitigation                  |
|---------------------------------------------------|-----------------------------|
| Endpoint URL leaks (DB dump, log leak)            | Attacker can't sign a valid VAPID JWT without the private key → push service rejects. |
| Push service operator (Google, Mozilla, Apple) is curious about message contents | Message is end-to-end encrypted with keys the service never sees. |
| Server is being abused to spam users              | `sub` claim gives the push service a contact channel; they can revoke or rate-limit endpoints tied to your key. |
| Attacker steals VAPID private key                 | They can push to existing subscriptions; rotating keys invalidates every subscription. **Treat the private key like a secret.** |

---

## 4. How Gamgee uses VAPID

### 4.1 Generating a keypair

`backend/app/gen_vapid.py` mints a fresh pair using `cryptography`:

```bash
docker compose exec backend python -m app.gen_vapid

VAPID_PUBLIC_KEY=BIF55BqDTSLRfBOJMw2riQYxKbwH0cZrGxngC00jUmupocZSYQeK6ZfcT3wtS1JZ8HZdf8Y-PHyYyA5wFiR0wek
VAPID_PRIVATE_KEY=XHpyOXZImMg9vbCfSy2G---Zo1uFLk-j8T03D6NoH2w
VAPID_SUBJECT=mailto:you@example.com
```

Paste all three into `/opt/gamgee/.env` (production) or `.env` (dev). The
backend reads them at import time:

```python
# backend/app/push.py
VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
VAPID_SUBJECT     = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com").strip()
```

If any of them is empty, `push.is_configured()` returns `False`. The
subscribe endpoint then responds `503`, the Profile-tab toggle hides
itself, and the existing SSE bell keeps working as before. **The app is
fully usable without VAPID** — push is purely additive.

### 4.2 Where they're used

- **`GET /api/notifications/push/public-key`** returns the public key (or
  `enabled: false`) to the browser so it can call `pushManager.subscribe`.
- **`POST /api/notifications/push/subscribe`** stores the endpoint, `p256dh`,
  and `auth` in `push_subscriptions`, keyed on `(user_id, endpoint)`.
- **`push.send_to_user(...)`** loops every subscription for a user and calls
  `pywebpush(...)` with the private key. Fired from a daemon thread off the
  same SQLAlchemy `after_commit` hook that publishes SSE events, so the
  HTTP request that triggered the notification doesn't block.
- Subscriptions that come back **404 or 410** are pruned automatically —
  the push service tells you when the user has unsubscribed or cleared
  browser data.

### 4.3 Click routing

The service worker (`frontend/public/push-handlers.js`, imported into the
Workbox-generated SW) routes every click to `/?tab=notifications`. If the
app is already open it `postMessage`s the existing tab; otherwise it opens
a new window. `WorkoutTracker` reads `?tab=` on mount and switches accordingly.

---

## 5. Operations

### 5.1 First-time setup on the server

```bash
ssh root@gamgee.example.com
cd /opt/gamgee

# 1. Generate a keypair (uses the running backend container)
docker compose -f docker-compose.prod.yml exec backend python -m app.gen_vapid

# 2. Paste the three lines into .env
nano .env

# 3. Restart backend so it picks up the new env vars
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
```

That's it. Existing users see the toggle in **Profile → Notifications**
the next time they load the app.

### 5.2 Rotating the keys

**Rotating invalidates every existing subscription.** The public key is
permanently pinned to each subscription at subscribe time, so a new key
means every device has to opt in again. Rotate only if you suspect the
private key has leaked.

```bash
# 1. Mint a new pair
docker compose -f docker-compose.prod.yml exec backend python -m app.gen_vapid

# 2. Update .env

# 3. Wipe stale subscriptions (they'd all fail with 401 anyway)
docker compose -f docker-compose.prod.yml exec db \
  psql -U gamgee -d gamgee -c "DELETE FROM push_subscriptions;"

# 4. Restart
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
```

### 5.3 Smoke test

In the browser DevTools console while logged in:

```js
// 1. Confirm the server thinks push is configured
fetch("/api/notifications/push/public-key", {
  headers: { Authorization: "Bearer " + localStorage.iron_log_token }
}).then(r => r.json()).then(console.log);
// → { public_key: "BIF55B...", enabled: true }

// 2. Toggle the Profile switch on. You should see in DevTools → Application →
//    Service Workers that "/sw.js" is activated, and Application → Push
//    Messaging that a subscription exists.

// 3. Fire a notification from another account (buddy request, motivate, etc.)
//    A system notification should appear within a second or two.
```

### 5.4 Common failures

| Symptom                                              | Cause                                                                                  | Fix |
|------------------------------------------------------|----------------------------------------------------------------------------------------|-----|
| Toggle shows "Not enabled on this server"            | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` empty                                         | Set them in `.env` and restart backend. |
| Toggle shows "Your browser doesn't support push"     | Safari < 16, in-app web view, or feature disabled by enterprise policy                 | Use Chrome/Firefox/Edge or a recent Safari. |
| Click "Enable" → "Notification permission was denied" | User blocked notifications previously                                                  | Browser site settings → Notifications → Allow. |
| Push sends succeed (`pywebpush` returns 201) but nothing shows | Service worker not registered, or browser silently dropping notifications (battery saver, focus mode) | DevTools → Application → Service Workers; check `/sw.js` is activated. |
| 401 from push service in backend logs                | VAPID key changed; old subscriptions still in DB                                       | See rotation steps above — `DELETE FROM push_subscriptions`. |
| `WebPushException: 404` or `410`                     | Normal — user uninstalled the PWA or cleared site data                                 | Nothing; backend prunes the row automatically. |
| `WebPushException: 413` (payload too large)          | Message body > 4 KB after encryption                                                   | Shorten `message` in `notifications.create_notification`. |

### 5.5 Where the secrets live

| Layer            | Variable           | Note                                                                  |
|------------------|--------------------|-----------------------------------------------------------------------|
| `.env` on server | `VAPID_PUBLIC_KEY` | Not actually secret — sent to every browser — but co-located for convenience. |
| `.env` on server | `VAPID_PRIVATE_KEY`| **Treat like a password.** Anyone with this key can push to your users. |
| `.env` on server | `VAPID_SUBJECT`    | Any `mailto:` or `https:` URI you control. Used by push services to reach you. |
| `docker-compose.*.yml` | injected into the backend container as env vars                                            | See `backend:` block. |
| GitHub Actions   | _not set_          | The deploy workflow doesn't forward VAPID vars — they stay on the server only, so a CI compromise can't leak them. |

---

## 6. Further reading

- [RFC 8030 — Generic Event Delivery Using HTTP Push][rfc8030] — the push
  protocol itself.
- [RFC 8291 — Message Encryption for Web Push][rfc8291] — how `p256dh` /
  `auth` derive the content key.
- [RFC 8292 — VAPID for Web Push][rfc8292] — the JWT auth scheme.
- [MDN — Push API][mdn-push] — the browser-side reference.
- [`pywebpush` README][pywebpush] — the library Gamgee uses to send pushes.

[rfc8030]: https://datatracker.ietf.org/doc/html/rfc8030
[mdn-push]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
[pywebpush]: https://github.com/web-push-libs/pywebpush
