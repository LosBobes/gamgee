import { useState, useEffect, useCallback, useRef } from "react";
import "./WorkoutTracker.css";
import type {
  CardioPlan, DayPlan, ExerciseDef, WorkoutExercise, WorkoutSession,
  PersonalRecordAPI, PRDict, WorkoutSet, BodyMetric, WeeklyPlan,
  Buddy, AppNotification, LiveSession,
  TrainerLink, RegimeAssignment, Conversation, ChatMessage, WorkoutTemplate,
  ProgressionOverride, RestPrefs,
  WizardTransitionStyle,
} from "./types";
import { DEFAULT_REST_PREFS, DEFAULT_WIZARD_TRANSITION } from "./types";
import { clearWeeklyPlan, loadWeeklyPlan, saveWeeklyPlan } from "./data/weeklyPlan";
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from "./data/templatesApi";
import { getFocusDef } from "./data/focuses";
import AuthScreen from "./components/AuthScreen";
import AppHeader from "./components/AppHeader";
import StatsBar from "./components/StatsBar";
import WorkoutTab from "./components/workout/WorkoutTab";
import WorkoutComplete from "./components/workout/WorkoutComplete";
import HistoryTab from "./components/tabs/HistoryTab";
import PRsTab from "./components/tabs/PRsTab";
import HealthTab from "./components/tabs/HealthTab";
import CoachTab from "./components/tabs/CoachTab";
import ProfileTab from "./components/tabs/ProfileTab";
import SettingsTab from "./components/tabs/SettingsTab";
import ExercisesTab from "./components/tabs/ExercisesTab";
import BuddiesTab from "./components/tabs/BuddiesTab";
import NotificationsTab from "./components/tabs/NotificationsTab";
import ChatTab from "./components/tabs/ChatTab";
import CoachingTab from "./components/tabs/CoachingTab";
import TraineesTab from "./components/tabs/TraineesTab";
import RegimesTab from "./components/tabs/RegimesTab";
import LiveSessionViewer from "./components/LiveSessionViewer";
import NotificationBell from "./components/NotificationBell";
import FeedbackModal from "./components/FeedbackModal";
import OnboardingWelcome from "./components/Onboarding";
import { ALL_EX, subscribeCustomExercises } from "./data/exercises";
import { analyzeEx, prescribeExercise, rampedSetsFromHistory } from "./analysis";
import { loadPrescribeConfigs, mergePrescribeConfigs } from "./data/prescribeConfigs";
import { useMobileBackGesture } from "./hooks/useMobileBackGesture";
import { useEventStream } from "./hooks/useEventStream";
import { useChatSocket } from "./hooks/useChatSocket";
import { ToneProvider, type ToneMode } from "./context/ToneContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { registerServiceWorker } from "./push";


interface WorkoutTrackerProps {
  initialAuthView?: "login" | "register" | "forgot" | "reset" | "verify";
  initialAuthToken?: string;
  /** Force the auth screen even when a token is in localStorage (used when
   *  arriving via a password-reset / email-verify link so the user always sees
   *  the relevant view first). */
  forceAuthScreen?: boolean;
}

