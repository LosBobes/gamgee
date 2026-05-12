import { useState, useEffect, useCallback } from "react";
import "./AdminApp.css";

type Page = "users" | "exercises" | "workouts" | "prs" | "feedback";
type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

interface AdminUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  gender: string | null;
  primary_color: string | null;
  is_admin: boolean;
  is_verified: boolean;
}

interface ResetResult {
  mode: "password_set" | "reset_link_sent" | "reset_link_generated";
  temporary_password?: string | null;
  reset_link?: string | null;
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
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  useEffect(() => {
    authFetch("/api/admin/users")
      .then(r => r.json()).then(setUsers)
      .finally(() => setLoading(false));
  }, [authFetch]);

  const startEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({
      name: u.name ?? "", email: u.email ?? "", gender: u.gender ?? "",
      is_admin: u.is_admin, is_verified: u.is_verified,
    });
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
            <th>ID</th><th>Username</th><th>Name</th><th>Email</th><th>Gender</th><th>Admin</th><th>Verified</th><th></th>
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
                <td>
                  <span className={`adm-badge${u.is_verified ? " adm-badge-verified" : " adm-badge-unverified"}`}>
                    {u.is_verified ? "verified" : "unverified"}
                  </span>
                </td>
                <td className="adm-actions">
                  <button className="adm-btn-sm" onClick={() => startEdit(u)}>Edit</button>
                  <button className="adm-btn-sm" onClick={() => setResetting(u)}>Reset PW</button>
                  <button className="adm-btn-sm adm-btn-danger" onClick={() => deleteUser(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          authFetch={authFetch}
          onClose={() => setResetting(null)}
        />
      )}

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
          <label className="adm-checkbox">
            <input type="checkbox" checked={!!form.is_verified} onChange={e => setForm(f => ({ ...f, is_verified: e.target.checked }))} />
            Email verified
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

// ── Admin password reset modal ────────────────────────────────────────────────

function ResetPasswordModal({
  user, authFetch, onClose,
}: { user: AdminUser; authFetch: AuthFetch; onClose: () => void }) {
  const [mode, setMode] = useState<"link" | "password">("link");
  const [sendEmail, setSendEmail] = useState(true);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<ResetResult | null>(null);

  const canEmail = !!user.email;
  const pwOk =
    pw.length >= 12 && pw.length <= 128 &&
    /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const pwMatch = pw === pw2 && pw.length > 0;

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const body: Record<string, unknown> = { send_email: sendEmail && canEmail };
      if (mode === "password") {
        if (!pwOk)   { setErr("Password doesn't meet the policy (12+ chars, mixed case, digit, symbol)."); return; }
        if (!pwMatch) { setErr("Passwords don't match.");                                                   return; }
        body.new_password = pw;
      }
      const res = await authFetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        setErr(typeof detail?.detail === "string" ? detail.detail : "Reset failed");
        return;
      }
      setResult(await res.json());
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Modal title={`Password reset · @${user.username}`} onClose={onClose}>
        {result.mode === "password_set" && (
          <>
            <p>The password was set directly. {sendEmail && canEmail ? "An email with the new password has been sent." : "Hand the new password to the user securely."}</p>
            <p><strong>Temporary password:</strong></p>
            <pre className="adm-mono adm-pre">{result.temporary_password}</pre>
            <p className="adm-muted adm-small">Tell the user to change it on next sign-in.</p>
          </>
        )}
        {(result.mode === "reset_link_sent" || result.mode === "reset_link_generated") && (
          <>
            <p>
              {result.mode === "reset_link_sent"
                ? `A reset link has been emailed to ${user.email}.`
                : `Reset link generated. Share it with the user securely — they have 60 minutes.`}
            </p>
            <pre className="adm-mono adm-pre adm-break">{result.reset_link}</pre>
          </>
        )}
        <div className="adm-modal-actions">
          <button className="adm-btn-primary" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Reset password · @${user.username}`} onClose={onClose}>
      <div className="adm-field">
        <label className="adm-radio">
          <input type="radio" checked={mode === "link"} onChange={() => setMode("link")} />
          <span>
            <strong>Send a reset link</strong>{" "}
            <span className="adm-muted adm-small">(recommended — the user picks their own password)</span>
          </span>
        </label>
        <label className="adm-radio">
          <input type="radio" checked={mode === "password"} onChange={() => setMode("password")} />
          <span>
            <strong>Set a temporary password directly</strong>{" "}
            <span className="adm-muted adm-small">(useful if the user has no working email)</span>
          </span>
        </label>
      </div>

      {mode === "link" && (
        <p className="adm-muted adm-small">
          {canEmail
            ? `We'll generate a single-use link valid for 60 minutes${sendEmail ? ` and email it to ${user.email}` : " — the URL will be shown so you can deliver it out-of-band"}.`
            : "This user has no email on file — a link will be generated and shown here for you to share."}
        </p>
      )}

      {mode === "password" && (
        <>
          <Field label="New password (12+ chars, mixed case, digit, symbol)">
            <input className="adm-input" type="password" value={pw}  onChange={e => setPw(e.target.value)}  autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <input className="adm-input" type="password" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
          </Field>
          {pw && !pwOk    && <p className="adm-err adm-small">Password doesn't meet policy</p>}
          {pw2 && !pwMatch && <p className="adm-err adm-small">Passwords don't match</p>}
        </>
      )}

      {canEmail && (
        <label className="adm-checkbox">
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
          Email the user about this reset
        </label>
      )}

      {err && <p className="adm-err">{err}</p>}

      <div className="adm-modal-actions">
        <button
          className="adm-btn-primary"
          disabled={busy || (mode === "password" && (!pwOk || !pwMatch))}
          onClick={submit}
        >
          {busy ? "Working…" : mode === "link" ? "Send / generate link" : "Set password"}
        </button>
        <button className="adm-btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
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
