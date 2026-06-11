# Native push setup (Firebase Cloud Messaging)

The Gamgee mobile app (`mobile/`) delivers push notifications through **Firebase
Cloud Messaging (FCM)**: Android receives them directly, iOS receives them via
FCM-wrapped APNs. This is the native counterpart to the browser **Web Push
(VAPID)** flow documented in `web-push-vapid.md`. Both fan out from the same
`notifications.py` helpers — see "How it fits together" below.

If you don't configure FCM, the backend's native-push path is a no-op: the
in-app notification bell (SSE) and browser Web Push keep working.

---

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
2. Inside the project, add **two apps**:
   - **Android** — package name `app.gamgee.mobile` (matches `mobile/app.config.ts`).
   - **iOS** — bundle id `app.gamgee.mobile`.

## 2. Download the client credential files

These are consumed by the mobile build (not the backend):

- Android → **`google-services.json`** → place at `mobile/google-services.json`.
- iOS → **`GoogleService-Info.plist`** → place at `mobile/GoogleService-Info.plist`.

Both are git-ignored (`mobile/.gitignore`) because they're per-project. The
paths are already wired up in `mobile/app.config.ts`.

## 3. Enable APNs (iOS only)

For iOS you must connect your Apple Push credentials so FCM can reach APNs:

1. In the Apple Developer portal create an **APNs Auth Key** (`.p8`).
2. Firebase console → **Project settings → Cloud Messaging → Apple app
   configuration** → upload the `.p8`, Key ID, and your Team ID.

## 4. Backend service-account credential

The backend authenticates to FCM with a **service-account key** (server-side,
never shipped in the app):

1. Firebase console → **Project settings → Service accounts**.
2. **Generate new private key** → downloads a JSON file.
3. Expose it to the backend via **one** of these env vars (see `.env.example`):

   ```bash
   # Option A — inline JSON (handy for docker-compose / secrets managers)
   FCM_CREDENTIALS_JSON='{"type":"service_account", ... }'

   # Option B — a file path mounted into the container
   FCM_CREDENTIALS_FILE=/run/secrets/fcm.json
   ```

   The standard `GOOGLE_APPLICATION_CREDENTIALS` path var is also honoured.

4. Restart the backend. Confirm it's live:

   ```bash
   curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/notifications/devices/status
   # => {"enabled": true}
   ```

`firebase-admin` (added to `backend/requirements.txt`) handles token minting,
retries, and invalid-token detection. Tokens FCM reports as unregistered are
auto-pruned from `device_tokens`, mirroring the 404/410 pruning for Web Push.

---

## How it fits together

```
router fires event
  → notifications.create_notification() / notify_buddies()
      → queues an in-app Notification row (SSE) + a push item
  → SQLAlchemy after_commit drains the queue:
      → push.dispatch_batch_async()  → Web Push   (browser)
      → fcm.dispatch_batch_async()   → FCM        (mobile)   ← new
```

Both channels share one payload (title, body, kind, `url`). The `url` is the web
app's `/?tab=…` deep link; the mobile app parses the `tab` query param to route
the notification tap (`mobile/src/push/messaging.ts`).

## Device-token lifecycle

| Event                | App action                                  | Endpoint |
|----------------------|---------------------------------------------|----------|
| Sign in / permission | `getToken()` → register                     | `POST /api/notifications/devices/register` |
| Token rotation       | `onTokenRefresh` → re-register              | `POST /api/notifications/devices/register` |
| Sign out             | unregister this device                      | `POST /api/notifications/devices/unregister` |
| Token invalid at send| backend deletes the row                     | — |

Registration is idempotent on `(user_id, token)`, so re-posting upserts.
