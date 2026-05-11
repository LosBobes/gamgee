import { useEffect, useRef } from "react";

// Intercepts the browser's history-back navigation (Android back button,
// iOS edge-swipe back gesture) on touch devices and routes it through
// `onBack` instead of letting the page unload. `onBack` returns true when
// it consumed the gesture; returning false lets the browser actually go
// back (e.g. exit the app / leave the page).
export function useMobileBackGesture(enabled: boolean, onBack: () => boolean) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const GUARD = "gamgee-back-guard";
    const isGuarded = () =>
      typeof window.history.state === "object" &&
      window.history.state !== null &&
      (window.history.state as { gamgee?: string }).gamgee === GUARD;

    if (!isGuarded()) {
      window.history.pushState({ gamgee: GUARD }, "");
    }

    const onPop = () => {
      if (onBackRef.current()) {
        window.history.pushState({ gamgee: GUARD }, "");
      }
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [enabled]);
}
