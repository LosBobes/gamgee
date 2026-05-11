import { useState, useEffect } from "react";
import "./WorkoutTracker.css";
import type { CardioPlan, DayPlan, ExerciseDef, WorkoutExercise, WorkoutSession, PersonalRecordAPI, PRDict, WorkoutSet, BodyMetric, WeeklyPlan } from "./types";
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
import { ALL_EX } from "./data/exercises";
import { analyzeEx } from "./analysis";
import { useMobileBackGesture } from "./hooks/useMobileBackGesture";
import { ToneProvider, type ToneMode } from "./context/ToneContext";


export default function WorkoutTracker() {
  // UI
  const [tab,       setTab]       = useState("workout");
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
  const [username,     setUsername]     = useState<string | null>(null);
  const [name,         setName]         = useState<string | null>(null);
  const [email,        setEmail]        = useState<string | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>(
    () => localStorage.getItem("gamgee_primary_color") ?? "#28D1FF"
  );
  const [toneMode, setToneMode] = useState<ToneMode>(
    () => (localStorage.getItem("gamgee_tone") ?? "bro") as ToneMode
  );
  const [weeklyPlan, setWeeklyPlanState] = useState<WeeklyPlan | null>(() => loadWeeklyPlan());

  const setWeeklyPlan = (plan: WeeklyPlan) => {
    saveWeeklyPlan(plan);
    setWeeklyPlanState(plan);
  };

  const authFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers as Record<string, string> ?? {}) },
    }).then(res => {
      if (res.status === 401) { localStorage.removeItem("iron_log_token"); setToken(null); }
      return res;
    });

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
      .then(r => r.json()).then((d: { username: string; name?: string | null; email?: string | null; primary_color?: string | null; is_admin?: boolean }) => {
        setUsername(d.username);
        setName(d.name ?? null);
        setEmail(d.email ?? null);
        setIsAdmin(d.is_admin ?? false);
        if (d.primary_color) setPrimaryColor(d.primary_color);
      }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!active || !startTs) return;
    const id = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    return () => clearInterval(id);
  }, [active, startTs]);

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
    setWStep(5);
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

    authFetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(session) }).catch(() => {});
    Object.entries(newPrs).forEach(([exercise_id, pr]) => {
      authFetch(`/api/prs/${exercise_id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pr, exercise_id }) }).catch(() => {});
    });

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

  useMobileBackGesture(!!token, () => {
    if (completed)               { setCompleted(null); setTab("history"); return true; }
    if (tab !== "workout")       { setTab("workout"); return true; }
    if (active)                  { return true; }
    if (wStep === 6)              { setWStep(1); return true; }
    if (wStep > 0)               { setWStep(wStep - 1); return true; }
    return false;
  });

  if (!token) return <ToneProvider value={toneMode}><AuthScreen onLogin={setToken} /></ToneProvider>;

  return (
  <ToneProvider value={toneMode}>
    <div className="app">
      <AppHeader
        active={active} elapsed={elapsed} wStep={wStep}
        historyCount={history.length} prCount={Object.keys(prs).length} coachCount={coachCount}
        tab={tab} setTab={setTab} onLogout={logout} isAdmin={isAdmin}
      />
      {active && <StatsBar exercises={exercises} doneSets={doneSets} />}
      <div className="content">
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
        {!completed && tab === "health"  && <HealthTab healthMetrics={healthMetrics} fetchHealthMetrics={fetchHealthMetrics} authFetch={authFetch} />}
        {!completed && tab === "coach"   && <CoachTab history={history} />}
        {!completed && tab === "profile" && <ProfileTab username={username} name={name} email={email} history={history} token={token} primaryColor={primaryColor} onColorChange={setPrimaryColor} onProfileUpdate={(n, e) => { setName(n); setEmail(e); }} toneMode={toneMode} onToneChange={setToneMode} />}
      </div>
    </div>
  </ToneProvider>
  );
}
