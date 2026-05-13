import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const WELCOME_KEY  = "gamgee_welcome_seen";
const HINTS_KEY    = "gamgee_hints_dismissed";
const TOUR_KEY     = "gamgee_tour_active";

interface OnboardingState {
  showWelcome:    boolean;
  tourActive:     boolean;
  dismissedHints: Set<string>;
  isHintVisible:  (key: string) => boolean;
  dismissHint:    (key: string) => void;
  startTour:      () => void;
  endTour:        () => void;
  openWelcome:    () => void;
  closeWelcome:   () => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

interface ProviderProps {
  children:    ReactNode;
  /** History length used to detect a brand-new user. The welcome modal pops
   *  automatically once when this is 0 and the user has never seen it. */
  historyLen:  number;
}

export function OnboardingProvider({ children, historyLen }: ProviderProps) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive,  setTourActive]  = useState(() => localStorage.getItem(TOUR_KEY) === "1");
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(HINTS_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  // First-launch auto-popup: no history and welcome was never dismissed.
  useEffect(() => {
    const seen = localStorage.getItem(WELCOME_KEY) === "1";
    if (!seen && historyLen === 0) setShowWelcome(true);
  }, [historyLen]);

  useEffect(() => {
    try { localStorage.setItem(HINTS_KEY, JSON.stringify([...dismissedHints])); } catch { /* ignore */ }
  }, [dismissedHints]);

  useEffect(() => {
    if (tourActive) localStorage.setItem(TOUR_KEY, "1");
    else            localStorage.removeItem(TOUR_KEY);
  }, [tourActive]);

  const dismissHint = useCallback((key: string) => {
    setDismissedHints(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const startTour = useCallback(() => {
    setDismissedHints(new Set());
    setTourActive(true);
    localStorage.setItem(WELCOME_KEY, "1");
    setShowWelcome(false);
  }, []);

  const endTour = useCallback(() => {
    setTourActive(false);
  }, []);

  const closeWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, "1");
    setShowWelcome(false);
  }, []);

  const openWelcome = useCallback(() => setShowWelcome(true), []);

  const isHintVisible = useCallback(
    (key: string) => tourActive && !dismissedHints.has(key),
    [tourActive, dismissedHints]
  );

  const value = useMemo<OnboardingState>(() => ({
    showWelcome, tourActive, dismissedHints,
    isHintVisible, dismissHint, startTour, endTour, openWelcome, closeWelcome,
  }), [showWelcome, tourActive, dismissedHints, isHintVisible, dismissHint, startTour, endTour, openWelcome, closeWelcome]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