export default function WorkoutTracker({
  initialAuthView,
  initialAuthToken,
  forceAuthScreen = false,
}: WorkoutTrackerProps = {}) {
  // UI
  const [tab,       setTab]       = useState<string>(() => {
    const valid  = ["workout", "history", "prs", "buddies", "health", "coach", "exercises", "notifications", "profile", "settings", "chat", "coaching", "trainees", "regimes"];
    // A ?tab= query param takes precedence — push-notification clicks route
    // through the service worker to /?tab=notifications.
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab && valid.includes(urlTab)) return urlTab;
    const stored = sessionStorage.getItem("gamgee_active_tab");
    return stored && valid.includes(stored) ? stored : "workout";
  });
  const [wStep,     setWStep]     = useState(0);
  const [focus,     setFocus]     = useState<string | null>(null);
  // `timing: null` means the user hasn't picked yet — the wizard screen lands
  // with nothing pre-selected so they make a deliberate choice.
  const [cardio,    setCardio]    = useState<CardioPlan>({ timing: null, before: null, after: null });
  const [planned,   setPlanned]   = useState<ExerciseDef[]>([]);
  // Per-exercise prescription from the day's regime (warmup/working sets, RPE,
  // reference max). Populated by loadTodayPlan; consumed by startFromWizard
  // to pre-populate the active workout with prescribed warmup + working sets.
  // Also written by the RPE-driven prescribe step (WizardPrescribe) before it
  // hands off to startFromWizard.
  const [plannedConfigs, setPlannedConfigs] = useState<Record<string, import("./types").ExerciseConfig>>({});
  // Last-used RPE prescribe configs from localStorage so the prescribe step
  // pre-seeds the same target effort/reference next time the user opts in.
  // Merged with `plannedConfigs` (which wins) so a regime day's RPE always
  // takes precedence over saved freeform configs.
  const [savedPrescribeConfigs, setSavedPrescribeConfigs] = useState<Record<string, import("./types").ExerciseConfig>>(() => loadPrescribeConfigs());
  // logging
  const [active,    setActive]    = useState(false);
  const [startTs,   setStartTs]   = useState<number | null>(null);
  const [elapsed,   setElapsed]   = useState(0);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  // data
  const [history,       setHistory]       = useState<WorkoutSession[]>([]);
  const [prs,           setPrs]           = useState<PRDict>({});
  const [healthMetrics, setHealthMetrics] = useState<BodyMetric[]>([]);
  // post-workout cool-down
  const [completed, setCompleted] = useState<WorkoutSession | null>(null);
  // auth
  const [token,        setToken]        = useState<string | null>(() => localStorage.getItem("iron_log_token"));
  // When the page is opened via a password-reset / email-verify link, App
  // passes `forceAuthScreen` so we show that flow before the workout UI. Once
  // the user actually signs in, the token transitions from null to a value —
  // at that point we want to bypass the force flag so they don't get stuck
  // looking at the auth screen until a manual refresh.
  const [bypassForceAuth, setBypassForceAuth] = useState(false);
  const [username,     setUsername]     = useState<string | null>(null);
  const [name,         setName]         = useState<string | null>(null);
  const [email,        setEmail]        = useState<string | null>(null);
  const [gender,       setGender]       = useState<string | null>(null);
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null);
  const [heightCm,     setHeightCm]     = useState<number | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [isVerified,   setIsVerified]   = useState(true);
  const [isTrainer,    setIsTrainer]    = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [verifyMsg,    setVerifyMsg]    = useState<string | null>(null);
  const [verifyMsgKind, setVerifyMsgKind] = useState<"ok" | "warn">("ok");
  const [primaryColor, setPrimaryColor] = useState<string>(
    () => localStorage.getItem("gamgee_primary_color") ?? "#28D1FF"
  );
  const [restPrefs, setRestPrefs] = useState<RestPrefs>(() => {
    try {
      const raw = localStorage.getItem("gamgee_rest_prefs");
      if (!raw) return DEFAULT_REST_PREFS;
      const parsed = JSON.parse(raw) as Partial<RestPrefs>;
      const clamp = (n: unknown, fallback: number) => {
        const v = Math.round(Number(n));
        return Number.isFinite(v) && v >= 5 && v <= 3600 ? v : fallback;
      };
      return {
        short:  clamp(parsed.short,  DEFAULT_REST_PREFS.short),
        medium: clamp(parsed.medium, DEFAULT_REST_PREFS.medium),
        long:   clamp(parsed.long,   DEFAULT_REST_PREFS.long),
      };
    } catch {
      return DEFAULT_REST_PREFS;
    }
  });
  const [toneMode, setToneMode] = useState<ToneMode>(
    () => (localStorage.getItem("gamgee_tone") ?? "pro") as ToneMode
  );
  const [wizardTransition, setWizardTransitionState] = useState<WizardTransitionStyle>(() => {
    const raw = localStorage.getItem("gamgee_wizard_transition");
    return raw === "earthquake" || raw === "none"
      ? raw
      : DEFAULT_WIZARD_TRANSITION;
  });
  const updateWizardTransition = useCallback((next: WizardTransitionStyle) => {
    setWizardTransitionState(next);
    localStorage.setItem("gamgee_wizard_transition", next);
  }, []);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(
    () => localStorage.getItem("gamgee_reduced_motion") === "1",
  );
  const updateReducedMotion = useCallback((next: boolean) => {
    setReducedMotionState(next);
    localStorage.setItem("gamgee_reduced_motion", next ? "1" : "0");
  }, []);
  const [weeklyPlan, setWeeklyPlanState] = useState<WeeklyPlan | null>(() => loadWeeklyPlan());
  // buddy/notif/live state
  const [buddies,        setBuddies]        = useState<Buddy[]>([]);
  const [notifications,  setNotifications]  = useState<AppNotification[]>([]);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [liveSessions,   setLiveSessions]   = useState<LiveSession[]>([]);
  const [myLiveSession,  setMyLiveSession]  = useState<LiveSession | null>(null);
  // trainer/chat/regime state
  const [trainerLinks,   setTrainerLinks]   = useState<TrainerLink[]>([]);
  const [assignments,    setAssignments]    = useState<RegimeAssignment[]>([]);
  // Saved workout templates — reusable blueprints the user can load into a
  // session or drop onto a weekday. Owned here so the wizard (load/save) and
  // the regimes tab (manage) share one source of truth.
  const [templates,      setTemplates]      = useState<WorkoutTemplate[]>([]);
  // Manual progression steers, keyed by exercise id. When set (from the
  // diagnostics chart) the analyzer's auto-trend is overridden by the user's
  // target everywhere it's consumed (coach + in-workout APPLY).
  const [progressionOverrides, setProgressionOverrides] = useState<Record<string, ProgressionOverride>>(() => {
    try {
      const raw = localStorage.getItem("gamgee_progression_overrides");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [activeConvId,   setActiveConvId]   = useState<number | null>(null);
  // ChatTab registers a handler here so we can hand it real-time messages
  // from the WebSocket without piping new state through this whole component.
  const chatMessageSubscribersRef = useRef<Set<(m: ChatMessage) => void>>(new Set());
  const [viewedLiveSession, setViewedLiveSession] = useState<LiveSession | null>(null);
  const [liveViewerKey,  setLiveViewerKey]  = useState(0);
  // Bumped whenever the user creates or deletes a custom exercise; forces the
  // wizards and tabs that read ALL_EX/EM to re-render against the mutated catalog.
  const [, setCustomExBump] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => subscribeCustomExercises(() => setCustomExBump(v => v + 1)), []);

  // A ?conv=<id> URL param (set by push-notification click-throughs for
  // chat messages) deep-links straight to that conversation. Read it once on
  // mount, then strip it so a manual refresh doesn't keep yanking the user
  // back into the same thread.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convRaw = params.get("conv");
    if (!convRaw) return;
    const convId = Number.parseInt(convRaw, 10);
    if (Number.isFinite(convId)) {
      setActiveConvId(convId);
    }
    params.delete("conv");
    const qs = params.toString();
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", next);
  }, []);

  const setWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    saveWeeklyPlan(plan);
    setWeeklyPlanState(plan);
  }, []);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const authFetch = useCallback((url: string, opts: RequestInit = {}) =>
    fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${tokenRef.current ?? ""}`, ...(opts.headers as Record<string, string> ?? {}) },
    }).then(res => {
      if (res.status === 401) { localStorage.removeItem("iron_log_token"); setToken(null); }
      return res;
    }), []);

  const refreshTemplates = useCallback(async () => {
    try { setTemplates(await listTemplates(authFetch)); } catch { /* ignore */ }
  }, [authFetch]);

  /** Persist a new template and refresh the list. Returns the saved row (or
   * null on failure) so callers can surface a confirmation. */
  const saveTemplate = useCallback(async (draft: import("./types").WorkoutTemplateDraft) => {
    const created = await createTemplate(authFetch, draft);
    if (created) setTemplates(prev => [created, ...prev]);
    return created;
  }, [authFetch]);

  /** Overwrite an existing template (name / focus / exercises / config) and
   * mirror the change into local state. Returns the saved row or null. */
  const editTemplate = useCallback(async (id: number, draft: import("./types").WorkoutTemplateDraft) => {
    const updated = await updateTemplate(authFetch, id, draft);
    if (updated) setTemplates(prev => prev.map(t => (t.id === id ? updated : t)));
    return updated;
  }, [authFetch]);

  const removeTemplate = useCallback(async (id: number) => {
    const ok = await deleteTemplate(authFetch, id);
    if (ok) setTemplates(prev => prev.filter(t => t.id !== id));
    return ok;
  }, [authFetch]);

  useEffect(() => {
    localStorage.setItem("gamgee_progression_overrides", JSON.stringify(progressionOverrides));
  }, [progressionOverrides]);

  /** Set (or clear, with null) the manual steer for one exercise. */
  const setProgressionOverride = useCallback((exId: string, override: ProgressionOverride | null) => {
    setProgressionOverrides(prev => {
      const next = { ...prev };
      if (override && Number.isFinite(override.weight) && override.weight > 0) next[exId] = override;
      else delete next[exId];
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primaryColor);
    localStorage.setItem("gamgee_primary_color", primaryColor);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = primaryColor;
  }, [primaryColor]);

  // Tag the root with the platform so platform-specific motion (e.g.
  // back-gesture sweep direction) can key off CSS attribute selectors.
  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const platform = /Android/i.test(ua) ? "android" : /iPad|iPhone|iPod/i.test(ua) ? "ios" : "other";
    document.documentElement.setAttribute("data-platform", platform);
  }, []);

  useEffect(() => {
    if (reducedMotion) document.documentElement.setAttribute("data-reduced-motion", "1");
    else               document.documentElement.removeAttribute("data-reduced-motion");
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem("gamgee_rest_prefs", JSON.stringify(restPrefs));
  }, [restPrefs]);

  const updateRestPrefs = useCallback((next: Partial<RestPrefs>) => {
    setRestPrefs(prev => {
      const merged: RestPrefs = {
        short:  next.short  ?? prev.short,
        medium: next.medium ?? prev.medium,
        long:   next.long   ?? prev.long,
      };
      const body: Record<string, number> = {};
      if (next.short  !== undefined) body.rest_short_seconds  = merged.short;
      if (next.medium !== undefined) body.rest_medium_seconds = merged.medium;
      if (next.long   !== undefined) body.rest_long_seconds   = merged.long;
      if (Object.keys(body).length) {
        authFetch("/api/auth/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => { /* best-effort; localStorage already updated */ });
      }
      return merged;
    });
  }, [authFetch]);

  useEffect(() => {
    localStorage.setItem("gamgee_tone", toneMode);
  }, [toneMode]);

  useEffect(() => {
    sessionStorage.setItem("gamgee_active_tab", tab);
  }, [tab]);

  // Wipe per-user state whenever the token goes away (manual logout or 401).
  // Without this, the next user on this device (or this user after a token
  // refresh) momentarily sees the previous account's buddies/notifications/
  // conversations/etc. The Workbox `api-cache` and the localStorage-backed
  // weekly plan are flushed for the same reason.
  useEffect(() => {
    if (token) return;
    setUsername(null);
    setName(null);
    setEmail(null);
    setGender(null);
    setIsAdmin(false);
    setIsVerified(true);
    setIsTrainer(false);
    setCurrentUserId(null);
    setHistory([]);
    setPrs({});
    setHealthMetrics([]);
    setWeeklyPlanState(null);
    setBuddies([]);
    setNotifications([]);
    setUnreadCount(0);
    setLiveSessions([]);
    setMyLiveSession(null);
    setViewedLiveSession(null);
    setTrainerLinks([]);
    setAssignments([]);
    setConversations([]);
    setTemplates([]);
    setProgressionOverrides({});
    setActiveConvId(null);
    clearWeeklyPlan();
    if (typeof caches !== "undefined") {
      caches.delete("api-cache").catch(() => { /* best-effort */ });
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    authFetch("/api/workouts")
      .then(r => r.json()).then((data: WorkoutSession[]) => setHistory(data)).catch(() => {});
    authFetch("/api/prs")
      .then(r => r.json()).then((data: PersonalRecordAPI[]) => {
        const dict: PRDict = {};
        data.forEach(pr => { dict[pr.exercise_id] = pr; });
        setPrs(dict);
      }).catch(() => {});
    authFetch("/api/auth/me")
      .then(r => r.json()).then((d: { id?: number; username: string; name?: string | null; email?: string | null; gender?: string | null; bodyweight_kg?: number | null; height_cm?: number | null; primary_color?: string | null; is_admin?: boolean; is_verified?: boolean; is_trainer?: boolean; rest_short_seconds?: number | null; rest_medium_seconds?: number | null; rest_long_seconds?: number | null }) => {
        setUsername(d.username);
        setName(d.name ?? null);
        setEmail(d.email ?? null);
        setGender(d.gender ?? null);
        setBodyweightKg(d.bodyweight_kg ?? null);
        setHeightCm(d.height_cm ?? null);
        setIsAdmin(d.is_admin ?? false);
        setIsVerified(d.is_verified ?? true);
        setIsTrainer(d.is_trainer ?? false);
        setCurrentUserId(d.id ?? null);
        if (d.primary_color) setPrimaryColor(d.primary_color);
        const clamp = (n: number | null | undefined, fallback: number) =>
          n != null && Number.isFinite(n) && n >= 5 && n <= 3600 ? Math.round(n) : fallback;
        if (d.rest_short_seconds != null || d.rest_medium_seconds != null || d.rest_long_seconds != null) {
          setRestPrefs(prev => ({
            short:  clamp(d.rest_short_seconds,  prev.short),
            medium: clamp(d.rest_medium_seconds, prev.medium),
            long:   clamp(d.rest_long_seconds,   prev.long),
          }));
        }
      }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!active || !startTs) return;
    const id = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    return () => clearInterval(id);
  }, [active, startTs]);

  // ── Buddy / notifications / live polling ──

  const refreshBuddies = useCallback(async () => {
    try {
      const r = await authFetch("/api/buddies");
      if (r.ok) setBuddies(await r.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  const refreshNotifications = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        authFetch("/api/notifications?limit=30"),
        authFetch("/api/notifications/unread-count"),
      ]);
      if (listRes.ok) setNotifications(await listRes.json());
      if (countRes.ok) setUnreadCount((await countRes.json()).count ?? 0);
    } catch { /* ignore */ }
  }, [authFetch]);

  const refreshLive = useCallback(async () => {
    try {
      const r = await authFetch("/api/live-sessions");
      if (!r.ok) return;
      const sessions: LiveSession[] = await r.json();
      setLiveSessions(sessions);
      // Identify my session by owner_username match
      const mine = sessions.find(s => s.owner_username === username) ?? null;
      setMyLiveSession(mine);
      // If we're viewing a session, refresh its detail too
      setViewedLiveSession(prev => prev ? (sessions.find(s => s.id === prev.id) ?? prev) : prev);
      setLiveViewerKey(k => k + 1);
    } catch { /* ignore */ }
  }, [authFetch, username]);

  const refreshTrainers = useCallback(async () => {
    try {
      const [linksRes, asnRes] = await Promise.all([
        authFetch("/api/trainers/links/mine"),
        authFetch("/api/assignments/mine"),
      ]);
      if (linksRes.ok) setTrainerLinks(await linksRes.json());
      if (asnRes.ok) setAssignments(await asnRes.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  const refreshConversations = useCallback(async () => {
    try {
      const r = await authFetch("/api/chat/conversations");
      if (r.ok) setConversations(await r.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  const goToChat = useCallback((conversationId?: number) => {
    setTab("chat");
    if (conversationId != null) setActiveConvId(conversationId);
  }, []);

  const openChatWith = useCallback(async (otherUsername: string) => {
    try {
      const r = await authFetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: otherUsername }),
      });
      if (r.ok) {
        const conv: Conversation = await r.json();
        await refreshConversations();
        setActiveConvId(conv.id);
        setTab("chat");
      }
    } catch { /* ignore */ }
  }, [authFetch, refreshConversations]);

  const applyAssignedRegime = useCallback((a: RegimeAssignment) => {
    const plan: WeeklyPlan = {};
    (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).forEach(k => {
      const d = a.regime.days?.[k];
      if (d) plan[k] = { focus: d.focus, exerciseIds: d.exerciseIds, enabled: d.enabled };
    });
    setWeeklyPlan(plan);
    setTab("regimes");
  }, [setWeeklyPlan]);

  useEffect(() => {
    if (!token) return;
    refreshBuddies();
    refreshNotifications();
    refreshLive();
    refreshTrainers();
    refreshConversations();
    refreshTemplates();
    // The SSE stream pushes changes the moment they happen; this longer
    // interval is just a safety net in case the EventSource is disconnected
    // (proxy timeout, sleeping tab waking up, etc.).
    const id = setInterval(() => {
      refreshNotifications();
      refreshLive();
      refreshBuddies();
      refreshTrainers();
      refreshConversations();
    }, 90_000);
    return () => clearInterval(id);
  }, [token, refreshBuddies, refreshNotifications, refreshLive, refreshTrainers, refreshConversations, refreshTemplates]);

  useEventStream(token, useCallback((ev) => {
    if (ev.type === "notification") {
      refreshNotifications();
    } else if (ev.type === "buddy") {
      refreshBuddies();
    } else if (ev.type === "live") {
      refreshLive();
    } else if (ev.type === "trainer") {
      refreshTrainers();
    }
  }, [refreshNotifications, refreshBuddies, refreshLive, refreshTrainers]));

  // Chat traffic flows over its own WebSocket so threads can update without
  // refetching: ``message`` events carry the full payload, ``conversation``
  // and ``read`` events tell us to re-pull the conversation list so unread
  // counts and last-message previews stay accurate.
  useChatSocket(token, useCallback((ev) => {
    if (ev.type === "message") {
      chatMessageSubscribersRef.current.forEach(fn => fn(ev.data));
      refreshConversations();
    } else if (ev.type === "conversation" || ev.type === "read") {
      refreshConversations();
    }
  }, [refreshConversations]));

  // ── Live broadcast: progress + set events ──
  // Track which sets have already been broadcast so we only POST each one once.
  const broadcastSetsRef = useRef<Set<string>>(new Set());
  // Reset the dedupe set when a new live session starts.
  useEffect(() => {
    broadcastSetsRef.current = new Set();
  }, [myLiveSession?.id]);

  // Register the service worker once we have a session, so push messages can
  // wake the browser even when no tab is open. Service-worker click events
  // postMessage back here to switch to the Notifications tab.
  useEffect(() => {
    if (!token) return;
    registerServiceWorker();
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "open-notifications") {
        setTab("notifications");
        refreshNotifications();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [token, refreshNotifications]);

  // Sync owner_sets_done with active workout's completed sets in real time
  useEffect(() => {
    if (!myLiveSession || myLiveSession.status !== "active") return;
    if (!active) return;
    // Find newly-completed sets that we haven't broadcast yet.
    const newlyDone: Array<{ exId: string; exName: string; setIndex: number; weight: number | null; reps: number | null; }> = [];
    let lastDone: { exId: string; exName: string; setIndex: number; weight: number | null; reps: number | null; } | null = null;
    exercises.forEach(ex => {
      ex.sets.forEach((s, i) => {
        if (!s.done) return;
        const key = `${ex.uid}_${i}`;
        const w = s.weight ? parseFloat(s.weight) : null;
        const r = s.reps ? parseInt(s.reps, 10) : null;
        const entry = { exId: ex.id, exName: ex.name, setIndex: i, weight: isNaN(w as number) ? null : w, reps: isNaN(r as number) ? null : r };
        lastDone = entry;
        if (!broadcastSetsRef.current.has(key)) {
          broadcastSetsRef.current.add(key);
          newlyDone.push(entry);
        }
      });
    });
    const doneSetsNow = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
    const totalSetsPlanned = exercises.reduce((a, ex) => a + ex.sets.length, 0);
    const currentEx = exercises.find(ex => ex.sets.some(s => !s.done)) ?? exercises[exercises.length - 1];
    const currentSetIdx = currentEx ? currentEx.sets.findIndex(s => !s.done) : -1;

    // Send each newly-completed set as its own event (trainer timeline).
    newlyDone.forEach(ev => {
      authFetch(`/api/live-sessions/${myLiveSession.id}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: ev.exId, exercise_name: ev.exName, set_index: ev.setIndex,
          weight: ev.weight, reps: ev.reps,
        }),
      }).catch(() => {});
    });

    if (doneSetsNow === myLiveSession.owner_sets_done && newlyDone.length === 0) return;
    const handle = setTimeout(() => {
      authFetch(`/api/live-sessions/${myLiveSession.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets_done: doneSetsNow,
          current_exercise_id: currentEx?.id ?? null,
          current_exercise_name: currentEx?.name ?? null,
          current_set_index: currentSetIdx >= 0 ? currentSetIdx : null,
          last_weight: lastDone?.weight ?? null,
          last_reps: lastDone?.reps ?? null,
          total_sets_planned: totalSetsPlanned,
          total_exercises_planned: exercises.length,
        }),
      }).then(r => r.ok ? r.json() : null).then((s: LiveSession | null) => {
        if (s) {
          setMyLiveSession(s);
          setLiveSessions(prev => prev.map(p => p.id === s.id ? s : p));
        }
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(handle);
  }, [exercises, active, myLiveSession, authFetch]);

  const startLiveSession = useCallback(async (note: string) => {
    const r = await authFetch("/api/live-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), focus, note: note || null }),
    });
    if (r.ok) {
      const session: LiveSession = await r.json();
      setMyLiveSession(session);
      await refreshLive();
    }
  }, [authFetch, focus, refreshLive]);

  const endLiveSession = useCallback(async () => {
    if (!myLiveSession) return;
    const r = await authFetch(`/api/live-sessions/${myLiveSession.id}/end`, { method: "POST" });
    if (r.ok) {
      setMyLiveSession(null);
      await refreshLive();
    }
  }, [authFetch, myLiveSession, refreshLive]);

  const joinLiveSession = useCallback(async (id: string) => {
    const r = await authFetch(`/api/live-sessions/${id}/join`, { method: "POST" });
    if (r.ok) await refreshLive();
  }, [authFetch, refreshLive]);

  const markNotifRead = useCallback(async (id: number) => {
    await authFetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, [authFetch]);

  const markAllNotifRead = useCallback(async () => {
    await authFetch("/api/notifications/read-all", { method: "POST" });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [authFetch]);

  const deleteNotif = useCallback(async (id: number) => {
    await authFetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications(prev => prev.filter(n => n.id !== id));
    await refreshNotifications();
  }, [authFetch, refreshNotifications]);

  // ── Workout handlers ──

  const startFromWizard = (
    autoFill = false,
    /** Override the configs read from state — used by the RPE-driven prescribe
     * path where we have the freshly-tuned configs in hand and don't want to
     * race React's state commit. */
    configsOverride?: Record<string, import("./types").ExerciseConfig>,
  ) => {
    setWStep(0); setActive(true); setStartTs(Date.now()); setElapsed(0);

    const cardioEx = (slot: CardioPlan["before"]): WorkoutExercise | null => {
      if (!slot) return null;
      const def = ALL_EX.find(e => e.id === slot.exId);
      if (!def) return null;
      return {
        ...def,
        uid: `${def.id}_${Date.now()}_${Math.random()}`,
        sets: [{ weight: String(slot.minutes), reps: "", done: false, prefilled: !!slot.minutes }],
      };
    };

    const configs = configsOverride ?? plannedConfigs;
    const mainExercises: WorkoutExercise[] = planned.map(ex => {
      let initSets: WorkoutSet[] = [{ weight: "", reps: "", done: false }];
      // Regime-driven prescription takes precedence — if the day plan has a
      // config for this exercise (with a max or working weight), lay out
      // warmup ramp + working sets so the user just confirms each set.
      const cfg = configs[ex.id];
      const presc = ex.type === "strength" && !ex.is_assisted ? prescribeExercise(ex.id, cfg) : null;
      if (presc) {
        const warmupSets: WorkoutSet[] = presc.warmup.map(w => ({
          weight: String(w.weight),
          reps: String(w.reps),
          done: false,
          prefilled: true,
          is_warmup: true,
        }));
        const workingSets: WorkoutSet[] = Array.from({ length: presc.working.count }, () => ({
          weight: String(presc.working.weight),
          reps: String(presc.working.reps),
          done: false,
          prefilled: true,
          is_warmup: false,
        }));
        initSets = [...warmupSets, ...workingSets];
      } else if (autoFill) {
        // Pre-populate from saved history: reproduce the last session's set
        // layout with the working sets ramped to the next progression target.
        // Exercises with no history stay blank, like a brand-new lift.
        const ramped = rampedSetsFromHistory(ex.id, ex.type, !!ex.is_assisted, history, progressionOverrides[ex.id]);
        if (ramped) initSets = ramped;
      }
      return { ...ex, uid: `${ex.id}_${Date.now()}_${Math.random()}`, sets: initSets };
    });

    const before = cardioEx(cardio.before);
    const after  = cardioEx(cardio.after);
    setExercises([
      ...(before ? [before] : []),
      ...mainExercises,
      ...(after ? [after] : []),
    ]);
    setPlanned([]);
    setPlannedConfigs({});
    setCardio({ timing: "none", before: null, after: null });
  };

  /** Start the workout after the user finishes the RPE-driven prescribe step.
   * Persists the tuned configs to localStorage so the prescribe screen seeds
   * them next time, then hands off to startFromWizard with the configs as a
   * direct override (sidesteps having to wait for React's state commit). */
  const startFromPrescribe = (configs: Record<string, import("./types").ExerciseConfig>) => {
    setPlannedConfigs(configs);
    setSavedPrescribeConfigs(mergePrescribeConfigs(configs));
    startFromWizard(false, configs);
  };

  const addExercise = (ex: ExerciseDef) =>
    setExercises(p => {
      // An ad-hoc add mid-workout also benefits from history: ramp it from the
      // last session if we've logged it before, otherwise leave it blank.
      const ramped = rampedSetsFromHistory(ex.id, ex.type, !!ex.is_assisted, history, progressionOverrides[ex.id]);
      return [...p, { ...ex, uid: `${ex.id}_${Date.now()}`, sets: ramped ?? [{ weight: "", reps: "", done: false }] }];
    });

  const removeExercise = (uid: string) =>
    setExercises(p => p.filter(e => e.uid !== uid));

  /** Update a single set's weight/reps. The edited set loses its `prefilled`
   * flag so it never gets overwritten again; any *following* sets that are
   * still `prefilled` (and undone) inherit the new value so the suggested
   * chain stays in sync with the user's latest correction. */
  const updateSet = (uid: string, idx: number, field: keyof WorkoutSet, value: string) =>
    setExercises(p => p.map(ex => {
      if (ex.uid !== uid) return ex;
      const sets = ex.sets.map((s, i) => {
        if (i < idx) return s;
        if (i === idx) return { ...s, [field]: value, prefilled: false };
        if (s.done || s.prefilled === false) return s;
        return { ...s, [field]: value, prefilled: true };
      });
      return { ...ex, sets };
    }));

  const toggleSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, done: !s.done } : s) }
    ));

  /** Stamp a per-set perceived effort (1..10) on a working set, or null to
   * clear. Separate from updateSet because rpe is numeric and shouldn't
   * inherit-forward to later prefilled sets the way weight/reps do. */
  const setSetRpe = (uid: string, idx: number, rpe: number | null) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, rpe } : s) }
    ));

  const addSet = (uid: string) =>
    setExercises(p => p.map(ex => {
      if (ex.uid !== uid) return ex;
      // Carry the previous set's weight/reps forward as a suggestion so the
      // user doesn't have to retype values that probably won't change.
      const last = ex.sets[ex.sets.length - 1];
      const seed = last && (last.weight || last.reps)
        ? { weight: last.weight, reps: last.reps, done: false, prefilled: true }
        : { weight: "", reps: "", done: false };
      return { ...ex, sets: [...ex.sets, seed] };
    }));

  const removeSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.filter((_, i) => i !== idx) }
    ));

  /** Apply the analyzer's recommendation to every strength exercise's
   * still-undone working sets in one shot. The on-card APPLY button does the
   * same thing for a single exercise — this is the top-of-workout
   * "PROGRESS ALL" affordance. */
  const applyProgressionAll = () => {
    setExercises(p => p.map(ex => {
      if (ex.type !== "strength" || ex.is_assisted) return ex;
      const a = analyzeEx(ex.id, history, progressionOverrides[ex.id]);
      if (!a) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => (s.done || s.is_warmup)
          ? s
          : { ...s, weight: String(a.nextWeight), reps: String(a.nextReps), prefilled: true }
        ),
      };
    }));
  };

  const isNewPr = (exId: string, weight: string): boolean => {
    const w = parseFloat(weight);
    if (isNaN(w)) return false;
    const def = ALL_EX.find(e => e.id === exId);
    // Assisted-machine sets log an offset from bodyweight (≤ 0); regular sets
    // log a positive load. A 0 entry on an assisted exercise is a real PR (the
    // user did a clean rep at bodyweight), so don't filter it out there.
    if (def?.is_assisted ? w > 0 : w <= 0) return false;
    return !prs[exId] || w > prs[exId].weight;
  };

  const loadTodayPlan = (dayPlan: DayPlan) => {
    setFocus(dayPlan.focus);
    // Capture the day's per-exercise prescription so startFromWizard can lay
    // out warmup + working sets. Empty object when the user hasn't configured
    // anything, in which case we fall back to a blank single set.
    setPlannedConfigs(dayPlan.exerciseConfig ?? {});
    if (dayPlan.exerciseIds.length > 0) {
      const exs = dayPlan.exerciseIds
        .map(id => ALL_EX.find(e => e.id === id))
        .filter((e): e is ExerciseDef => !!e);
      setPlanned(exs);
    } else {
      const focusDef     = getFocusDef(dayPlan.focus);
      const pool         = focusDef?.exIds ?? [];
      const focusHistory = history.filter(s => s.focus === dayPlan.focus);
      const avgSize      = focusHistory.length > 0
        ? Math.round(focusHistory.reduce((sum, s) => sum + s.exercises.length, 0) / focusHistory.length)
        : 5;
      const target = Math.max(4, Math.min(8, avgSize));
      const freq: Record<string, number> = {};
      focusHistory.forEach(s => s.exercises.forEach(ex => { freq[ex.id] = (freq[ex.id] ?? 0) + 1; }));
      const effectivePool = pool.length >= 3
        ? pool
        : ALL_EX.filter(e => e.type !== "cardio").map(e => e.id);
      const picked = effectivePool
        .map(id => ({ id, score: (freq[id] ?? 0) * 0.4 + Math.random() }))
        .sort((a, b) => b.score - a.score)
        .slice(0, target)
        .map(c => ALL_EX.find(e => e.id === c.id))
        .filter((e): e is ExerciseDef => !!e);
      setPlanned(picked);
    }
    setWStep(4);
  };

  /** Load a saved template into the wizard build step. A template is just a
   * named DayPlan, so we hand it straight to loadTodayPlan (focus +
   * exerciseIds + per-exercise config, then jump to the build screen). */
  const loadTemplate = (tpl: WorkoutTemplate) => {
    loadTodayPlan({
      focus: tpl.focus || focus || "full",
      exerciseIds: tpl.exercise_ids,
      enabled: true,
      exerciseConfig: tpl.exercise_config,
    });
  };

  const finishWorkout = () => {
    if (!startTs) return;
    const dur  = Date.now() - startTs;
    // Strip the `prefilled` flag — it's a UI-only marker that doesn't belong
    // in the persisted history.
    const done = exercises
      .map(ex => ({
        ...ex,
        sets: ex.sets.filter(s => s.done).map(s => ({
          weight: s.weight, reps: s.reps, done: s.done,
          ...(s.is_warmup ? { is_warmup: true } : {}),
          ...(typeof s.rpe === "number" ? { rpe: s.rpe } : {}),
        })),
      }))
      .filter(ex => ex.sets.length > 0);
    const session: WorkoutSession = {
      id: crypto.randomUUID(), date: new Date().toISOString(), duration: dur, focus, exercises: done, rpe: null,
    };
    const newPrs: PRDict = { ...prs };
    done.forEach(ex => ex.sets.forEach(s => {
      // Warmup sets are explicitly excluded from PR comparisons — a 40% ramp
      // shouldn't dethrone a real PR.
      if (s.is_warmup) return;
      const wt = parseFloat(s.weight), r = parseInt(s.reps) || 0;
      if (isNaN(wt)) return;
      // Assisted: 0 = at bodyweight (valid PR), positive disallowed (covered by
      // the separate weighted-variant exercises). Everything else needs > 0.
      if (ex.is_assisted ? wt > 0 : wt <= 0) return;
      const cur = newPrs[ex.id];
      if (!cur || wt > cur.weight || (wt === cur.weight && r > (cur.reps || 0)))
        newPrs[ex.id] = { weight: wt, reps: r, date: session.date, name: ex.name, isCardio: ex.type === "cardio" };
    }));

    authFetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(session) })
      .then(() => refreshNotifications()).catch(() => {});
    Object.entries(newPrs).forEach(([exercise_id, pr]) => {
      authFetch(`/api/prs/${exercise_id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pr, exercise_id }) }).catch(() => {});
    });
    // If broadcasting live, auto-end the live session when workout finishes.
    if (myLiveSession && myLiveSession.status === "active") {
      authFetch(`/api/live-sessions/${myLiveSession.id}/end`, { method: "POST" })
        .then(() => { setMyLiveSession(null); refreshLive(); }).catch(() => {});
    }

    setHistory([session, ...history].slice(0, 60));
    setPrs(newPrs);
    setActive(false); setExercises([]); setStartTs(null); setElapsed(0);
    setWStep(0); setPlanned([]); setFocus(null);
    setCardio({ timing: "none", before: null, after: null });
    setCompleted(session);
  };

  const dismissCompleted = () => {
    setCompleted(null);
    setTab("history");
  };

  /** Save the post-workout RPE the user picks on the completion screen.
   * Writes through to the backend via PUT /api/workouts/{id}, then mirrors
   * the value into local history so the next session's analyzer sees it. */
  const saveSessionRpe = useCallback((sessionId: string, rpe: number | null) => {
    setCompleted(prev => prev && prev.id === sessionId ? { ...prev, rpe } : prev);
    setHistory(h => h.map(w => w.id === sessionId ? { ...w, rpe } : w));
    const session = (completed && completed.id === sessionId) ? completed : history.find(w => w.id === sessionId);
    if (!session) return;
    authFetch(`/api/workouts/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...session, rpe }),
    }).catch(() => { /* best-effort — local state is already up to date */ });
  }, [authFetch, completed, history]);

  // ── History management ──

  const deleteWorkout = (id: string) => {
    authFetch(`/api/workouts/${id}`, { method: "DELETE" }).catch(() => {});
    setHistory(h => h.filter(w => w.id !== id));
  };

  const updateWorkout = (session: WorkoutSession) => {
    authFetch(`/api/workouts/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    }).catch(() => {});
    setHistory(h => h.map(w => w.id === session.id ? session : w));
  };

  const deletePr = (exerciseId: string) => {
    authFetch(`/api/prs/${exerciseId}`, { method: "DELETE" }).catch(() => {});
    setPrs(p => { const n = { ...p }; delete n[exerciseId]; return n; });
  };

  const fetchHealthMetrics = (type: string): Promise<void> =>
    authFetch(`/api/health?metric_type=${type}`)
      .then(r => r.json())
      .then((data: BodyMetric[]) => setHealthMetrics(data))
      .catch(() => {});

  // ── Derived ──
  const doneSets   = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const coachCount = ALL_EX.filter(ex => !ex.is_assisted && analyzeEx(ex.id, history, progressionOverrides[ex.id]) !== null).length;

  const logout = () => { localStorage.removeItem("iron_log_token"); setToken(null); };

  const resendVerification = async () => {
    setVerifyMsg(null);
    try {
      const res = await authFetch("/api/auth/resend-verification-me", { method: "POST" });
      if (res.ok) {
        setVerifyMsgKind("ok");
        setVerifyMsg("Verification email sent — check your inbox.");
      } else {
        setVerifyMsgKind("warn");
        setVerifyMsg("Couldn't send the verification email. Try again in a moment.");
      }
    } catch {
      setVerifyMsgKind("warn");
      setVerifyMsg("Network error while requesting a verification email.");
    }
  };

  const [backFxId, setBackFxId] = useState<number | null>(null);
  useEffect(() => {
    if (backFxId == null) return;
    const t = window.setTimeout(() => setBackFxId(null), 500);
    return () => window.clearTimeout(t);
  }, [backFxId]);

  useMobileBackGesture(!!token, () => {
    let consumed = false;
    if (completed)                              { setCompleted(null); setTab("history"); consumed = true; }
    else if (tab === "chat" && activeConvId != null) { setActiveConvId(null); consumed = true; }
    else if (tab !== "workout")                 { setTab("workout"); consumed = true; }
    else if (active)                            { consumed = true; }
    else if (wStep === 6 || wStep === 7)        { setWStep(1); consumed = true; }
    else if (wStep > 0)                         { setWStep(wStep - 1); consumed = true; }
    if (consumed) setBackFxId(Date.now() + Math.random());
    return consumed;
  });

  if (!token || (forceAuthScreen && !bypassForceAuth))
    return (
      <ToneProvider value={toneMode}>
        <AuthScreen
          onLogin={(t) => { setBypassForceAuth(true); setToken(t); }}
          initialView={initialAuthView}
          initialToken={initialAuthToken}
        />
      </ToneProvider>
    );

  return (
  <ToneProvider value={toneMode}>
    <OnboardingProvider historyLen={history.length}>
    <OnboardingWelcome />
    <div className="app">
      <AppHeader
        active={active} elapsed={elapsed} wStep={wStep}
        historyCount={history.length} prCount={Object.keys(prs).length} coachCount={coachCount}
        buddyCount={buddies.filter(b => b.status === "accepted").length}
        unreadNotif={unreadCount}
        unreadChat={conversations.reduce((a, c) => a + c.unread_count, 0)}
        isTrainer={isTrainer}
        traineeCount={trainerLinks.filter(l => l.role === "trainer" && l.status === "accepted").length}
        assignmentCount={assignments.filter(a => a.trainee_id === currentUserId).length}
        tab={tab} setTab={setTab} onLogout={logout} isAdmin={isAdmin}
        onLogoClick={() => { setTab("workout"); setWStep(0); }}
        onOpenFeedback={() => setFeedbackOpen(true)}
        notifBell={
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markNotifRead}
            onMarkAll={markAllNotifRead}
            onDelete={deleteNotif}
            onGoToBuddies={() => setTab("buddies")}
            onGoToChat={goToChat}
            onViewAll={() => setTab("notifications")}
            refresh={refreshNotifications}
          />
        }
      />
      {active && <StatsBar exercises={exercises} doneSets={doneSets} />}
      {!isVerified && (
        <div className={`verify-banner ${verifyMsgKind === "warn" ? "verify-banner-warn" : ""}`} role="status">
          <span>
            Your email isn't verified yet.
            {email ? <> We sent a confirmation link to <strong>{email}</strong>.</> : null}
          </span>
          <button className="verify-banner-btn" onClick={resendVerification}>
            Resend verification email
          </button>
          {verifyMsg && <small className={`verify-banner-msg ${verifyMsgKind === "ok" ? "ok" : "warn"}`}>{verifyMsg}</small>}
        </div>
      )}
      <div className={`content${
        ["chat", "coaching", "trainees", "regimes"].includes(tab) ? " content-wide" : ""
      }`}>
        {completed && (
          <WorkoutComplete
            session={completed}
            onDone={dismissCompleted}
            onSetRpe={rpe => saveSessionRpe(completed.id, rpe)}
          />
        )}
        {!completed && tab === "workout" && (
          <WorkoutTab
            active={active} wStep={wStep} setWStep={setWStep}
            focus={focus} setFocus={setFocus}
            cardio={cardio} setCardio={setCardio}
            planned={planned} setPlanned={setPlanned}
            exercises={exercises} prs={prs} history={history}
            doneSets={doneSets}
            weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} onLoadToday={loadTodayPlan}
            templates={templates} onSaveTemplate={saveTemplate} onLoadTemplate={loadTemplate}
            onUpdateTemplate={editTemplate} onDeleteTemplate={removeTemplate}
            progressionOverrides={progressionOverrides}
            restPrefs={restPrefs}
            bodyweight={bodyweightKg}
            wizardTransition={wizardTransition}
            authFetch={authFetch}
            startFromWizard={startFromWizard}
            prescribeInitialConfigs={{ ...savedPrescribeConfigs, ...plannedConfigs }}
            startFromPrescribe={startFromPrescribe}
            addExercise={addExercise} removeExercise={removeExercise}
            updateSet={updateSet} setSetRpe={setSetRpe} toggleSet={toggleSet} addSet={addSet} removeSet={removeSet}
            isNewPr={isNewPr} finishWorkout={finishWorkout}
            applyProgressionAll={applyProgressionAll}
          />
        )}
        {!completed && tab === "history" && <HistoryTab history={history} prs={prs} bodyweight={bodyweightKg} onDelete={deleteWorkout} onUpdate={updateWorkout} />}
        {!completed && tab === "prs"     && <PRsTab prs={prs} bodyweight={bodyweightKg} onDelete={deletePr} />}
        {!completed && tab === "buddies" && (
          <BuddiesTab
            authFetch={authFetch}
            buddies={buddies}
            liveSessions={liveSessions}
            myLiveSession={myLiveSession}
            workoutActive={active}
            workoutFocus={focus}
            workoutDoneSets={doneSets}
            refreshBuddies={refreshBuddies}
            refreshLive={refreshLive}
            startLiveSession={startLiveSession}
            endLiveSession={endLiveSession}
            joinLiveSession={joinLiveSession}
          />
        )}
        {!completed && tab === "notifications" && (
          <NotificationsTab
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markNotifRead}
            onMarkAll={markAllNotifRead}
            onDelete={deleteNotif}
            onGoToBuddies={() => setTab("buddies")}
            onGoToChat={goToChat}
            refresh={refreshNotifications}
            authFetch={authFetch}
          />
        )}
        {!completed && tab === "chat" && (
          <ChatTab
            authFetch={authFetch}
            conversations={conversations}
            refreshConversations={refreshConversations}
            activeConvId={activeConvId}
            setActiveConvId={setActiveConvId}
            currentUserId={currentUserId}
            buddies={buddies}
            trainerLinks={trainerLinks}
            messageSubscribersRef={chatMessageSubscribersRef}
          />
        )}
        {!completed && tab === "coaching" && (
          <CoachingTab
            authFetch={authFetch}
            trainerLinks={trainerLinks}
            assignments={assignments}
            refreshTrainers={refreshTrainers}
            onOpenChat={openChatWith}
            onApplyRegime={applyAssignedRegime}
          />
        )}
        {!completed && tab === "trainees" && isTrainer && (
          <TraineesTab
            authFetch={authFetch}
            trainerLinks={trainerLinks}
            liveSessions={liveSessions}
            refreshTrainers={refreshTrainers}
            onOpenChat={openChatWith}
            onOpenLive={(s) => { setViewedLiveSession(s); setLiveViewerKey(k => k + 1); }}
          />
        )}
        {!completed && tab === "regimes" && (
          <RegimesTab
            authFetch={authFetch}
            weeklyPlan={weeklyPlan}
            setWeeklyPlan={setWeeklyPlan}
            templates={templates}
            onDeleteTemplate={removeTemplate}
          />
        )}
        {!completed && tab === "health"  && <HealthTab healthMetrics={healthMetrics} fetchHealthMetrics={fetchHealthMetrics} authFetch={authFetch} />}
        {!completed && tab === "coach"     && <CoachTab history={history} overrides={progressionOverrides} onSetOverride={setProgressionOverride} onUpdateSession={updateWorkout} />}
        {!completed && tab === "exercises" && <ExercisesTab />}
        {!completed && tab === "profile"   && <ProfileTab username={username} name={name} history={history} isAdmin={isAdmin} onOpenSettings={() => setTab("settings")} />}
        {!completed && tab === "settings"  && <SettingsTab name={name} email={email} gender={gender} bodyweightKg={bodyweightKg} heightCm={heightCm} token={token} primaryColor={primaryColor} onColorChange={setPrimaryColor} onProfileUpdate={(n, e, g, bw, ht) => { setName(n); setEmail(e); setGender(g); setBodyweightKg(bw); setHeightCm(ht); }} toneMode={toneMode} onToneChange={setToneMode} restPrefs={restPrefs} onRestPrefsChange={updateRestPrefs} wizardTransition={wizardTransition} onWizardTransitionChange={updateWizardTransition} reducedMotion={reducedMotion} onReducedMotionChange={updateReducedMotion} authFetch={authFetch} />}
      </div>
      {feedbackOpen && <FeedbackModal authFetch={authFetch} onClose={() => setFeedbackOpen(false)} />}
      {viewedLiveSession && (
        <LiveSessionViewer
          session={viewedLiveSession}
          authFetch={authFetch}
          onClose={() => setViewedLiveSession(null)}
          refreshKey={liveViewerKey}
        />
      )}
      {backFxId != null && <div key={backFxId} className="back-gesture-fx" aria-hidden />}
    </div>
    </OnboardingProvider>
  </ToneProvider>
  );
}
