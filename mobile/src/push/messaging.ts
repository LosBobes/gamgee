import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import * as api from "../api";
import { ANDROID_CHANNEL_ID } from "../config";

/**
 * Parse the deep-link target carried by a push. The backend reuses the web
 * app's `/?tab=...` URLs, so we extract the `tab` (and any extra) query params.
 */
export interface PushTarget {
  tab: string;
  params: Record<string, string>;
}

export function parsePushUrl(url: string | undefined): PushTarget | null {
  if (!url) return null;
  const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const params: Record<string, string> = {};
  for (const pair of q.split("&")) {
    if (!pair) continue;
    const [k, v] = pair.split("=");
    params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  const tab = params.tab ?? "notifications";
  delete params.tab;
  return { tab, params };
}

/** Create the Android channel. Its id must match the backend's channel_id. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: "Gamgee",
    importance: AndroidImportance.HIGH,
  });
}

/** Ask the OS for notification permission. Returns true when granted. */
export async function requestPushPermission(): Promise<boolean> {
  // notifee.requestPermission drives the iOS prompt AND the Android 13+
  // POST_NOTIFICATIONS runtime prompt; messaging() then sees the grant.
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
}

/**
 * Full registration: request permission, fetch the FCM token, send it to the
 * backend, and keep it fresh on rotation. Returns an unsubscribe for the
 * onTokenRefresh listener (call on sign-out). No-ops gracefully if permission
 * is denied or the device has no Play Services.
 */
export async function registerForPush(authToken: string): Promise<() => void> {
  await ensureAndroidChannel();

  const granted = await requestPushPermission();
  if (!granted) return () => {};

  // iOS must register with APNs before a token is available.
  if (Platform.OS === "ios") {
    await messaging().registerDeviceForRemoteMessages();
  }

  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await api.registerDevice(authToken, fcmToken, deviceLabel());
    }
  } catch (err) {
    console.warn("Failed to register FCM token", err);
  }

  // Re-register whenever FCM rotates the token.
  return messaging().onTokenRefresh(async (next) => {
    try {
      await api.registerDevice(authToken, next, deviceLabel());
    } catch (err) {
      console.warn("Failed to refresh FCM token", err);
    }
  });
}

/** Drop this device's token from the backend (sign-out / disable). */
export async function unregisterForPush(authToken: string): Promise<void> {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) await api.unregisterDevice(authToken, fcmToken);
  } catch (err) {
    console.warn("Failed to unregister FCM token", err);
  }
}

/**
 * Display foreground messages. Android/iOS suppress notification UI while the
 * app is in the foreground, so we render it ourselves via Notifee. Returns an
 * unsubscribe.
 */
export function onForegroundMessage(): () => void {
  return messaging().onMessage(async (msg) => {
    await displayMessage(msg);
  });
}

async function displayMessage(msg: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
  const title = msg.notification?.title ?? "Gamgee";
  const body = msg.notification?.body ?? "";
  await notifee.displayNotification({
    title,
    body,
    data: msg.data ?? {},
    android: {
      channelId: ANDROID_CHANNEL_ID,
      // Omit smallIcon → Notifee uses the default launcher icon, so we never
      // reference a drawable that might not exist in the native project.
      pressAction: { id: "default" },
    },
    ios: { sound: "default" },
  });
}

/**
 * Wire notification taps to navigation. Handles three entry paths:
 *   - app already running in background → onNotificationOpenedApp
 *   - app launched from a quit state    → getInitialNotification
 *   - Notifee press while in foreground  → onForegroundEvent
 * Calls `onOpen` with the parsed deep-link target. Returns an unsubscribe.
 */
export function onNotificationOpen(onOpen: (target: PushTarget) => void): () => void {
  const handle = (data: Record<string, unknown> | undefined) => {
    const target = parsePushUrl(data?.url as string | undefined);
    if (target) onOpen(target);
  };

  // Quit-state launch.
  messaging()
    .getInitialNotification()
    .then((msg) => {
      if (msg) handle(msg.data);
    });

  const unsubBackground = messaging().onNotificationOpenedApp((msg) => {
    handle(msg.data);
  });

  const unsubForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handle(detail.notification?.data);
    }
  });

  return () => {
    unsubBackground();
    unsubForeground();
  };
}

function deviceLabel(): string {
  return `${Platform.OS} ${Platform.Version}`;
}
