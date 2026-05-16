import { useEffect } from "react";

/**
 * Sets the PWA app icon badge to a count using the Badging API.
 * Quietly does nothing on browsers that don't support it (Safari iOS, etc).
 */
export function useAppBadge(count: number): void {
  useEffect(() => {
    const nav = navigator as unknown as {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge && !nav.clearAppBadge) return;
    if (count > 0) {
      nav.setAppBadge?.(count).catch(() => { /* permission denied is fine */ });
    } else {
      nav.clearAppBadge?.().catch(() => {});
    }
  }, [count]);
}
