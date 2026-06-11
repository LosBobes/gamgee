import Constants from "expo-constants";

/** Backend API base URL, resolved from app.config.ts `extra.apiBaseUrl`. */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://10.0.2.2:8000";

/** Android notification channel id — must match the backend's
 *  AndroidNotification(channel_id=...) in app/fcm.py. */
export const ANDROID_CHANNEL_ID = "gamgee-default";
