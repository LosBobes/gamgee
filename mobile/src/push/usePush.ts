import { useEffect } from "react";

import { useAuth } from "../auth/AuthContext";
import { navigateToTab } from "../navigation/navigationRef";
import {
  onForegroundMessage,
  onNotificationOpen,
  registerForPush,
} from "./messaging";

/**
 * Wires native push to the session lifecycle. While signed in it:
 *   - registers this device's FCM token with the backend (and refreshes it),
 *   - shows foreground messages via Notifee,
 *   - routes notification taps to the matching tab.
 * All listeners are torn down on sign-out.
 */
export function usePush(): void {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    let unsubRefresh: (() => void) | undefined;
    registerForPush(token)
      .then((unsub) => {
        unsubRefresh = unsub;
      })
      .catch(() => {});

    const unsubForeground = onForegroundMessage();
    const unsubOpen = onNotificationOpen((target) => navigateToTab(target.tab));

    return () => {
      unsubRefresh?.();
      unsubForeground();
      unsubOpen();
    };
  }, [token]);
}
