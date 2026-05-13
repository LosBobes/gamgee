import { useMemo, useState } from "react";
import { Dumbbell, Trophy, Activity, Brain } from "lucide-react";
import { useTxt } from "../context/ToneContext";

interface Props {
  onLogin: (token: string) => void;
}

type View = "login" | "register";
type Gender = "" | "female" | "male" | "non_binary" | "other" | "prefer_not_to_say";

const GENDER_OPTIONS: { value: Exclude<Gender, "">; label: string }[] = [
  { value: "female",            label: "Female"              },
  { value: "male",              label: "Male"                },
  { value: "non_binary",        label: "Non-binary"          },
  { value: "other",             label: "Other"               },
  { value: "prefer_not_to_say", label: "Prefer not to say"   },
];

// Mirrors backend/app/password_policy.py so the UI can give live feedback.
const PW_MIN = 12;
const PW_MAX = 128;
const COMMON_PWS = new Set([
  "password","password1","password123","passw0rd","p@ssw0rd",
  "qwerty","qwerty123","qwertyuiop","asdfghjkl","zxcvbnm",
  "123456","1234567","12345678","123456789","1234567890",
  "111111","000000","abc123","iloveyou","admin","administrator",
  "welcome","welcome1","letmein","monkey","dragon","master",
  "sunshine","princess","football","baseball","shadow",
  "gamgee","gamgee123","fitness","workout","trustno1",
]);

const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
const USERNAME_RE = /^[A-Za-z0-9_.\-]+$/;

interface PwCheck {
  label: string;
  ok: boolean;
}

function pwChecks(pw: string, username: string, email: string): PwCheck[] {
  const lower = pw.toLowerCase();
  const local = email.split("@", 1)[0]?.toLowerCase() ?? "";
  return [
    { label: `At least ${PW_MIN} characters`,   ok: pw.length >= PW_MIN && pw.length <= PW_MAX },
    { label: "Uppercase letter (A-Z)",          ok: /[A-Z]/.test(pw) },
    { label: "Lowercase letter (a-z)",          ok: /[a-z]/.test(pw) },
    { label: "Digit (0-9)",                     ok: /\d/.test(pw) },
    { label: "Symbol (!@#$…)",                  ok: /[^A-Za-z0-9]/.test(pw) },
    { label: "Not a common password",           ok: pw.length > 0 && !COMMON_PWS.has(lower) },
    {
      label: "Doesn't contain your name/email",
      ok:
        pw.length > 0 &&
        !(username && username.length >= 3 && lower.includes(username.toLowerCase())) &&
        !(local    && local.length    >= 3 && lower.includes(local)),
    },
  ];
}

function pwStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw)              return { score: 0, label: "—"        };
  let score = 0;
  if (pw.length >= 8)   score++;
  if (pw.length >= 12)  score++;
  if (pw.length >= 16)  score++;
  const classes =
    (/[a-z]/.test(pw) ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/\d/.test(pw)    ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  if (classes >= 3) score++;
  if (COMMON_PWS.has(pw.toLowerCase())) score = 0;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: ["Very weak", "Weak", "Fair", "Strong", "Excellent"][clamped] };
}

