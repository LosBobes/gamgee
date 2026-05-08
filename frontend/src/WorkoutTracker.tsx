import { useState, useEffect } from "react";
import "./WorkoutTracker.css";
import type { ExerciseDef, WorkoutExercise, WorkoutSession, PersonalRecordAPI, PRDict, SuggExercise } from "./types";
import { fmtClock, fmtDate, fmtDur, orm1 } from "./utils";
import { GROUPS, getActive, muscleGroups } from "./constants";
import { analyzeEx, type AnalysisResult } from "./analysis";
import { MI } from "./data/muscles";
import { EM, ALL_EX, TYPE_COLOR, CAT_ICON } from "./data/exercises";
import { FOCUS } from "./data/focuses";
import { TIPS } from "./data/tips";
import BodyMap from "./components/BodyMap";
import SuggCard from "./components/SuggCard";

export default function WorkoutTracker() {
  // UI state
  const [tab,       setTab]       = useState<string>("workout");
  const [wStep,     setWStep]     = useState<number>(0);   // 0=start 1=focus 2=build 3=review
  const [focus,     setFocus]     = useState<string | null>(null);
  const [planned,   setPlanned]   = useState<ExerciseDef[]>([]);
  const [hovEx,     setHovEx]     = useState<ExerciseDef | null>(null);
  const [showAll,   setShowAll]   = useState<boolean>(false);
  // logging
  const [active,    setActive]    = useState<boolean>(false);
  const [startTs,   setStartTs]   = useState<number | null>(null);
  const [elapsed,   setElapsed]   = useState<number>(0);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showPick,  setShowPick]  = useState<boolean>(false);
  const [search,    setSearch]    = useState<string>("");
  // data
  const [history,   setHistory]   = useState<WorkoutSession[]>([]);
  const [prs,       setPrs]       = useState<PRDict>({});
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());
  // auth
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem("iron_log_token"));
  const [authView,  setAuthView]  = useState<"login" | "register">("login");
  const [authUser,  setAuthUser]  = useState("");
  const [authPass,  setAuthPass]  = useState("");
  const [authErr,   setAuthErr]   = useState("");

  const authFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers as Record<string, string> ?? {}) },
    }).then(res => {
      if (res.status === 401) { localStorage.removeItem("iron_log_token"); setToken(null); }
      return res;
    });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr("");
    if (authView === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUser, password: authPass }),
      });
      if (!res.ok) { setAuthErr((await res.json()).detail); return; }
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: authUser, password: authPass }),
    });
    if (!res.ok) { setAuthErr((await res.json()).detail); return; }
    const data = await res.json();
    localStorage.setItem("iron_log_token", data.access_token);
    setToken(data.access_token);
  };

  useEffect(() => {
    if (!token) return;
    authFetch("/api/workouts")
      .then(r => r.json())
      .then((data: WorkoutSession[]) => setHistory(data))
      .catch(() => {});
    authFetch("/api/prs")
      .then(r => r.json())
      .then((data: PersonalRecordAPI[]) => {
        const dict: PRDict = {};
        data.forEach(pr => { dict[pr.exercise_id] = pr; });
        setPrs(dict);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!active || !startTs) return;
    const id = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    return () => clearInterval(id);
  }, [active, startTs]);

  // ── Wizard computed ──
  const activeMuscles  = getActive(planned);
  const previewMuscles = hovEx ? getActive([hovEx]) : {};
  const coveredGroups  = muscleGroups(activeMuscles);

  const getSuggestions = (): SuggExercise[] => {
    const focusIds   = focus ? FOCUS[focus].exIds : [];
    const plannedIds = new Set(planned.map(e => e.id));
    return ALL_EX
      .filter(ex => !plannedIds.has(ex.id) && ex.type !== "cardio")
      .map(ex => {
        const m       = EM[ex.id] || { p: [], s: [] };
        const newP    = m.p.filter(mid => !activeMuscles[mid]);
        const ovP     = m.p.filter(mid => activeMuscles[mid] === "primary");
        const newS    = m.s.filter(mid => !activeMuscles[mid]);
        const isFocus = focusIds.includes(ex.id);
        return { ...ex, score: (isFocus ? 100 : 0) + newP.length * 10 + newS.length * 2, newP, ovP, newS, isFocus };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  };

  const startFromWizard = () => {
    setWStep(0);
    setActive(true);
    setStartTs(Date.now());
    setElapsed(0);
    setExercises(planned.map(ex => ({
      ...ex,
      uid: `${ex.id}_${Date.now()}_${Math.random()}`,
      sets: [{ weight: "", reps: "", done: false }],
    })));
    setPlanned([]);
  };

  // ── Logging handlers ──
  const addExercise = (ex: ExerciseDef) => {
    setExercises(p => [...p, { ...ex, uid: `${ex.id}_${Date.now()}`, sets: [{ weight: "", reps: "", done: false }] }]);
    setShowPick(false);
    setSearch("");
  };

  const removeExercise = (uid: string) =>
    setExercises(p => p.filter(e => e.uid !== uid));

  const updateSet = (uid: string, idx: number, field: "weight" | "reps", value: string) =>
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
      id:        crypto.randomUUID(),
      date:      new Date().toISOString(),
      duration:  dur,
      focus:     focus,
      exercises: done,
    };
    const newPrs: PRDict = { ...prs };
    done.forEach(ex => ex.sets.forEach(s => {
      const wt = parseFloat(s.weight);
      const r  = parseInt(s.reps) || 0;
      if (!isNaN(wt) && wt > 0) {
        const cur = newPrs[ex.id];
        if (!cur || wt > cur.weight || (wt === cur.weight && r > (cur.reps || 0)))
          newPrs[ex.id] = { weight: wt, reps: r, date: session.date, name: ex.name, isCardio: ex.type === "cardio" };
      }
    }));
    const newHistory = [session, ...history].slice(0, 60);

    authFetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    }).catch(() => {});
    Object.entries(newPrs).forEach(([exercise_id, pr]) => {
      authFetch(`/api/prs/${exercise_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pr, exercise_id }),
      }).catch(() => {});
    });

    setHistory(newHistory);
    setPrs(newPrs);
    setActive(false);
    setExercises([]);
    setStartTs(null);
    setElapsed(0);
    setWStep(0);
    setPlanned([]);
    setFocus(null);
    setTab("history");
  };

  // ── Derived ──
  const doneSets = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const volume   = exercises.reduce((a, ex) => ex.type !== "strength" ? a :
    a + ex.sets.filter(s => s.done).reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);

  const colLabels = (ex: WorkoutExercise): [string, string] =>
    ex.type === "cardio" ? ["DURATION (min)", "DIST (km)"]
    : ex.type === "timed" ? ["DURATION (s)", "NOTES"]
    : ["WEIGHT (kg)", "REPS"];

  const toggleExpand = (id: string) =>
    setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filteredEx = search.trim()
    ? ALL_EX.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_EX;
  const grouped: Record<string, ExerciseDef[]> = {};
  filteredEx.forEach(ex => { (grouped[ex.cat!] = grouped[ex.cat!] || []).push(ex); });

  const STATUS_ORDER: Record<string, number> = {
    "DELOAD": 0, "STALLED": 1, "PLATEAU": 2,
    "READY TO JUMP": 3, "PROGRESSING": 4, "BUILDING REPS": 5, "NEW": 6,
  };
  const coachData = ALL_EX
    .map(ex => ({ ex, a: analyzeEx(ex.id, history) }))
    .filter((item): item is { ex: ExerciseDef; a: AnalysisResult } => item.a !== null)
    .sort((x, y) => (STATUS_ORDER[x.a.status.label] ?? 9) - (STATUS_ORDER[y.a.status.label] ?? 9));

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (!token) return (
    <div className="wt-auth-screen">
      <div className="auth-card">
        <h1>🏋️ IRON LOG</h1>
        <h2>{authView === "login" ? "Sign In" : "Create Account"}</h2>
        <form onSubmit={handleAuth}>
          <input
            placeholder="Username"
            value={authUser}
            onChange={e => setAuthUser(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={authPass}
            onChange={e => setAuthPass(e.target.value)}
            autoComplete="current-password"
          />
          {authErr && <p className="auth-err">{authErr}</p>}
          <button type="submit" className="auth-submit">
            {authView === "login" ? "Sign In" : "Register"}
          </button>
        </form>
        <button
          className="auth-toggle"
          onClick={() => { setAuthView(v => v === "login" ? "register" : "login"); setAuthErr(""); }}
        >
          {authView === "login" ? "Need an account? Register" : "Have an account? Sign In"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* HEADER */}
      <div className="hdr">
        <div className="hdr-top">
          <div>
            <div className="logo">⚡ IRON LOG</div>
            <div className="logo-sub">Workout Tracker</div>
          </div>
          {active && <div className="timer-pill">{fmtClock(elapsed)}</div>}
          <button
            className="logout-btn"
            onClick={() => { localStorage.removeItem("iron_log_token"); setToken(null); }}
          >
            Logout
          </button>
        </div>
        <div className="tabs">
          {[
            { key: "workout", label: active ? "⚡ ACTIVE" : wStep > 0 ? "⚡ BUILDING" : "⚡ WORKOUT" },
            { key: "history", label: `📋 HISTORY (${history.length})` },
            { key: "prs",     label: `🏆 PRs (${Object.keys(prs).length})` },
            { key: "coach",   label: `🧠 COACH (${coachData.length})` },
          ].map(({ key, label }) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS BAR */}
      {active && (
        <div className="stats-bar">
          {[
            { v: exercises.length, l: "Exercises" },
            { v: doneSets,         l: "Sets Done"  },
            { v: volume > 0 ? `${Math.round(volume)}` : "—", l: "Vol (kg)" },
            { v: exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done && s.reps).length, 0) || "—", l: "Reps" },
          ].map(({ v, l }) => (
            <div key={l} className="stat">
              <div className="stat-val">{v}</div>
              <div className="stat-lbl">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="content">

        {/* ══ WORKOUT TAB ══ */}
        {tab === "workout" && (
          <>
            {/* Step 0: Start screen */}
            {!active && wStep === 0 && (
              <div className="start-screen">
                <p className="start-pre">Ready to crush it?</p>
                <h1 className="start-hero">LET'S<br /><span>WORK</span></h1>
                <button className="btn-start" onClick={() => setWStep(1)} style={{ marginBottom: 12 }}>
                  BUILD WORKOUT
                </button>
                {history.length > 0 && (
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
                    Last: {fmtDate(history[0].date)} · {fmtDur(history[0].duration)}
                  </p>
                )}
              </div>
            )}

            {/* Step 1: Choose focus */}
            {!active && wStep === 1 && (
              <>
                <div className="wz-hdr">
                  <button className="wz-back" onClick={() => setWStep(0)}>✕ Cancel</button>
                  <span className="wz-focus-label">STEP 1 — FOCUS</span>
                  <button className="wz-next" onClick={() => setWStep(2)} disabled={!focus}>BUILD →</button>
                </div>
                <div className="wizard-title">What are we training?</div>
                <div className="wizard-sub">Pick a focus to get smart exercise suggestions</div>
                <div className="focus-grid">
                  {Object.entries(FOCUS).map(([k, f]) => (
                    <div key={k} className={`focus-card ${focus === k ? "selected" : ""}`} onClick={() => setFocus(k)}>
                      <div className="focus-icon">{f.icon}</div>
                      <div className="focus-name">{f.name}</div>
                      <div className="focus-desc">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Build with body map */}
            {!active && wStep === 2 && (() => {
              const suggestions  = getSuggestions();
              const focusSuggs   = suggestions.filter(s => s.isFocus);
              const otherSuggs   = suggestions.filter(s => !s.isFocus);
              const displayOther = showAll ? otherSuggs : otherSuggs.slice(0, 8);
              return (
                <>
                  <div className="wz-hdr">
                    <button className="wz-back" onClick={() => setWStep(1)}>← BACK</button>
                    <span className="wz-focus-label">{FOCUS[focus!]?.icon} {FOCUS[focus!]?.name.toUpperCase()}</span>
                    <button className="wz-next" onClick={() => setWStep(3)} disabled={planned.length === 0}>REVIEW →</button>
                  </div>

                  <BodyMap active={activeMuscles} preview={previewMuscles} />

                  <div className="coverage-bar-wrap">
                    <div className="coverage-top">
                      <span className="coverage-title">Muscle Coverage</span>
                      <span className="coverage-count">
                        {coveredGroups.size}
                        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>
                          &nbsp;/ {GROUPS.length} groups
                        </span>
                      </span>
                    </div>
                    <div className="coverage-groups">
                      {GROUPS.map(g => {
                        const hit     = coveredGroups.has(g);
                        const preview = hovEx && muscleGroups(previewMuscles).has(g) && !hit;
                        return (
                          <span key={g} className="group-chip" style={{
                            color:       preview ? "#52B788" : hit ? "#E8981E" : "var(--muted)",
                            background:  preview ? "rgba(82,183,136,0.1)" : hit ? "var(--ad)" : "transparent",
                            borderColor: preview ? "rgba(82,183,136,0.3)" : hit ? "rgba(232,152,30,0.3)" : "var(--border)",
                          }}>
                            {g}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {focusSuggs.length > 0 && (
                    <>
                      <div className="section-title">
                        ⭐ SUGGESTED FOR {FOCUS[focus!]?.name.toUpperCase()}
                        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400, letterSpacing: 0 }}>
                          hover to preview on map
                        </span>
                      </div>
                      {focusSuggs.map(ex => (
                        <SuggCard key={ex.id} ex={ex}
                          isAdded={planned.some(p => p.id === ex.id)}
                          onAdd={()    => setPlanned(p => [...p, ex])}
                          onRemove={()  => setPlanned(p => p.filter(e => e.id !== ex.id))}
                          onHover={()   => setHovEx(ex)}
                          onLeave={()   => setHovEx(null)}
                        />
                      ))}
                    </>
                  )}

                  <div className="section-title" style={{ marginTop: 16 }}>➕ MORE EXERCISES</div>
                  {displayOther.map(ex => (
                    <SuggCard key={ex.id} ex={ex}
                      isAdded={planned.some(p => p.id === ex.id)}
                      onAdd={()    => setPlanned(p => [...p, ex])}
                      onRemove={()  => setPlanned(p => p.filter(e => e.id !== ex.id))}
                      onHover={()   => setHovEx(ex)}
                      onLeave={()   => setHovEx(null)}
                    />
                  ))}
                  {!showAll && otherSuggs.length > 8 && (
                    <button
                      onClick={() => setShowAll(true)}
                      style={{ width: "100%", background: "transparent", border: "1px dashed var(--border)", color: "var(--muted)", borderRadius: 6, padding: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 12 }}
                    >
                      show {otherSuggs.length - 8} more exercises…
                    </button>
                  )}

                  {planned.length > 0 && (
                    <>
                      <div className="section-title" style={{ marginTop: 16 }}>✓ ADDED ({planned.length})</div>
                      {planned.map((ex, i) => {
                        const m = EM[ex.id] || { p: [], s: [] };
                        return (
                          <div key={ex.id} className="planned-card">
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{i + 1}</span>
                                <div className="planned-name">{ex.name}</div>
                              </div>
                              <div className="planned-muscles">{m.p.map(mid => MI[mid]?.n).join(" · ")}</div>
                            </div>
                            <button className="btn-rm" onClick={() => setPlanned(p => p.filter(e => e.id !== ex.id))}>✕</button>
                          </div>
                        );
                      })}
                      <button
                        className="wz-next"
                        style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 15 }}
                        onClick={() => setWStep(3)}
                      >
                        REVIEW WORKOUT →
                      </button>
                    </>
                  )}
                </>
              );
            })()}

            {/* Step 3: Review & start */}
            {!active && wStep === 3 && (() => {
              const finalActive = getActive(planned);
              const finalGroups = muscleGroups(finalActive);
              return (
                <>
                  <div className="wz-hdr">
                    <button className="wz-back" onClick={() => setWStep(2)}>← EDIT</button>
                    <span className="wz-focus-label">REVIEW WORKOUT</span>
                    <div style={{ width: 72 }} />
                  </div>
                  <BodyMap active={finalActive} preview={{}} />
                  <div className="coverage-bar-wrap" style={{ marginBottom: 16 }}>
                    <div className="coverage-top">
                      <span className="coverage-title">Final Coverage</span>
                      <span className="coverage-count">
                        {finalGroups.size}
                        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>
                          &nbsp;/ {GROUPS.length} groups
                        </span>
                      </span>
                    </div>
                    <div className="coverage-groups">
                      {GROUPS.map(g => (
                        <span key={g} className="group-chip" style={{
                          color:       finalGroups.has(g) ? "#E8981E" : "var(--muted)",
                          background:  finalGroups.has(g) ? "var(--ad)" : "transparent",
                          borderColor: finalGroups.has(g) ? "rgba(232,152,30,0.3)" : "var(--border)",
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  {planned.map((ex, i) => {
                    const m    = EM[ex.id] || { p: [], s: [] };
                    const anlz = analyzeEx(ex.id, history);
                    return (
                      <div key={ex.id} className="review-card">
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span className="review-num">{i + 1}</span>
                              <div>
                                <div className="review-ex-name">{ex.name}</div>
                                {anlz && (
                                  <div style={{ fontSize: 10, color: anlz.status.color, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 1 }}>
                                    TARGET: {anlz.nextWeight}kg × {anlz.nextReps} reps
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="review-muscles">
                              {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
                              {m.s.slice(0, 3).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
                            </div>
                          </div>
                          <button className="btn-rm" style={{ marginTop: 4 }} onClick={() => setPlanned(p => p.filter(e => e.id !== ex.id))}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                  <button className="btn-start" onClick={startFromWizard} disabled={planned.length === 0} style={{ marginTop: 8 }}>
                    ⚡ START WORKOUT ({planned.length} exercises)
                  </button>
                </>
              );
            })()}

            {/* Active workout logging */}
            {active && (
              <>
                <div className="wx-actions">
                  <button className="btn-add-ex" onClick={() => setShowPick(true)}>+ ADD EXERCISE</button>
                  <button className="btn-finish" onClick={finishWorkout} disabled={doneSets === 0}>✓ FINISH</button>
                </div>
                {exercises.length === 0 && (
                  <div className="empty">
                    <div className="empty-icon">🏋️</div>
                    <div className="empty-label">No exercises yet</div>
                  </div>
                )}
                {exercises.map(ex => {
                  const [wL, rL] = colLabels(ex);
                  const doneCt   = ex.sets.filter(s => s.done).length;
                  const curPr    = prs[ex.id];
                  const anlz     = analyzeEx(ex.id, history);
                  const m        = EM[ex.id] || { p: [], s: [] };
                  return (
                    <div key={ex.uid} className="ex-card">
                      <div className="ex-hdr">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                            <div className="ex-name">{ex.name}</div>
                            {curPr && (
                              <span className="pr-pill">PR {curPr.weight}kg{curPr.reps ? ` × ${curPr.reps}` : ""}</span>
                            )}
                          </div>
                          <div className="ex-meta">
                            <span style={{ color: TYPE_COLOR[ex.type] }}>●</span>
                            <span>{doneCt}/{ex.sets.length} sets</span>
                            {anlz && <span style={{ color: anlz.status.color }}>→ {anlz.nextWeight}kg × {anlz.nextReps}</span>}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
                            {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
                            {m.s.slice(0, 2).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
                          </div>
                        </div>
                        <button className="btn-icon" onClick={() => removeExercise(ex.uid)}>✕</button>
                      </div>
                      <div className="set-table">
                        <div className="set-col-hdr">
                          <div className="col-lbl">#</div>
                          <div className="col-lbl">{wL}</div>
                          <div className="col-lbl">{rL}</div>
                          <div className="col-lbl">✓</div>
                          <div className="col-lbl" />
                        </div>
                        {ex.sets.map((set, idx) => {
                          const showPrTag = ex.type === "strength" && isNewPr(ex.id, set.weight) && !!set.weight;
                          return (
                            <div key={idx} className="set-row">
                              <div className={`set-num ${set.done ? "done" : ""}`}>{idx + 1}</div>
                              <div className="inp-wrap">
                                <input
                                  className={`set-inp ${set.done ? "done" : ""}`}
                                  type="number" min="0" step="0.5"
                                  placeholder={ex.type === "cardio" ? "30" : ex.type === "timed" ? "60" : "0"}
                                  value={set.weight}
                                  onChange={e => updateSet(ex.uid, idx, "weight", e.target.value)}
                                />
                                {showPrTag && <span className="new-pr-tag">NEW PR!</span>}
                              </div>
                              <input
                                className={`set-inp ${set.done ? "done" : ""}`}
                                type={ex.type === "timed" ? "text" : "number"} min="0" step="1"
                                placeholder={ex.type === "cardio" ? "5.0" : ex.type === "timed" ? "—" : "0"}
                                value={set.reps}
                                onChange={e => updateSet(ex.uid, idx, "reps", e.target.value)}
                              />
                              <button
                                className={`check-btn ${set.done ? "done" : ""}`}
                                onClick={() => toggleSet(ex.uid, idx)}
                              >
                                {set.done ? "✓" : "○"}
                              </button>
                              <button
                                className="rm-set-btn"
                                onClick={() => removeSet(ex.uid, idx)}
                                disabled={ex.sets.length <= 1}
                                style={{ opacity: ex.sets.length <= 1 ? 0.2 : 1 }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        <button className="btn-add-set" onClick={() => addSet(ex.uid)}>+ add set</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ══ HISTORY TAB ══ */}
        {tab === "history" && (
          history.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-label">No sessions yet</div></div>
            : history.map(w => {
                const isOpen = expanded.has(w.id);
                const sets   = w.exercises.reduce((a, e) => a + e.sets.length, 0);
                const vol    = w.exercises.reduce((a, e) => e.type !== "strength" ? a :
                  a + e.sets.reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
                return (
                  <div key={w.id} className="hist-card">
                    <div className="hist-hdr" onClick={() => toggleExpand(w.id)}>
                      <div>
                        <div className="hist-date">{fmtDate(w.date)}</div>
                        <div className="hist-meta">
                          <span>⏱ {fmtDur(w.duration)}</span>
                          <span>🏋️ {w.exercises.length} ex</span>
                          <span>📊 {sets} sets</span>
                          {vol > 0 && <span>💪 {Math.round(vol)}kg</span>}
                        </div>
                      </div>
                      <span style={{ color: "var(--muted)", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div className="hist-body">
                        {w.exercises.map(ex => (
                          <div key={ex.uid} className="hist-ex">
                            <div className="hist-ex-name">{ex.name}</div>
                            <div className="hist-chips">
                              {ex.sets.map((s, i) => {
                                const isPr = ex.type === "strength" && prs[ex.id] && prs[ex.id].weight === parseFloat(s.weight);
                                return (
                                  <span key={i} className={`chip ${isPr ? "pr-chip" : ""}`}>
                                    {ex.type === "cardio" ? `${s.weight}min${s.reps ? ` · ${s.reps}km` : ""}`
                                      : ex.type === "timed" ? `${s.weight}s`
                                      : `${s.weight}kg × ${s.reps}`}
                                    {isPr ? " 🏆" : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
        )}

        {/* ══ PRs TAB ══ */}
        {tab === "prs" && (
          Object.keys(prs).length === 0
            ? <div className="empty"><div className="empty-icon">🏆</div><div className="empty-label">No PRs yet</div></div>
            : <>
                <p className="pr-header">{Object.keys(prs).length} Personal Records</p>
                <div className="pr-grid">
                  {Object.entries(prs)
                    .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
                    .map(([id, pr]) => (
                      <div key={id} className="pr-card">
                        <div className="pr-ex-name">{pr.name}</div>
                        <div className="pr-weight-val">
                          {pr.weight}<span className="pr-weight-unit">{pr.isCardio ? "min" : "kg"}</span>
                        </div>
                        {pr.reps > 0 && (
                          <div className="pr-reps">{pr.isCardio ? `${pr.reps} km` : `× ${pr.reps} reps`}</div>
                        )}
                        {!pr.isCardio && pr.weight && pr.reps > 0 && (
                          <div className="pr-reps" style={{ color: "var(--blue)" }}>est. 1RM ~{orm1(pr.weight, pr.reps)}kg</div>
                        )}
                        <div className="pr-date">{fmtDate(pr.date)}</div>
                      </div>
                    ))}
                </div>
              </>
        )}

        {/* ══ COACH TAB ══ */}
        {tab === "coach" && (
          <>
            {coachData.length > 0 && (
              <>
                <div className="coach-intro">
                  Progression analysis from your logged history — sorted by exercises that need the most attention.
                  Red = intervene, amber = ready for weight jump, green = moving forward.
                </div>
                {coachData.map(({ ex, a }) => {
                  const { sessions, last, est1RM, status, nextWeight, nextReps, reason } = a;
                  const maxW = Math.max(...sessions.map(s => s.topW));
                  return (
                    <div key={ex.id} className="coach-card">
                      <div className="coach-hdr">
                        <div>
                          <div className="coach-ex-name">{ex.name}</div>
                          <span className="session-count">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="status-badge" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
                          {status.label}
                        </span>
                      </div>
                      <div className="coach-body">
                        {sessions.length > 1 && (
                          <div className="trend-wrap">
                            {sessions.map((s, i) => {
                              const h      = maxW > 0 ? Math.max(4, Math.round((s.topW / maxW) * 28)) : 4;
                              const isLast = i === sessions.length - 1;
                              return (
                                <div key={i} title={`${s.topW}kg`} style={{
                                  width: 7, height: h, borderRadius: "2px 2px 0 0", flexShrink: 0,
                                  background: isLast ? status.color : "var(--s3)",
                                  opacity: isLast ? 1 : 0.4 + 0.6 * (i / sessions.length),
                                }} />
                              );
                            })}
                            <span style={{ fontSize: 8, color: "var(--muted)", marginLeft: 5, alignSelf: "center", letterSpacing: 1 }}>TREND</span>
                          </div>
                        )}
                        <div className="coach-row">
                          <div>
                            <div className="coach-stat-lbl">Last Weight</div>
                            <div className="coach-stat-val">{last.topW}<span className="coach-stat-unit">kg</span></div>
                          </div>
                          {last.topR > 0 && (
                            <div>
                              <div className="coach-stat-lbl">Last Reps</div>
                              <div className="coach-stat-val">{last.topR}<span className="coach-stat-unit">reps</span></div>
                            </div>
                          )}
                          <div>
                            <div className="coach-stat-lbl">Sets</div>
                            <div className="coach-stat-val">{last.totalSets}<span className="coach-stat-unit">sets</span></div>
                          </div>
                          {est1RM && (
                            <div>
                              <div className="coach-stat-lbl">Est. 1RM</div>
                              <div style={{ marginTop: 4 }}><span className="orm-badge">~{est1RM}kg</span></div>
                            </div>
                          )}
                        </div>
                        <div className="rec-box">
                          <div className="rec-box-label">▶ Next Session Target</div>
                          <div className="rec-target">
                            {nextWeight}kg<span className="rec-target-unit"> × {nextReps} reps</span>
                          </div>
                          <div className="rec-reason">{reason}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {coachData.length === 0 && (
              <div className="empty" style={{ paddingBottom: 16 }}>
                <div className="empty-icon">🧠</div>
                <div className="empty-label">Log sessions to unlock coaching</div>
              </div>
            )}
            <div className="coach-section-title">General Principles</div>
            <div className="tips-grid">
              {TIPS.map(t => (
                <div key={t.title} className="tip-card">
                  <div className="tip-icon">{t.icon}</div>
                  <div className="tip-title">{t.title}</div>
                  <div className="tip-body">{t.body}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* EXERCISE PICKER OVERLAY */}
      {showPick && (
        <div
          className="overlay"
          onClick={e => { if (e.target === e.currentTarget) { setShowPick(false); setSearch(""); } }}
        >
          <div className="picker">
            <div className="picker-hdr">
              <span className="picker-title">Add Exercise</span>
              <button className="btn-icon" style={{ padding: "5px 10px" }} onClick={() => { setShowPick(false); setSearch(""); }}>
                ✕ Close
              </button>
            </div>
            <input
              className="search-inp"
              placeholder={`Search ${ALL_EX.length} exercises…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat}>
                <div className="cat-lbl">{CAT_ICON[cat]} {cat} ({list.length})</div>
                {list.map(ex => (
                  <button key={ex.id} className="ex-opt" onClick={() => addExercise(ex)}>
                    <span className="type-dot" style={{ background: TYPE_COLOR[ex.type] }} />
                    <span style={{ flex: 1 }}>{ex.name}</span>
                    {prs[ex.id] && <span className="ex-pr-hint">PR {prs[ex.id].weight}kg</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
