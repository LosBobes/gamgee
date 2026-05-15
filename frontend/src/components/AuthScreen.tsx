import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Trophy, Activity, Brain } from "lucide-react";
import { useTxt } from "../context/ToneContext";

interface Props {
  onLogin: (token: string) => void;
  /** Optional initial view (used when the page is reached via an email link). */
  initialView?: View;
  /** Token from a password-reset or email-verify URL. */
  initialToken?: string;
}

type View = "login" | "register" | "forgot" | "reset" | "verify";
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

export default function AuthScreen({ onLogin, initialView = "login", initialToken = "" }: Props) {
  const [view,    setView]    = useState<View>(initialView);
  const [user,    setUser]    = useState("");
  const [pass,    setPass]    = useState("");
  const [pass2,   setPass2]   = useState("");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [gender,  setGender]  = useState<Gender>("");
  const [showPw,  setShowPw]  = useState(false);
  const [err,     setErr]     = useState("");
  const [info,    setInfo]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [token,   setToken]   = useState(initialToken);
  // Trainer signup add-on
  const [asTrainer,           setAsTrainer]           = useState(false);
  const [trainerBio,          setTrainerBio]          = useState("");
  const [trainerSpecialties,  setTrainerSpecialties]  = useState("");
  const [trainerCerts,        setTrainerCerts]        = useState("");
  const [trainerYears,        setTrainerYears]        = useState("");

  // When mounted in "verify" mode, hit the backend immediately.
  useEffect(() => {
    if (view !== "verify" || !token) return;
    let cancelled = false;
    (async () => {
      setBusy(true); setErr(""); setInfo("");
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) {
          setInfo("Email verified — you can now sign in.");
        } else {
          setErr(extractError(await res.json().catch(() => ({}))) || "This verification link is invalid or expired.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const t        = useTxt();
  const checks   = useMemo(() => pwChecks(pass, user, email), [pass, user, email]);
  const strength = useMemo(() => pwStrength(pass), [pass]);
  const allPwOk  = checks.every(c => c.ok);
  const pwMatch  = pass.length > 0 && pass === pass2;

  const goto = (next: View) => {
    // Clean URL when leaving an email-link view so a refresh doesn't reuse a
    // burned token.
    if ((view === "reset" || view === "verify") && window.history.replaceState) {
      window.history.replaceState({}, "", "/");
    }
    setView(next);
    setErr(""); setInfo("");
    setPass(""); setPass2("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo("");

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
      if (asTrainer) {
        if (trainerBio.trim().length < 20) {
          setErr("Trainer bio must be at least 20 characters");
          return;
        }
        const specialties = trainerSpecialties.split(",").map(s => s.trim()).filter(Boolean);
        if (specialties.length === 0) {
          setErr("Add at least one specialty (e.g. powerlifting, weight loss)");
          return;
        }
        if (!trainerYears || isNaN(parseInt(trainerYears, 10))) {
          setErr("Years of experience is required");
          return;
        }
      }
    } else if (view === "reset") {
      if (!token) {
        setErr("This reset link is invalid or has expired.");
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
    } else if (view === "forgot") {
      if (!EMAIL_RE.test(email.trim())) {
        setErr("Please enter a valid email address");
        return;
      }
    } else if (view === "login") {
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
        const endpoint = asTrainer ? "/api/auth/register-trainer" : "/api/auth/register";
        const body = asTrainer
          ? {
              username: user.trim(),
              password: pass,
              name:     name.trim(),
              email:    email.trim().toLowerCase(),
              gender,
              bio:      trainerBio.trim(),
              specialties: trainerSpecialties.split(",").map(s => s.trim()).filter(Boolean),
              certifications: trainerCerts.trim(),
              years_experience: parseInt(trainerYears, 10) || 0,
            }
          : {
              username: user.trim(),
              password: pass,
              name:     name.trim(),
              email:    email.trim().toLowerCase(),
              gender,
            };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setErr(extractError(await res.json().catch(() => ({}))));
          return;
        }
      }
      if (view === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        if (!res.ok && res.status !== 202) {
          setErr(extractError(await res.json().catch(() => ({}))));
          return;
        }
        setInfo("If that email is registered, a reset link is on its way. Check your inbox (and spam folder).");
        return;
      }
      if (view === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_password: pass }),
        });
        if (!res.ok) {
          setErr(extractError(await res.json().catch(() => ({}))) || "This reset link is invalid or expired.");
          return;
        }
        // Burn the token from the URL so refresh doesn't re-submit.
        if (window.history.replaceState) window.history.replaceState({}, "", "/");
        setInfo("Password updated — sign in with your new password.");
        setToken("");
        setView("login");
        return;
      }
      // login (also the tail-end of register).
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

  // ── Render helpers ─────────────────────────────────────────────────────────

  const heading =
    view === "login"    ? t("Welcome back", "Welcome back, beast!", "Welcome back, bestie") :
    view === "register" ? t("Create your account", "Join the Church of Iron", "Join the Sisterhood of Iron") :
    view === "forgot"   ? "Forgot your password?" :
    view === "reset"    ? "Choose a new password" :
                          "Verifying your email…";

  return (
    <div className="wt-auth-screen tab-anim">
      <div className="auth-shell">
        <section className="auth-hero" aria-labelledby="auth-hero-title">
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
        <h2>{heading}</h2>

        {view === "verify" ? (
          <>
            {busy && <p className="auth-hint">Working on it…</p>}
            {info && <p className="auth-hint auth-hint-ok">{info}</p>}
            {err  && <p className="auth-err">{err}</p>}
            <button className="auth-submit" onClick={() => goto("login")}>
              Continue to sign in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {(view === "login" || view === "register") && (
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
            )}

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

                <label className="auth-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={asTrainer}
                    onChange={e => setAsTrainer(e.target.checked)}
                  />
                  <span style={{ marginBottom: 0 }}>I'm signing up as a trainer / coach</span>
                </label>

                {asTrainer && (
                  <>
                    <label className="auth-field">
                      <span>Coaching bio</span>
                      <textarea
                        placeholder="What do you specialise in? How do you coach? (shown on your public profile)"
                        value={trainerBio}
                        onChange={e => setTrainerBio(e.target.value)}
                        rows={4}
                        maxLength={2000}
                      />
                      <small className="auth-hint">
                        At least 20 characters. This appears in the trainer directory.
                      </small>
                    </label>
                    <label className="auth-field">
                      <span>Specialties (comma separated)</span>
                      <input
                        placeholder="powerlifting, hypertrophy, weight loss"
                        value={trainerSpecialties}
                        onChange={e => setTrainerSpecialties(e.target.value)}
                        maxLength={400}
                      />
                    </label>
                    <label className="auth-field">
                      <span>Certifications (optional)</span>
                      <input
                        placeholder="e.g. NASM-CPT, USAPL coach"
                        value={trainerCerts}
                        onChange={e => setTrainerCerts(e.target.value)}
                        maxLength={2000}
                      />
                    </label>
                    <label className="auth-field">
                      <span>Years of coaching experience</span>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        placeholder="e.g. 3"
                        value={trainerYears}
                        onChange={e => setTrainerYears(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </>
            )}

            {view === "forgot" && (
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
                <small className="auth-hint">
                  Enter the email tied to your account. We'll send you a link to choose a new password.
                </small>
              </label>
            )}

            {(view === "login" || view === "register" || view === "reset") && (
              <label className="auth-field">
                <span>
                  {view === "reset" ? "New password" : "Password"}
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
                  placeholder={view === "register" || view === "reset" ? `At least ${PW_MIN} characters` : "password"}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete={view === "register" || view === "reset" ? "new-password" : "current-password"}
                  maxLength={PW_MAX}
                  required
                />
              </label>
            )}

            {(view === "register" || view === "reset") && (
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

            {err  && <p className="auth-err">{err}</p>}
            {info && <p className="auth-hint auth-hint-ok">{info}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={busy}
            >
              {busy
                ? t("Please wait…", "Hang tight…", "One sec, bestie…")
                : view === "login"    ? t("Sign In", "LET'S GO", "LET'S GO, BESTIE")
                : view === "register" ? t("Create account", "BUILD MY ACCOUNT", "MAKE IT OFFICIAL")
                : view === "forgot"   ? "Send reset link"
                :                       "Update password"}
            </button>
          </form>
        )}

        {view === "login" && (
          <>
            <button className="auth-toggle" onClick={() => goto("forgot")}>
              Forgot your password?
            </button>
            <button className="auth-toggle" onClick={() => goto("register")}>
              {t("Need an account? Register", "New here? Join the Church of Iron", "New here? Join the Sisterhood")}
            </button>
          </>
        )}
        {view === "register" && (
          <button className="auth-toggle" onClick={() => goto("login")}>
            {t("Have an account? Sign In", "Already a Disciple? Sign in", "Already in the group chat? Sign in")}
          </button>
        )}
        {(view === "forgot" || view === "reset") && (
          <button className="auth-toggle" onClick={() => goto("login")}>
            ← Back to sign in
          </button>
        )}
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
