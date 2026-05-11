import { useState, useEffect } from "react";
import "./WorkoutTracker.css";
import type { ExerciseDef, WorkoutExercise, WorkoutSession, PersonalRecordAPI, PRDict, WorkoutSet, BodyMetric } from "./types";
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

export default function WorkoutTracker() {
  // UI
  const [tab,       setTab]       = useState("workout");
  const [wStep,     setWStep]     = useState(0);
  const [focus,     setFocus]     = useState<string | null>(null);
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
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem("iron_log_token"));
  const [username,  setUsername]  = useState<string | null>(null);

  const authFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers as Record<string, string> ?? {}) },
    }).then(res => {
      if (res.status === 401) { localStorage.removeItem("iron_log_token"); setToken(null); }
      return res;
    });

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
      .then(r => r.json()).then((d: { username: string }) => setUsername(d.username)).catch(() => {});
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
    setExercises(planned.map(ex => {
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
    }));
    setPlanned([]);
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

  if (!token) return <AuthScreen onLogin={setToken} />;

  return (
    <div className="app">
      <AppHeader
        active={active} elapsed={elapsed} wStep={wStep}
        historyCount={history.length} prCount={Object.keys(prs).length} coachCount={coachCount}
        tab={tab} setTab={setTab} onLogout={logout}
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
            planned={planned} setPlanned={setPlanned}
            exercises={exercises} prs={prs} history={history}
            doneSets={doneSets} startFromWizard={startFromWizard}
            addExercise={addExercise} removeExercise={removeExercise}
            updateSet={updateSet} toggleSet={toggleSet} addSet={addSet} removeSet={removeSet}
            isNewPr={isNewPr} finishWorkout={finishWorkout}
          />
        )}
        {!completed && tab === "history" && <HistoryTab history={history} prs={prs} onDelete={deleteWorkout} onUpdate={updateWorkout} />}
        {!completed && tab === "prs"     && <PRsTab prs={prs} onDelete={deletePr} />}
        {!completed && tab === "health"  && <HealthTab healthMetrics={healthMetrics} fetchHealthMetrics={fetchHealthMetrics} authFetch={authFetch} />}
        {!completed && tab === "coach"   && <CoachTab history={history} />}
        {!completed && tab === "profile" && <ProfileTab username={username} history={history} token={token} />}
      </div>
    </div>
  );
}
