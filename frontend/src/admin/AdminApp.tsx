import { useState, useEffect, useCallback } from "react";
import "./AdminApp.css";

type Page = "users" | "exercises" | "workouts" | "prs" | "feedback" | "quotes" | "tips" | "motions";
type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

interface AdminUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  gender: string | null;
  primary_color: string | null;
  is_admin: boolean;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  type: string;
  primary_muscles: string[];
  secondary_muscles: string[];
}

interface WorkoutRow {
  id: string;
  user_id: number | null;
  username: string | null;
  date: string;
  duration: number;
  focus: string | null;
  exercise_count: number;
}

interface PRRow {
  id: number;
  user_id: number | null;
  username: string | null;
  exercise_id: string;
  name: string;
  weight: number;
  reps: number;
  date: string;
  is_cardio: boolean;
}

interface FeedbackRow {
  id: number;
  user_id: number | null;
  username: string | null;
  name: string | null;
  kind: string;
  message: string;
  status: string;
  created_at: number;
  resolved_at: number | null;
}

function fmtDur(ms: number): string {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function AdminApp() {
  const [token,    setToken]    = useState<string | null>(() => localStorage.getItem("iron_log_token"));
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [page,     setPage]     = useState<Page>("users");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginErr,  setLoginErr]  = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  const authFetch = useCallback((url: string, opts: RequestInit = {}): Promise<Response> =>
    fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
        ...(opts.headers as Record<string, string> ?? {}),
      },
    }).then(res => {
      if (res.status === 401) { localStorage.removeItem("iron_log_token"); setToken(null); setVerified(false); }
      return res;
    }),
  [token]);

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    authFetch("/api/admin/users")
      .then(r => { setVerified(r.ok); })
      .catch(() => setVerified(false))
      .finally(() => setChecking(false));
  }, [token, authFetch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    try {
      const body = new URLSearchParams({ username: loginForm.username, password: loginForm.password });
      const res = await fetch("/api/auth/login", { method: "POST", body });
      if (!res.ok) { setLoginErr("Invalid credentials"); return; }
      const data = await res.json();
      localStorage.setItem("iron_log_token", data.access_token);
      setToken(data.access_token);
      setChecking(true);
    } catch {
      setLoginErr("Network error");
    }
  };

  if (checking) return <div className="adm-center">Checking access…</div>;

  if (!token || !verified) {
    return (
      <div className="adm-login-wrap">
        <div className="adm-login-box">
          <div className="adm-logo">GAMGEE <span>ADMIN</span></div>
          {token && !verified && <p className="adm-err">This account does not have admin access.</p>}
          <form onSubmit={handleLogin}>
            <input className="adm-input" type="text" placeholder="Username"
              value={loginForm.username} onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="username" required />
            <input className="adm-input" type="password" placeholder="Password"
              value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password" required />
            {loginErr && <p className="adm-err">{loginErr}</p>}
            <button type="submit" className="adm-btn-primary">Sign In</button>
          </form>
          {token && !verified && (
            <button className="adm-btn-ghost" onClick={() => { localStorage.removeItem("iron_log_token"); setToken(null); }}>
              Sign out &amp; try different account
            </button>
          )}
        </div>
      </div>
    );
  }

  const NAV: { key: Page; label: string }[] = [
    { key: "users",     label: "Users"     },
    { key: "exercises", label: "Exercises" },
    { key: "workouts",  label: "Workouts"  },
    { key: "prs",       label: "PRs"       },
    { key: "feedback",  label: "Feedback"  },
    { key: "quotes",    label: "Quotes"    },
    { key: "tips",      label: "Tips"      },
    { key: "motions",   label: "Motions"   },
  ];

  const currentLabel = NAV.find(n => n.key === page)?.label ?? "";

  return (
    <div className={`adm-layout${sidebarOpen ? " adm-sidebar-open" : ""}`}>
      <header className="adm-topbar">
        <button
          className="adm-menu-btn"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
        <div className="adm-topbar-title">{currentLabel}</div>
      </header>
      {sidebarOpen && (
        <div className="adm-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <aside className="adm-sidebar">
        <div className="adm-logo">GAMGEE<br /><span>ADMIN</span></div>
        <nav className="adm-nav">
          {NAV.map(n => (
            <button
              key={n.key}
              className={`adm-nav-btn${page === n.key ? " active" : ""}`}
              onClick={() => { setPage(n.key); setSidebarOpen(false); }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <button className="adm-nav-btn" onClick={() => window.location.href = "/"}>← Back to App</button>
          <button className="adm-nav-btn" onClick={() => { localStorage.removeItem("iron_log_token"); setToken(null); setVerified(false); }}>Logout</button>
        </div>
      </aside>
      <main className="adm-main">
        {page === "users"     && <UsersPage     authFetch={authFetch} />}
        {page === "exercises" && <ExercisesPage authFetch={authFetch} />}
        {page === "workouts"  && <WorkoutsPage  authFetch={authFetch} />}
        {page === "prs"       && <PRsPage       authFetch={authFetch} />}
        {page === "feedback"  && <FeedbackPage  authFetch={authFetch} />}
        {page === "quotes"    && <QuotesPage    authFetch={authFetch} />}
        {page === "tips"      && <TipsPage      authFetch={authFetch} />}
        {page === "motions"   && <MotionsPage   authFetch={authFetch} />}
      </main>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

function UsersPage({ authFetch }: { authFetch: AuthFetch }) {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form,    setForm]    = useState<Partial<AdminUser>>({});
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    authFetch("/api/admin/users")
      .then(r => r.json()).then(setUsers)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const startEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ name: u.name ?? "", email: u.email ?? "", gender: u.gender ?? "", is_admin: u.is_admin });
    setErr("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setErr("");
    try {
      const res = await authFetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setErr((await res.json()).detail ?? "Failed"); return; }
      setUsers(us => us.map(u => u.id === editing.id ? { ...u, ...form } as AdminUser : u));
      setEditing(null);
    } catch { setErr("Network error"); }
    finally { setSaving(false); }
  };

  const deleteUser = async (u: AdminUser) => {
    if (!confirm(`Delete @${u.username} and all their data?`)) return;
    await authFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setUsers(us => us.filter(x => x.id !== u.id));
  };

  if (loading) return <div className="adm-center">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-hdr">
        <h1>Users <span className="adm-count">{users.length}</span></h1>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr>
            <th>ID</th><th>Username</th><th>Name</th><th>Email</th><th>Gender</th><th>Admin</th><th></th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="adm-muted">{u.id}</td>
                <td><strong>{u.username}</strong></td>
                <td>{u.name ?? <span className="adm-muted">—</span>}</td>
                <td>{u.email ?? <span className="adm-muted">—</span>}</td>
                <td>{u.gender ?? <span className="adm-muted">—</span>}</td>
                <td><span className={`adm-badge${u.is_admin ? " adm-badge-admin" : ""}`}>{u.is_admin ? "admin" : "user"}</span></td>
                <td className="adm-actions">
                  <button className="adm-btn-sm" onClick={() => startEdit(u)}>Edit</button>
                  <button className="adm-btn-sm adm-btn-danger" onClick={() => deleteUser(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`Edit @${editing.username}`} onClose={() => setEditing(null)}>
          <Field label="Name">
            <input className="adm-input" value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className="adm-input" type="email" value={form.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Gender">
            <select className="adm-input" value={form.gender ?? ""} onChange={e => setForm(f => ({ ...f, gender: e.target.value || undefined }))}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </Field>
          <label className="adm-checkbox">
            <input type="checkbox" checked={!!form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))} />
            Admin
          </label>
          {err && <p className="adm-err">{err}</p>}
          <div className="adm-modal-actions">
            <button className="adm-btn-primary" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="adm-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Exercises ─────────────────────────────────────────────────────────────────

function ExercisesPage({ authFetch }: { authFetch: AuthFetch }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Exercise | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [form,      setForm]      = useState<Partial<Exercise & { primary_str: string; secondary_str: string }>>({});
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    authFetch("/api/admin/exercises")
      .then(r => r.json()).then(setExercises)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const openEdit = (ex: Exercise) => {
    setEditing(ex); setCreating(false);
    setForm({ ...ex, primary_str: ex.primary_muscles.join(", "), secondary_str: ex.secondary_muscles.join(", ") });
    setErr("");
  };

  const openCreate = () => {
    setCreating(true); setEditing(null);
    setForm({ id: "", name: "", category: "compound", type: "strength", primary_str: "", secondary_str: "" });
    setErr("");
  };

  const save = async () => {
    setSaving(true); setErr("");
    const payload = {
      ...form,
      primary_muscles:   (form.primary_str ?? "").split(",").map(s => s.trim()).filter(Boolean),
      secondary_muscles: (form.secondary_str ?? "").split(",").map(s => s.trim()).filter(Boolean),
    };
    delete payload.primary_str; delete payload.secondary_str;
    try {
      const url    = creating ? "/api/admin/exercises" : `/api/admin/exercises/${editing!.id}`;
      const method = creating ? "POST" : "PATCH";
      const res    = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { setErr((await res.json()).detail ?? "Failed"); return; }
      const saved: Exercise = await res.json();
      if (creating) setExercises(es => [...es, saved].sort((a, b) => a.name.localeCompare(b.name)));
      else          setExercises(es => es.map(e => e.id === saved.id ? saved : e));
      setEditing(null); setCreating(false);
    } catch { setErr("Network error"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm(`Delete exercise "${id}"?`)) return;
    await authFetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
    setExercises(es => es.filter(e => e.id !== id));
  };

  const filtered = exercises.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search.toLowerCase())
  );

  if (loading) return <div className="adm-center">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-hdr">
        <h1>Exercises <span className="adm-count">{exercises.length}</span></h1>
        <button className="adm-btn-primary" onClick={openCreate}>+ New</button>
      </div>
      <input className="adm-input adm-search" placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr>
            <th>ID</th><th>Name</th><th>Category</th><th>Type</th><th>Primary muscles</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map(ex => (
              <tr key={ex.id}>
                <td className="adm-muted adm-mono">{ex.id}</td>
                <td><strong>{ex.name}</strong></td>
                <td>{ex.category}</td>
                <td>{ex.type}</td>
                <td className="adm-muted adm-small">{ex.primary_muscles.join(", ")}</td>
                <td className="adm-actions">
                  <button className="adm-btn-sm" onClick={() => openEdit(ex)}>Edit</button>
                  <button className="adm-btn-sm adm-btn-danger" onClick={() => del(ex.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <Modal title={creating ? "New Exercise" : `Edit: ${editing!.id}`} onClose={() => { setEditing(null); setCreating(false); }}>
          {creating && (
            <Field label={'ID (short key, e.g. "bench")'}>
              <input className="adm-input adm-mono" value={form.id ?? ""} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
            </Field>
          )}
          <Field label="Name">
            <input className="adm-input" value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Category">
            <input className="adm-input" value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </Field>
          <Field label="Type">
            <select className="adm-input" value={form.type ?? "strength"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="strength">strength</option>
              <option value="cardio">cardio</option>
              <option value="timed">timed</option>
            </select>
          </Field>
          <Field label="Primary muscles (comma-separated IDs)">
            <input className="adm-input" value={form.primary_str ?? ""} onChange={e => setForm(f => ({ ...f, primary_str: e.target.value }))} />
          </Field>
          <Field label="Secondary muscles (comma-separated IDs)">
            <input className="adm-input" value={form.secondary_str ?? ""} onChange={e => setForm(f => ({ ...f, secondary_str: e.target.value }))} />
          </Field>
          {err && <p className="adm-err">{err}</p>}
          <div className="adm-modal-actions">
            <button className="adm-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="adm-btn-ghost" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Workouts ──────────────────────────────────────────────────────────────────

function WorkoutsPage({ authFetch }: { authFetch: AuthFetch }) {
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    authFetch("/api/admin/workouts")
      .then(r => r.json()).then(setWorkouts)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const del = async (id: string) => {
    if (!confirm("Delete this workout session?")) return;
    await authFetch(`/api/admin/workouts/${id}`, { method: "DELETE" });
    setWorkouts(ws => ws.filter(w => w.id !== id));
  };

  const filtered = workouts.filter(w =>
    !search ||
    (w.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (w.focus ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="adm-center">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-hdr">
        <h1>Workouts <span className="adm-count">{workouts.length}</span></h1>
      </div>
      <input className="adm-input adm-search" placeholder="Filter by user or focus…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr>
            <th>Date</th><th>User</th><th>Focus</th><th>Duration</th><th>Exercises</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id}>
                <td className="adm-mono">{w.date.slice(0, 10)}</td>
                <td>{w.username ?? <span className="adm-muted">—</span>}</td>
                <td>{w.focus ?? <span className="adm-muted">—</span>}</td>
                <td>{fmtDur(w.duration)}</td>
                <td className="adm-muted">{w.exercise_count}</td>
                <td className="adm-actions">
                  <button className="adm-btn-sm adm-btn-danger" onClick={() => del(w.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PRs ───────────────────────────────────────────────────────────────────────

function PRsPage({ authFetch }: { authFetch: AuthFetch }) {
  const [prs,     setPrs]     = useState<PRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    authFetch("/api/admin/prs")
      .then(r => r.json()).then(setPrs)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const del = async (id: number) => {
    if (!confirm("Delete this PR?")) return;
    await authFetch(`/api/admin/prs/${id}`, { method: "DELETE" });
    setPrs(ps => ps.filter(p => p.id !== id));
  };

  const filtered = prs.filter(p =>
    !search ||
    (p.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="adm-center">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-hdr">
        <h1>Personal Records <span className="adm-count">{prs.length}</span></h1>
      </div>
      <input className="adm-input adm-search" placeholder="Filter by user or exercise…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr>
            <th>Date</th><th>User</th><th>Exercise</th><th>Weight</th><th>Reps</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="adm-mono">{p.date.slice(0, 10)}</td>
                <td>{p.username ?? <span className="adm-muted">—</span>}</td>
                <td>{p.name}</td>
                <td>{p.weight}{p.is_cardio ? " min" : " kg"}</td>
                <td>{p.reps > 0 ? `×${p.reps}` : <span className="adm-muted">—</span>}</td>
                <td className="adm-actions">
                  <button className="adm-btn-sm adm-btn-danger" onClick={() => del(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Feedback ──────────────────────────────────────────────────────────────────

function FeedbackPage({ authFetch }: { authFetch: AuthFetch }) {
  const [items,   setItems]   = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | "open" | "resolved" | "dismissed">("open");
  const [busyId,  setBusyId]  = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    authFetch("/api/admin/feedback")
      .then(r => r.json()).then(setItems)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const setStatus = async (id: number, status: "open" | "resolved" | "dismissed") => {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated: FeedbackRow = await res.json();
        setItems(prev => prev.map(it => it.id === id ? updated : it));
      }
    } finally {
      setBusyId(null);
    }
  };

  const del = async (id: number) => {
    if (!confirm("Permanently delete this feedback?")) return;
    await authFetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const fmtTs = (ms: number) => {
    if (!ms) return "—";
    const d = new Date(ms);
    return d.toLocaleString();
  };

  const filtered = items.filter(it => filter === "all" || it.status === filter);
  const counts = {
    all:       items.length,
    open:      items.filter(it => it.status === "open").length,
    resolved:  items.filter(it => it.status === "resolved").length,
    dismissed: items.filter(it => it.status === "dismissed").length,
  };

  if (loading) return <div className="adm-center">Loading…</div>;

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "open",      label: `Open (${counts.open})`           },
    { key: "resolved",  label: `Resolved (${counts.resolved})`   },
    { key: "dismissed", label: `Dismissed (${counts.dismissed})` },
    { key: "all",       label: `All (${counts.all})`             },
  ];

  return (
    <div className="adm-page">
      <div className="adm-page-hdr">
        <h1>Feedback <span className="adm-count">{items.length}</span></h1>
      </div>
      <div className="adm-fb-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`adm-fb-filter${filter === f.key ? " active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="adm-fb-empty">No feedback in this category.</div>
      ) : (
        <div className="adm-fb-list">
          {filtered.map(it => (
            <div key={it.id} className={`adm-fb-card adm-fb-status-${it.status}`}>
              <div className="adm-fb-card-hdr">
                <span className={`adm-fb-kind adm-fb-kind-${it.kind}`}>{it.kind}</span>
                <span className={`adm-fb-status adm-fb-status-pill-${it.status}`}>{it.status}</span>
                <span className="adm-fb-meta">
                  {it.username ? `@${it.username}` : "anonymous"}
                  {it.name && <span className="adm-muted"> · {it.name}</span>}
                  <span className="adm-muted"> · {fmtTs(it.created_at)}</span>
                </span>
              </div>
              <div className="adm-fb-msg">{it.message}</div>
              <div className="adm-fb-actions">
                {it.status !== "resolved" && (
                  <button
                    className="adm-btn-sm adm-btn-resolve"
                    disabled={busyId === it.id}
                    onClick={() => setStatus(it.id, "resolved")}
                  >Resolve</button>
                )}
                {it.status !== "dismissed" && (
                  <button
                    className="adm-btn-sm"
                    disabled={busyId === it.id}
                    onClick={() => setStatus(it.id, "dismissed")}
                  >Dismiss</button>
                )}
                {it.status !== "open" && (
                  <button
                    className="adm-btn-sm"
                    disabled={busyId === it.id}
                    onClick={() => setStatus(it.id, "open")}
                  >Reopen</button>
                )}
                <button
                  className="adm-btn-sm adm-btn-danger"
                  onClick={() => del(it.id)}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quotes ────────────────────────────────────────────────────────────────────
// All five quote "buckets" share one editor table. Hero calls use the `line2`
// field for the second-line accent; other buckets leave it empty. PRO quotes
// also use `source` for the attribution.

type QuoteBucket = "bro" | "grl" | "pro" | "hero_bro" | "hero_grl";

interface QuoteRow {
  id: number;
  bucket: QuoteBucket;
  text: string;
  source: string | null;
  line2: string | null;
  sort: number;
}

const BUCKET_LABEL: Record<QuoteBucket, string> = {
  bro: "Bro", grl: "Girl", pro: "Pro / attribution",
  hero_bro: "Hero call (bro)", hero_grl: "Hero call (girl)",
};

function QuotesPage({ authFetch }: { authFetch: AuthFetch }) {
  const [items,   setItems]   = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket,  setBucket]  = useState<QuoteBucket>("bro");
  const [editing, setEditing] = useState<QuoteRow | null>(null);
  const [adding,  setAdding]  = useState<boolean>(false);
  const [form,    setForm]    = useState<{ text: string; source: string; line2: string }>({ text: "", source: "", line2: "" });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/content/quotes").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const open = (q: QuoteRow | null) => {
    if (q) {
      setEditing(q); setAdding(false);
      setForm({ text: q.text, source: q.source ?? "", line2: q.line2 ?? "" });
    } else {
      setEditing(null); setAdding(true);
      setForm({ text: "", source: "", line2: "" });
    }
    setErr("");
  };
  const close = () => { setEditing(null); setAdding(false); };

  const save = async () => {
    setSaving(true); setErr("");
    const body = {
      bucket, text: form.text.trim(),
      source: form.source.trim() || null,
      line2:  form.line2.trim()  || null,
      sort: editing?.sort ?? items.filter(i => i.bucket === bucket).length,
    };
    try {
      const res = editing
        ? await authFetch(`/api/content/quotes/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await authFetch("/api/content/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setErr(`Save failed: ${res.status}`); return; }
      close(); refresh();
    } finally { setSaving(false); }
  };

  const del = async (q: QuoteRow) => {
    if (!confirm("Delete this quote? Cannot be undone.")) return;
    const res = await authFetch(`/api/content/quotes/${q.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== q.id));
  };

  if (loading) return <div className="adm-center">Loading…</div>;

  const filtered = items.filter(i => i.bucket === bucket);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Quotes ({items.length})</h1>
        <button className="adm-btn-primary" onClick={() => open(null)}>+ New quote</button>
      </div>

      <div className="adm-filter-bar">
        {(Object.keys(BUCKET_LABEL) as QuoteBucket[]).map(b => (
          <button key={b}
            className={`adm-filter-btn${bucket === b ? " active" : ""}`}
            onClick={() => setBucket(b)}>
            {BUCKET_LABEL[b]} ({items.filter(i => i.bucket === b).length})
          </button>
        ))}
      </div>

      <table className="adm-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>#</th>
            <th>Text</th>
            {bucket === "pro" && <th style={{ width: 180 }}>Source</th>}
            {(bucket === "hero_bro" || bucket === "hero_grl") && <th style={{ width: 180 }}>Line 2</th>}
            <th style={{ width: 140 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q, i) => (
            <tr key={q.id}>
              <td>{i + 1}</td>
              <td style={{ whiteSpace: "pre-wrap" }}>{q.text}</td>
              {bucket === "pro" && <td>{q.source ?? ""}</td>}
              {(bucket === "hero_bro" || bucket === "hero_grl") && <td>{q.line2 ?? ""}</td>}
              <td>
                <button className="adm-btn-ghost" onClick={() => open(q)}>Edit</button>
                <button className="adm-btn-danger" onClick={() => del(q)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(editing || adding) && (
        <Modal title={editing ? "Edit quote" : `New ${BUCKET_LABEL[bucket]} quote`} onClose={close}>
          <Field label="Text">
            <textarea className="adm-input" rows={3} value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          </Field>
          {bucket === "pro" && (
            <Field label="Source (attribution)">
              <input className="adm-input" value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
            </Field>
          )}
          {(bucket === "hero_bro" || bucket === "hero_grl") && (
            <Field label="Line 2 (accent)">
              <input className="adm-input" value={form.line2}
                onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} />
            </Field>
          )}
          {err && <p className="adm-err">{err}</p>}
          <div className="adm-modal-actions">
            <button className="adm-btn-ghost" onClick={close} disabled={saving}>Cancel</button>
            <button className="adm-btn-primary" onClick={save} disabled={saving || !form.text.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ── Tips ──────────────────────────────────────────────────────────────────────

interface TipRow {
  id: string;
  icon: string;
  title: string;
  body: string;
  body_bro: string | null;
  body_grl: string | null;
  sort: number;
}

function TipsPage({ authFetch }: { authFetch: AuthFetch }) {
  const [items,   setItems]   = useState<TipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TipRow | null>(null);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState<TipRow>({ id: "", icon: "Target", title: "", body: "", body_bro: "", body_grl: "", sort: 0 });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/content/tips").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const open = (t: TipRow | null) => {
    if (t) {
      setEditing(t); setAdding(false);
      setForm({ ...t, body_bro: t.body_bro ?? "", body_grl: t.body_grl ?? "" });
    } else {
      setEditing(null); setAdding(true);
      setForm({ id: "", icon: "Target", title: "", body: "", body_bro: "", body_grl: "", sort: items.length });
    }
    setErr("");
  };
  const close = () => { setEditing(null); setAdding(false); };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      let res: Response;
      if (editing) {
        const { id: _id, ...patch } = form;
        void _id;
        res = await authFetch(`/api/content/tips/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...patch, body_bro: patch.body_bro || null, body_grl: patch.body_grl || null }),
        });
      } else {
        res = await authFetch("/api/content/tips", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, body_bro: form.body_bro || null, body_grl: form.body_grl || null }),
        });
      }
      if (!res.ok) { setErr(`Save failed: ${res.status}`); return; }
      close(); refresh();
    } finally { setSaving(false); }
  };

  const del = async (t: TipRow) => {
    if (!confirm("Delete this tip?")) return;
    const res = await authFetch(`/api/content/tips/${t.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== t.id));
  };

  if (loading) return <div className="adm-center">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Coaching tips ({items.length})</h1>
        <button className="adm-btn-primary" onClick={() => open(null)}>+ New tip</button>
      </div>

      <table className="adm-table">
        <thead>
          <tr>
            <th style={{ width: 120 }}>ID</th>
            <th style={{ width: 100 }}>Icon</th>
            <th style={{ width: 180 }}>Title</th>
            <th>Body</th>
            <th style={{ width: 140 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(t => (
            <tr key={t.id}>
              <td><code>{t.id}</code></td>
              <td>{t.icon}</td>
              <td>{t.title}</td>
              <td style={{ whiteSpace: "pre-wrap" }}>{t.body}</td>
              <td>
                <button className="adm-btn-ghost" onClick={() => open(t)}>Edit</button>
                <button className="adm-btn-danger" onClick={() => del(t)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(editing || adding) && (
        <Modal title={editing ? `Edit tip — ${editing.id}` : "New tip"} onClose={close}>
          {adding && (
            <Field label="ID (unique, lowercase_with_underscores)">
              <input className="adm-input" value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
            </Field>
          )}
          <Field label="Icon (lucide name, e.g. Timer, Beef, Target)">
            <input className="adm-input" value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
          </Field>
          <Field label="Title">
            <input className="adm-input" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Body (default tone)">
            <textarea className="adm-input" rows={3} value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </Field>
          <Field label="Body — bro tone (optional)">
            <textarea className="adm-input" rows={3} value={form.body_bro ?? ""}
              onChange={e => setForm(f => ({ ...f, body_bro: e.target.value }))} />
          </Field>
          <Field label="Body — girl tone (optional)">
            <textarea className="adm-input" rows={3} value={form.body_grl ?? ""}
              onChange={e => setForm(f => ({ ...f, body_grl: e.target.value }))} />
          </Field>
          {err && <p className="adm-err">{err}</p>}
          <div className="adm-modal-actions">
            <button className="adm-btn-ghost" onClick={close} disabled={saving}>Cancel</button>
            <button className="adm-btn-primary" onClick={save} disabled={saving || !form.title || !form.body || (adding && !form.id)}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ── Motions ───────────────────────────────────────────────────────────────────
// A directory of every saved animation, with links into the existing
// /exercise-graphics/editor for the actual keyframe editing.

interface MotionRow {
  exercise_id: string;
  name: string;
  category: string | null;
  duration: number | null;
  bench: boolean;
  floor: boolean;
  rig: { feet?: string; arm2?: string; leg2?: string };
  frames: unknown[];
}

function MotionsPage({ authFetch }: { authFetch: AuthFetch }) {
  const [items,   setItems]   = useState<MotionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/content/motions").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const del = async (m: MotionRow) => {
    if (!confirm(`Delete ${m.name}? Frontend will fall back to the bundled default until re-saved.`)) return;
    const res = await authFetch(`/api/content/motions/${m.exercise_id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.exercise_id !== m.exercise_id));
  };

  if (loading) return <div className="adm-center">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Motion animations ({items.length})</h1>
        <a className="adm-btn-primary" href="/exercise-graphics" target="_blank" rel="noreferrer">
          Open gallery →
        </a>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Each row is one stick-figure animation persisted in the database. Use the in-app keyframe editor (link below)
        to drag joints; saving from there writes back to this table.
      </p>

      <table className="adm-table">
        <thead>
          <tr>
            <th style={{ width: 140 }}>ID</th>
            <th>Name</th>
            <th style={{ width: 90 }}>Category</th>
            <th style={{ width: 80 }}>Duration</th>
            <th style={{ width: 70 }}>Frames</th>
            <th style={{ width: 90 }}>Bench</th>
            <th style={{ width: 90 }}>Floor</th>
            <th style={{ width: 200 }}>Rig</th>
            <th style={{ width: 180 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(m => (
            <tr key={m.exercise_id}>
              <td><code>{m.exercise_id}</code></td>
              <td>{m.name}</td>
              <td>{m.category ?? "—"}</td>
              <td>{m.duration ? `${m.duration}ms` : "—"}</td>
              <td>{m.frames.length}</td>
              <td>{m.bench ? "yes" : "—"}</td>
              <td>{m.floor ? "yes" : "—"}</td>
              <td style={{ fontSize: 11 }}>
                feet:{m.rig?.feet ?? "oval"} · arm2:{m.rig?.arm2 ?? "none"} · leg2:{m.rig?.leg2 ?? "none"}
              </td>
              <td>
                <a className="adm-btn-ghost" href={`/exercise-editor?id=${m.exercise_id}`}
                   target="_blank" rel="noreferrer">Edit keyframes</a>
                <button className="adm-btn-danger" onClick={() => del(m)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ── Shared primitives ─────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="adm-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="adm-field">
      <label className="adm-label">{label}</label>
      {children}
    </div>
  );
}
