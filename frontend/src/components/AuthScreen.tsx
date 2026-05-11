import { useState } from "react";

interface Props {
  onLogin: (token: string) => void;
}

export default function AuthScreen({ onLogin }: Props) {
  const [view,    setView]    = useState<"login" | "register">("login");
  const [user,    setUser]    = useState("");
  const [pass,    setPass]    = useState("");
  const [err,     setErr]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (view === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) { setErr((await res.json()).detail); return; }
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: user, password: pass }),
    });
    if (!res.ok) { setErr((await res.json()).detail); return; }
    const data = await res.json();
    localStorage.setItem("iron_log_token", data.access_token);
    onLogin(data.access_token);
  };

  return (
    <div className="wt-auth-screen tab-anim">
      <div className="auth-card">
        <img src="/logo.png" alt="Gamgee" className="auth-logo" />
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Username"
            value={user}
            onChange={e => setUser(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete="current-password"
          />
          {err && <p className="auth-err">{err}</p>}
          <button type="submit" className="auth-submit">
            {view === "login" ? "Sign In" : "Register"}
          </button>
        </form>
        <button
          className="auth-toggle"
          onClick={() => { setView(v => v === "login" ? "register" : "login"); setErr(""); }}
        >
          {view === "login" ? "Need an account? Register" : "Have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}
