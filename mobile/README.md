# Gamgee Mobile (React Native + Expo)

Native iOS & Android app for Gamgee, talking to the existing FastAPI backend.
Native push notifications are delivered via **Firebase Cloud Messaging** (see
[`../docs/fcm-setup.md`](../docs/fcm-setup.md)).

> **This app cannot run in Expo Go.** It uses native Firebase modules
> (`@react-native-firebase/*`, `@notifee/react-native`), so you must build a
> **custom dev client** with EAS or `expo run:*`.

## Stack

| Concern        | Choice |
|----------------|--------|
| Framework      | Expo SDK 52 (prebuild / bare-compatible), React Native 0.76 |
| Navigation     | React Navigation 7 (native-stack + bottom-tabs) |
| Native push    | `@react-native-firebase/messaging` + `@notifee/react-native` |
| Secure storage | `expo-secure-store` (JWT) |
| API            | Shared FastAPI backend (`/api/*`) |

## Project layout

```
mobile/
├─ index.js                 # entry — registers the FCM background handler first
├─ App.tsx                  # providers + navigation container + push wiring
├─ app.config.ts            # Expo config (Firebase plugins, deep-link scheme, API URL)
├─ eas.json                 # EAS build profiles
└─ src/
   ├─ api/                  # typed backend client (client.ts + endpoints)
   ├─ auth/AuthContext.tsx  # JWT session, auto sign-out on 401
   ├─ push/                 # FCM: background handler, registration, tap routing
   ├─ navigation/           # stacks, tabs, navigationRef for push deep-links
   ├─ screens/              # Login, Register, Notifications, History, Profile
   └─ components/ui.tsx     # shared Button / Field / Card
```

## First-time setup

1. **Install deps**

   ```bash
   cd mobile
   npm install        # or: pnpm install / yarn
   ```

2. **Add Firebase credential files** (git-ignored). See `../docs/fcm-setup.md`:
   - `mobile/google-services.json`        (Android)
   - `mobile/GoogleService-Info.plist`    (iOS)

3. **Point the app at your backend.** The default is `http://10.0.2.2:8000`
   (Android emulator → host). Override per environment:

   ```bash
   export EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:8000   # your LAN IP for a real device
   ```

4. **Generate native projects** (only needed for local `run:*` builds):

   ```bash
   npx expo prebuild
   ```

## Run

```bash
# Local builds (need Android SDK / Xcode installed)
npm run android
npm run ios

# Or build a dev client in the cloud, then `npm start`
npx eas build --profile development --platform android
npm start
```

## Replace the placeholders

- `assets/*.png` are solid-colour placeholders — see `assets/README.md`.
- App identifiers (`app.gamgee.mobile`) live in `app.config.ts`; change them to
  your own before submitting to the stores.

---

## Roadmap

**Phase 1 (this PR) — foundation + native notifications ✅**
- Backend FCM dispatch (`backend/app/fcm.py`), device-token endpoints, dual
  fan-out alongside Web Push.
- RN app: auth (login/register/secure JWT), bottom-tab navigation, native push
  (foreground via Notifee, background/quit via OS), tap deep-linking, and the
  Notifications / History / Profile screens.

**Phase 2 — core logging**
- Workout wizard (start → mode → build → active logging) and Personal Records.
- Body metrics (health) screen.

**Phase 3 — social & realtime**
- Buddies / scoreboard, in-app chat (WebSocket), live co-workout sessions
  (SSE), trainer ↔ trainee coaching.

**Phase 4 — content & polish**
- Exercise catalogue & info, body-map visualisation, theming (primary colour),
  onboarding, offline cache.

Each phase reuses the API client and types already in `src/`. The backend needs
no further changes for the UI phases — every endpoint the web app uses is
already live.