export default function AuthScreen({ onLogin }: Props) {
  const [view,    setView]    = useState<View>("login");
  const [user,    setUser]    = useState("");
  const [pass,    setPass]    = useState("");
  const [pass2,   setPass2]   = useState("");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [gender,  setGender]  = useState<Gender>("");
  const [showPw,  setShowPw]  = useState(false);
  const [err,     setErr]     = useState("");
  const [busy,    setBusy]    = useState(false);

  const t        = useTxt();
  const checks   = useMemo(() => pwChecks(pass, user, email), [pass, user, email]);
  const strength = useMemo(() => pwStrength(pass), [pass]);
  const allPwOk  = checks.every(c => c.ok);
  const pwMatch  = pass.length > 0 && pass === pass2;

  const reset = (next: View) => {
    setView(next);
    setErr("");
    setPass("");
    setPass2("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const username = user.trim();

    if (view === "register") {
      if (!username) {
        setErr("Username is required");
        return;
      }
      if (username.length < 3) {
        setErr("Username must be at least 3 characters");
        return;
      }
      if (username.length > 50) {
        setErr("Username must be at most 50 characters");
        return;
      }
      if (!USERNAME_RE.test(username)) {
        setErr("Username may only contain letters, digits, '.', '_' or '-'");
        return;
      }
      if (!name.trim()) {
        setErr("Name is required");
        return;
      }
      if (!EMAIL_RE.test(email.trim())) {
        setErr("Please enter a valid email address");
        return;
      }
      if (!gender) {
        setErr("Please select a gender option");
        return;
      }
      if (!allPwOk) {
        const failed = checks.filter(c => !c.ok).map(c => c.label).join("; ");
        setErr(`Password does not meet the requirements: ${failed}`);
        return;
      }
      if (!pwMatch) {
        setErr("Passwords do not match");
        return;
      }
    } else {
      if (!username) {
        setErr("Username is required");
        return;
      }
      if (!pass) {
        setErr("Password is required");
        return;
      }
    }

    setBusy(true);
    try {
      if (view === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.trim(),
            password: pass,
            name:     name.trim(),
            email:    email.trim().toLowerCase(),
            gender,
          }),
        });
        if (!res.ok) {
          setErr(extractError(await res.json().catch(() => ({}))));
          return;
        }
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: user.trim(), password: pass }),
      });
      if (!res.ok) {
        setErr(extractError(await res.json().catch(() => ({}))));
        return;
      }
      const data = await res.json();
      localStorage.setItem("iron_log_token", data.access_token);
      onLogin(data.access_token);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wt-auth-screen tab-anim">
      <div className="auth-shell">
        <section className="auth-hero" aria-labelledby="auth-hero-title">
          <div className="auth-hero-logo" role="img" aria-label="Gamgee" />
          <h1 id="auth-hero-title" className="auth-hero-title">GAMGEE</h1>
          <p className="auth-hero-tagline">
            Your strength training companion — log workouts, track personal records,
            and watch your progress map across every muscle.
          </p>
          <ul className="auth-hero-features">
            <li>
              <Dumbbell size={18} aria-hidden="true" />
              <div>
                <strong>Log every set</strong>
                <span>Fast logging for weights, reps, and rest — built for the gym floor.</span>
              </div>
            </li>
            <li>
              <Trophy size={18} aria-hidden="true" />
              <div>
                <strong>Track personal records</strong>
                <span>Automatic PR detection and 1RM estimates as you lift heavier.</span>
              </div>
            </li>
            <li>
              <Activity size={18} aria-hidden="true" />
              <div>
                <strong>Visualize muscle coverage</strong>
                <span>An interactive body map shows what you trained and what's lagging.</span>
              </div>
            </li>
            <li>
              <Brain size={18} aria-hidden="true" />
              <div>
                <strong>Smart progression</strong>
                <span>A built-in coach suggests when to push, hold, or back off.</span>
              </div>
            </li>
          </ul>
          <p className="auth-hero-foot">Free to use. No ads. Your data stays yours.</p>
        </section>
      <div className="auth-card">
        <div className="auth-logo" role="img" aria-label="Gamgee" />
        <h2>{view === "login" ? t("Welcome back", "Welcome back, beast!", "Welcome back, bestie") : t("Create your account", "Join the Church of Iron", "Join the Sisterhood of Iron")}</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Username</span>
            <input
              placeholder={view === "register" ? "At least 3 characters" : "username"}
              value={user}
              onChange={e => setUser(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={50}
              required
            />
            {view === "register" && user.trim().length < 3 && (
              <small className="auth-hint auth-hint-warn">Username must be at least 3 characters</small>
            )}
            {view === "register" && user.trim().length >= 3 && !USERNAME_RE.test(user.trim()) && (
              <small className="auth-hint auth-hint-warn">Only letters, digits, '.', '_' or '-' allowed</small>
            )}
          </label>

          {view === "register" && (
            <>
              <label className="auth-field">
                <span>Name</span>
                <input
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                {email && !EMAIL_RE.test(email) && (
                  <small className="auth-hint auth-hint-warn">Please enter a valid email address</small>
                )}
              </label>

              <label className="auth-field">
                <span>Gender</span>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  required
                >
                  <option value="" disabled>Select…</option>
                  {GENDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="auth-field">
            <span>
              Password
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </span>
            <input
              type={showPw ? "text" : "password"}
              placeholder={view === "register" ? `At least ${PW_MIN} characters` : "password"}
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete={view === "register" ? "new-password" : "current-password"}
              maxLength={PW_MAX}
              required
            />
          </label>

          {view === "register" && (
            <>
              <div className={`pw-meter pw-meter-${strength.score}`} aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <div className="pw-strength-label">
                Strength: <strong>{strength.label}</strong>
              </div>
              <ul className="pw-checklist">
                {checks.map(c => (
                  <li key={c.label} className={c.ok ? "ok" : "bad"}>
                    <span className="pw-mark">{c.ok ? "✓" : "•"}</span> {c.label}
                  </li>
                ))}
              </ul>

              <label className="auth-field">
                <span>Repeat password</span>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={pass2}
                  onChange={e => setPass2(e.target.value)}
                  autoComplete="new-password"
                  maxLength={PW_MAX}
                  required
                />
                {pass2.length > 0 && !pwMatch && (
                  <small className="auth-hint auth-hint-warn">Passwords do not match</small>
                )}
                {pass2.length > 0 && pwMatch && (
                  <small className="auth-hint auth-hint-ok">Passwords match</small>
                )}
              </label>
            </>
          )}

          {err && <p className="auth-err">{err}</p>}

          <button
            type="submit"
            className="auth-submit"
            disabled={busy}
          >
            {busy ? t("Please wait…", "Hang tight…", "One sec, bestie…") : view === "login" ? t("Sign In", "LET'S GO", "LET'S GO, BESTIE") : t("Create account", "BUILD MY ACCOUNT", "MAKE IT OFFICIAL")}
          </button>
        </form>
        <button
          className="auth-toggle"
          onClick={() => reset(view === "login" ? "register" : "login")}
        >
          {view === "login" ? t("Need an account? Register", "New here? Join the Church of Iron", "New here? Join the Sisterhood") : t("Have an account? Sign In", "Already a Disciple? Sign in", "Already in the group chat? Sign in")}
        </button>
      </div>
      </div>
    </div>
  );
}

function extractError(body: unknown): string {
  if (!body || typeof body !== "object") return "Something went wrong";
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(d => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
      .join("; ") || "Invalid input";
  }
  return "Something went wrong";
}
