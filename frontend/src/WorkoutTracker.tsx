import { useState, useEffect, useCallback, useRef } from "react";
import "./WorkoutTracker.css";
import type {
  CardioPlan, DayPlan, ExerciseDef, WorkoutExercise, WorkoutSession,
  PersonalRecordAPI, PRDict, WorkoutSet, BodyMetric, WeeklyPlan,
  Buddy, AppNotification, LiveSession,
  TrainerLink, RegimeAssignment, Conversation,
} from "./types";
import { loadWeeklyPlan, saveWeeklyPlan } from "./data/weeklyPlan";
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
import { analyzeEx } from "./analysis";
import { useMobileBackGesture } from "./hooks/useMobileBackGesture";
import { useEventStream } from "./hooks/useEventStream";
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
    const valid  = ["workout", "history", "prs", "buddies", "health", "coach", "exercises", "notifications", "profile", "chat", "coaching", "trainees", "regimes"];
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
  const [cardio,    setCardio]    = useState<CardioPlan>({ timing: "none", before: null, after: null });
  const [planned,   setPlanned]   = useState<ExerciseDef[]>([]);
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
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [isVerified,   setIsVerified]   = useState(true);
  const [isTrainer,    setIsTrainer]    = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [verifyMsg,    setVerifyMsg]    = useState<string | null>(null);
  const [verifyMsgKind, setVerifyMsgKind] = useState<"ok" | "warn">("ok");
  const [primaryColor, setPrimaryColor] = useState<string>(
    () => localStorage.getItem("gamgee_primary_color") ?? "#28D1FF"
  );
  const [toneMode, setToneMode] = useState<ToneMode>(
    () => (localStorage.getItem("gamgee_tone") ?? "pro") as ToneMode
  );
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
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [activeConvId,   setActiveConvId]   = useState<number | null>(null);
  const [viewedLiveSession, setViewedLiveSession] = useState<LiveSession | null>(null);
  const [liveViewerKey,  setLiveViewerKey]  = useState(0);
  // Bumped whenever the user creates or deletes a custom exercise; forces the
  // wizards and tabs that read ALL_EX/EM to re-render against the mutated catalog.
  const [, setCustomExBump] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => subscribeCustomExercises(() => setCustomExBump(v => v + 1)), []);

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

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primaryColor);
    localStorage.setItem("gamgee_primary_color", primaryColor);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = primaryColor;
  }, [primaryColor]);

  useEffect(() => {
    localStorage.setItem("gamgee_tone", toneMode);
  }, [toneMode]);

  useEffect(() => {
    sessionStorage.setItem("gamgee_active_tab", tab);
  }, [tab]);

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
      .then(r => r.json()).then((d: { id?: number; username: string; name?: string | null; email?: string | null; primary_color?: string | null; is_admin?: boolean; is_verified?: boolean; is_trainer?: boolean }) => {
        setUsername(d.username);
        setName(d.name ?? null);
        setEmail(d.email ?? null);
        setIsAdmin(d.is_admin ?? false);
        setIsVerified(d.is_verified ?? true);
        setIsTrainer(d.is_trainer ?? false);
        setCurrentUserId(d.id ?? null);
        if (d.primary_color) setPrimaryColor(d.primary_color);
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
  }, [token, refreshBuddies, refreshNotifications, refreshLive, refreshTrainers, refreshConversations]);

  useEventStream(token, useCallback((ev) => {
    if (ev.type === "notification") {
      refreshNotifications();
    } else if (ev.type === "buddy") {
      refreshBuddies();
    } else if (ev.type === "live") {
      refreshLive();
    } else if (ev.type === "trainer") {
      refreshTrainers();
    } else if (ev.type === "chat") {
      refreshConversations();
    }
  }, [refreshNotifications, refreshBuddies, refreshLive, refreshTrainers, refreshConversations]));

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

  const startFromWizard = (autoFill = false) => {
    setWStep(0); setActive(true); setStartTs(Date.now()); setElapsed(0);

    const cardioEx = (slot: CardioPlan["before"]): WorkoutExercise | null => {
      if (!slot) return null;
      const def = ALL_EX.find(e => e.id === slot.exId);
      if (!def) return null;
      return {
        ...def,
        uid: `${def.id}_${Date.now()}_${Math.random()}`,
        sets: [{ weight: String(slot.minutes), reps: "", done: false }],
      };
    };

    const mainExercises: WorkoutExercise[] = planned.map(ex => {
      let initSets: WorkoutSet[] = [{ weight: "", reps: "", done: false }];
      if (autoFill) {
        const lastSession = history.find(s => s.exercises.some(e => e.id === ex.id));
        if (lastSession) {
          const lastEx = lastSession.exercises.find(e => e.id === ex.id)!;
          if (lastEx.sets.length > 0)
            initSets = lastEx.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false }));
        }
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
    setCardio({ timing: "none", before: null, after: null });
  };

  const addExercise = (ex: ExerciseDef) =>
    setExercises(p => [...p, { ...ex, uid: `${ex.id}_${Date.now()}`, sets: [{ weight: "", reps: "", done: false }] }]);

  const removeExercise = (uid: string) =>
    setExercises(p => p.filter(e => e.uid !== uid));

  const updateSet = (uid: string, idx: number, field: keyof WorkoutSet, value: string) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) }
    ));

  const toggleSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, done: !s.done } : s) }
    ));

  const addSet = (uid: string) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: [...ex.sets, { weight: "", reps: "", done: false }] }
    ));

  const removeSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.filter((_, i) => i !== idx) }
    ));

  const isNewPr = (exId: string, weight: string): boolean => {
    const w = parseFloat(weight);
    return !isNaN(w) && w > 0 && (!prs[exId] || w > prs[exId].weight);
  };

  const loadTodayPlan = (dayPlan: DayPlan) => {
    setFocus(dayPlan.focus);
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

  const finishWorkout = () => {
    if (!startTs) return;
    const dur  = Date.now() - startTs;
    const done = exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done) }))
      .filter(ex => ex.sets.length > 0);
    const session: WorkoutSession = {
      id: crypto.randomUUID(), date: new Date().toISOString(), duration: dur, focus, exercises: done,
    };
    const newPrs: PRDict = { ...prs };
    done.forEach(ex => ex.sets.forEach(s => {
      const wt = parseFloat(s.weight), r = parseInt(s.reps) || 0;
      if (!isNaN(wt) && wt > 0) {
        const cur = newPrs[ex.id];
        if (!cur || wt > cur.weight || (wt === cur.weight && r > (cur.reps || 0)))
          newPrs[ex.id] = { weight: wt, reps: r, date: session.date, name: ex.name, isCardio: ex.type === "cardio" };
      }
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
  const coachCount = ALL_EX.filter(ex => analyzeEx(ex.id, history) !== null).length;

  const logout = () => { localStorage.removeItem("iron_log_token"); setToken(null); setUsername(null); };

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

  useMobileBackGesture(!!token, () => {
    if (completed)               { setCompleted(null); setTab("history"); return true; }
    if (tab !== "workout")       { setTab("workout"); return true; }
    if (active)                  { return true; }
    if (wStep === 6)              { setWStep(1); return true; }
    if (wStep > 0)               { setWStep(wStep - 1); return true; }
    return false;
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
          <WorkoutComplete session={completed} onDone={dismissCompleted} />
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
            startFromWizard={startFromWizard}
            addExercise={addExercise} removeExercise={removeExercise}
            updateSet={updateSet} toggleSet={toggleSet} addSet={addSet} removeSet={removeSet}
            isNewPr={isNewPr} finishWorkout={finishWorkout}
          />
        )}
        {!completed && tab === "history" && <HistoryTab history={history} prs={prs} onDelete={deleteWorkout} onUpdate={updateWorkout} />}
        {!completed && tab === "prs"     && <PRsTab prs={prs} onDelete={deletePr} />}
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
          />
        )}
        {!completed && tab === "health"  && <HealthTab healthMetrics={healthMetrics} fetchHealthMetrics={fetchHealthMetrics} authFetch={authFetch} />}
        {!completed && tab === "coach"     && <CoachTab history={history} />}
        {!completed && tab === "exercises" && <ExercisesTab />}
        {!completed && tab === "profile"   && <ProfileTab username={username} name={name} email={email} history={history} token={token} primaryColor={primaryColor} onColorChange={setPrimaryColor} onProfileUpdate={(n, e) => { setName(n); setEmail(e); }} toneMode={toneMode} onToneChange={setToneMode} isAdmin={isAdmin} authFetch={authFetch} />}
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
    </div>
    </OnboardingProvider>
  </ToneProvider>
  );
}
