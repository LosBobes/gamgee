import { useEffect, useState } from "react";

const DISMISS_KEY = "gamgee_install_nag_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Banner that nudges the user to install the PWA.
 *
 * iOS: Safari swallows the `beforeinstallprompt` event. We detect iOS Safari
 * (not already standalone) and tell the user to use Share -> Add to Home Screen.
 *
 * Everywhere else: we listen for `beforeinstallprompt` and offer the native
 * install button when the browser fires it.
 *
 * Dismissals persist in localStorage so we don't pester the user.
 */
export default function InstallNag() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"native" | "ios">("native");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/Android/.test(ua);
    if (isIos) {
      // Wait a moment so we don't slam the user on first load.
      const t = setTimeout(() => {
        setMode("ios");
        setVisible(true);
      }, 5000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  return (
    <div className="install-nag" role="region" aria-label="Install Gamgee">
      <div className="install-nag-body">
        {mode === "ios" ? (
          <>
            <strong>Install Gamgee</strong> for offline workouts: tap{" "}
            <em>Share</em> → <em>Add to Home Screen</em>.
          </>
        ) : (
          <>
            <strong>Install Gamgee</strong> to keep logging when your gym's
            wifi flakes — it works offline once installed.
          </>
        )}
      </div>
      {mode === "native" && deferred && (
        <button className="primary" onClick={install}>Install</button>
      )}
      <button onClick={dismiss}>Dismiss</button>
    </div>
  );
}
