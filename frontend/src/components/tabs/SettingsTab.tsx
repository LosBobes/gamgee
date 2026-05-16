import { useState, useEffect } from "react";
import { Bell, BellOff, ShieldCheck, Download, Trash2, Upload, Moon } from "lucide-react";
import { useTxt, type ToneMode } from "../../context/ToneContext";
import { useOnboarding } from "../../context/OnboardingContext";
import {
  pushSupported, fetchPushPublicKey, getExistingSubscription,
  subscribePush, unsubscribePush,
} from "../../push";
import { APP_VERSION } from "../../version";
import { twoFactorApi, accountApi, importApi } from "../../data/extraApi";

type Gender = "female" | "male" | "non_binary" | "other" | "prefer_not_to_say";

const GENDER_OPTIONS: Array<{ id: Gender; label: string }> = [
  { id: "female",            label: "Female"            },
  { id: "male",              label: "Male"              },
  { id: "non_binary",        label: "Non-binary"        },
  { id: "other",             label: "Other"             },
  { id: "prefer_not_to_say", label: "Prefer not to say" },
];

interface Props {
  name:            string | null;
  email:           string | null;
  gender:          string | null;
  token:           string | null;
  primaryColor:    string;
  onColorChange:   (color: string) => void;
  onProfileUpdate: (name: string | null, email: string | null, gender: string | null) => void;
  toneMode:        ToneMode;
  onToneChange:    (mode: ToneMode) => void;
  authFetch:       (url: string, opts?: RequestInit) => Promise<Response>;
}

const PALETTE = [
  "#28D1FF", // cyan (default)
  "#4CA87C", // green
  "#8C70D8", // purple
  "#E8C547", // gold
  "#FF6B6B", // coral
  "#FF9F43", // orange
  "#5C90C0", // steel blue
  "#E879A0", // pink
];

function ToneToggle({ toneMode, onToneChange }: { toneMode: ToneMode; onToneChange: (m: ToneMode) => void }) {
  const proLabel = toneMode === "pro" ? "Professional"
                 : toneMode === "bro" ? "Boring Mode"
                 :                       "Neutral";
  const tones: Array<{ id: ToneMode; label: string }> = [
    { id: "pro", label: proLabel },
    { id: "bro", label: "BroScience" },
    { id: "grl", label: "Grl Pwr"  },
  ];
  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        App Tone
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {tones.map(({ id, label }) => {
          const active = toneMode === id;
          return (
            <button
              key={id}
              onClick={() => onToneChange(id)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#000" : "var(--muted)",
                border: active ? "none" : "1px solid var(--border)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorPicker({ color, onChange, token }: { color: string; onChange: (c: string) => void; token: string | null }) {
  const [saving, setSaving] = useState(false);
  const t = useTxt();

  const save = async (c: string) => {
    onChange(c);
    setSaving(true);
    try {
      await fetch("/api/auth/preferences", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body:    JSON.stringify({ primary_color: c }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-card">
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {saving ? "Saving…" : t("Accent color", "Your vibe", "Your aura")}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {PALETTE.map(c => (
          <button
            key={c}
            onClick={() => save(c)}
            title={c}
            style={{
              width: 30, height: 30, borderRadius: "50%", background: c, padding: 0,
              border: "none", cursor: "pointer", flexShrink: 0,
              outline: c.toLowerCase() === color.toLowerCase() ? `3px solid ${c}` : "none",
              outlineOffset: 3,
              boxShadow: c.toLowerCase() === color.toLowerCase() ? "0 0 0 1px var(--border)" : "none",
              transition: "outline 0.15s, box-shadow 0.15s",
            }}
          />
        ))}
        <label
          title="Custom color"
          style={{
            width: 30, height: 30, borderRadius: "50%", border: "2px dashed var(--border)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, overflow: "hidden",
            outline: !PALETTE.some(c => c.toLowerCase() === color.toLowerCase()) ? `3px solid ${color}` : "none",
            outlineOffset: 3,
          }}
        >
          <input
            type="color"
            value={color}
            onChange={e => save(e.target.value)}
            style={{ width: 40, height: 40, border: "none", padding: 0, cursor: "pointer", opacity: 0, position: "absolute" }}
          />
          <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1, pointerEvents: "none" }}>+</span>
        </label>
      </div>
    </div>
  );
}

function isGender(value: string | null): value is Gender {
  return value === "female" || value === "male" || value === "non_binary"
      || value === "other"  || value === "prefer_not_to_say";
}

function EditProfileCard({ name, email, gender, token, onSave }: {
  name:   string | null;
  email:  string | null;
  gender: string | null;
  token:  string | null;
  onSave: (name: string | null, email: string | null, gender: string | null) => void;
}) {
  const initialGender: Gender = isGender(gender) ? gender : "prefer_not_to_say";
  const [nameVal,   setNameVal]   = useState(name ?? "");
  const [emailVal,  setEmailVal]  = useState(email ?? "");
  const [genderVal, setGenderVal] = useState<Gender>(initialGender);
  const [err,       setErr]       = useState("");
  const [saving,    setSaving]    = useState(false);
  const [ok,        setOk]        = useState(false);

  useEffect(() => { setNameVal(name ?? ""); }, [name]);
  useEffect(() => { setEmailVal(email ?? ""); }, [email]);
  useEffect(() => { setGenderVal(isGender(gender) ? gender : "prefer_not_to_say"); }, [gender]);

  const changed =
    nameVal.trim() !== (name ?? "")
    || emailVal.trim() !== (email ?? "")
    || genderVal !== initialGender;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body:    JSON.stringify({
          name:   nameVal.trim(),
          email:  emailVal.trim() || null,
          gender: genderVal,
        }),
      });
      if (!res.ok) { setErr((await res.json()).detail ?? "Failed"); return; }
      const data = await res.json();
      onSave(data.name ?? null, data.email ?? null, data.gender ?? null);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-card">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          className="field-input"
          type="text"
          placeholder="Display name"
          value={nameVal}
          onChange={e => { setNameVal(e.target.value); setOk(false); }}
          maxLength={100}
          required
        />
        <input
          className="field-input"
          type="email"
          placeholder="Email address"
          value={emailVal}
          onChange={e => { setEmailVal(e.target.value); setOk(false); }}
          maxLength={254}
        />
        <select
          className="field-input"
          value={genderVal}
          onChange={e => { setGenderVal(e.target.value as Gender); setOk(false); }}
          aria-label="Gender"
        >
          {GENDER_OPTIONS.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        {err && <p className="auth-err">{err}</p>}
        {ok  && <p style={{ color: "var(--green)", fontSize: 12, margin: 0 }}>Saved.</p>}
        <button
          type="submit"
          className="btn-primary"
          disabled={!changed || saving || !nameVal.trim()}
          style={{ width: "auto" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function ChangePasswordCard({ token }: { token: string | null }) {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setErr(""); setOk(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk(false);
    if (next !== confirm) { setErr("New passwords do not match"); return; }
    if (next.length < 12) { setErr("New password must be at least 12 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ current_password: current, new_password: next }),
      });
      if (!res.ok) { setErr((await res.json()).detail ?? "Failed"); return; }
      setOk(true);
      reset();
      setOpen(false);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-card" style={{ marginTop: 12 }}>
      {ok && <p style={{ color: "var(--green)", fontSize: 12, marginBottom: 8 }}>Password changed successfully.</p>}
      {!open ? (
        <button className="auth-toggle" style={{ width: "100%", textAlign: "left" }} onClick={() => { setOpen(true); setOk(false); }}>
          Change Password
        </button>

      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="field-input"
            type="password"
            placeholder="Current password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
          <input
            className="field-input"
            type="password"
            placeholder="New password (min 12 chars)"
            value={next}
            onChange={e => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
          <input
            className="field-input"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {err && <p className="auth-err">{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, width: "auto" }}>
              {loading ? "Saving…" : "Save"}
            </button>
            <button type="button" className="auth-toggle" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PushToggleCard({ authFetch }: { authFetch: Props["authFetch"] }) {
  const t = useTxt();
  // null = still probing; otherwise concrete state.
  const [enabled,   setEnabled]   = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        if (!cancelled) { setAvailable(false); setEnabled(false); }
        return;
      }
      const [{ enabled: serverOn }, sub] = await Promise.all([
        fetchPushPublicKey(authFetch),
        getExistingSubscription(),
      ]);
      if (cancelled) return;
      setAvailable(serverOn);
      setEnabled(!!sub && serverOn);
    })().catch(() => {
      if (!cancelled) { setAvailable(false); setEnabled(false); }
    });
    return () => { cancelled = true; };
  }, [authFetch]);

  const toggle = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribePush(authFetch);
        setEnabled(false);
      } else {
        await subscribePush(authFetch);
        setEnabled(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update push settings.");
    } finally {
      setBusy(false);
    }
  };

  if (available === false) {
    return (
      <div className="profile-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BellOff size={16} style={{ color: "var(--muted)" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {t("Push notifications", "Push notifications", "Push notifications")}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {pushSupported()
                ? "Not enabled on this server"
                : "Your browser doesn't support push"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {enabled ? <Bell size={16} style={{ color: "var(--primary)" }} /> : <BellOff size={16} style={{ color: "var(--muted)" }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {t("Push notifications", "Push notifications", "Push notifications")}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {enabled
                ? t("On for this device", "Lit on this device", "Live on this device")
                : t("Get pinged when buddies lift, motivate, or set PRs",
                    "Get pinged when bros lift, hype, or hit PRs",
                    "Get pinged when besties lift, hype, or hit PRs")}
            </div>
          </div>
        </div>
        <button
          className={enabled ? "auth-toggle" : "btn-primary"}
          style={{ whiteSpace: "nowrap" }}
          onClick={toggle}
          disabled={busy || enabled === null}
        >
          {busy ? "…" : enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {err && <p className="auth-err" style={{ marginTop: 8, marginBottom: 0 }}>{err}</p>}
    </div>
  );
}

type NotifKind = "notify_workout" | "notify_pr" | "notify_motivate" | "notify_live";

const NOTIF_ROWS: Array<{ key: NotifKind; label: string; hint: string }> = [
  { key: "notify_workout",  label: "Workouts",      hint: "When a buddy finishes a session" },
  { key: "notify_pr",       label: "Personal records", hint: "When a buddy hits a new PR" },
  { key: "notify_motivate", label: "Motivations",   hint: "When a buddy sends you a hype message" },
  { key: "notify_live",     label: "Live sessions", hint: "When a buddy starts or ends a live workout" },
];

function NotificationTypesCard({ authFetch }: { authFetch: Props["authFetch"] }) {
  const [prefs, setPrefs] = useState<Record<NotifKind, boolean> | null>(null);
  const [busy, setBusy] = useState<NotifKind | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then((d: Record<string, unknown> | null) => {
        if (cancelled || !d) return;
        setPrefs({
          notify_workout:  d.notify_workout  !== false,
          notify_pr:       d.notify_pr       !== false,
          notify_motivate: d.notify_motivate !== false,
          notify_live:     d.notify_live     !== false,
        });
      })
      .catch(() => { if (!cancelled) setErr("Couldn't load notification settings."); });
    return () => { cancelled = true; };
  }, [authFetch]);

  const toggle = async (key: NotifKind) => {
    if (!prefs) return;
    const next = !prefs[key];
    setBusy(key);
    setErr(null);
    setPrefs({ ...prefs, [key]: next });
    try {
      const r = await authFetch("/api/auth/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!r.ok) {
        setPrefs(p => p && { ...p, [key]: !next });
        setErr("Couldn't save that change.");
      }
    } catch {
      setPrefs(p => p && { ...p, [key]: !next });
      setErr("Network error.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="profile-card">
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        What to notify me about
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {NOTIF_ROWS.map(({ key, label, hint }) => {
          const on = prefs?.[key] ?? true;
          const loading = busy === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              disabled={prefs === null || loading}
              className={`pref-toggle${on ? " on" : ""}`}
            >
              {on ? <Bell size={14} /> : <BellOff size={14} />}
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</span>
              </span>
              <span className={`pref-pill${on ? " on" : ""}`}>{loading ? "…" : on ? "ON" : "OFF"}</span>
            </button>
          );
        })}
      </div>
      {err && <p className="auth-err" style={{ marginTop: 8, marginBottom: 0 }}>{err}</p>}
    </div>
  );
}

function OnboardingCard() {
  const t = useTxt();
  const { openWelcome, resetHints, dismissedHints } = useOnboarding();
  const [hintsReset, setHintsReset] = useState(false);

  const handleResetHints = () => {
    resetHints();
    setHintsReset(true);
    setTimeout(() => setHintsReset(false), 2500);
  };

  return (
    <div className="profile-card">
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {t("Tour & hints", "Tour & hints", "Tour & hints")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" className="auth-toggle" style={{ textAlign: "left" }} onClick={openWelcome}>
          {t("Replay welcome tour", "Replay welcome tour", "Replay welcome tour")}
        </button>
        <button
          type="button"
          className="auth-toggle"
          style={{ textAlign: "left" }}
          onClick={handleResetHints}
          disabled={dismissedHints.size === 0}
        >
          {dismissedHints.size === 0
            ? t("No dismissed hints", "No dismissed hints", "No dismissed hints")
            : t(`Show ${dismissedHints.size} dismissed hint${dismissedHints.size === 1 ? "" : "s"} again`,
                `Show ${dismissedHints.size} dismissed hint${dismissedHints.size === 1 ? "" : "s"} again`,
                `Show ${dismissedHints.size} dismissed hint${dismissedHints.size === 1 ? "" : "s"} again`)}
        </button>
        {hintsReset && (
          <p style={{ color: "var(--green)", fontSize: 12, margin: 0 }}>Hints restored.</p>
        )}
      </div>
    </div>
  );
}

export default function SettingsTab({
  name, email, gender, token, primaryColor, onColorChange, onProfileUpdate,
  toneMode, onToneChange, authFetch,
}: Props) {
  const t = useTxt();

  return (
    <div className="tab-anim">
      <div className="profile-section">{t("Profile", "Profile")}</div>
      <EditProfileCard
        name={name}
        email={email}
        gender={gender}
        token={token}
        onSave={onProfileUpdate}
      />

      <div className="profile-section">{t("Appearance", "Appearance")}</div>
      <ToneToggle toneMode={toneMode} onToneChange={onToneChange} />
      <ColorPicker color={primaryColor} onChange={onColorChange} token={token} />

      <div className="profile-section">{t("Notifications", "Notifications")}</div>
      <PushToggleCard authFetch={authFetch} />
      <NotificationTypesCard authFetch={authFetch} />

      <div className="profile-section">{t("Guidance", "Guidance", "Guidance")}</div>
      <OnboardingCard />

      <div className="profile-section">{t("Theme", "Theme")}</div>
      <AmoledToggle />

      <div className="profile-section">{t("Account", "Account")}</div>
      <ChangePasswordCard token={token} />
      <TwoFactorCard authFetch={authFetch} />
      <ImportCsvCard authFetch={authFetch} />
      <DataAccountCard authFetch={authFetch} />

      <AboutCard authFetch={authFetch} />
    </div>
  );
}

function AboutCard({ authFetch }: { authFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const t = useTxt();
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/version")
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled && j?.version) setApiVersion(j.version); })
      .catch(() => { /* offline: leave blank */ });
    return () => { cancelled = true; };
  }, [authFetch]);

  return (
    <>
      <div className="profile-section">{t("About", "About", "About")}</div>
      <div className="profile-card">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}>
          <span>App version</span>
          <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{APP_VERSION}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
          <span>API version</span>
          <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{apiVersion ?? "—"}</span>
        </div>
      </div>
    </>
  );
}


// ── Two-factor authentication ────────────────────────────────────────────
function TwoFactorCard({ authFetch }: { authFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [status, setStatus] = useState<{ enrolled: boolean; enabled: boolean; recovery_codes_left: number } | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; otpauth_url: string; recovery_codes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    twoFactorApi.status(authFetch).then(setStatus).catch(() => setStatus(null));
  };
  useEffect(refresh, [authFetch]);

  const begin = async () => {
    setBusy(true); setMsg(null);
    try {
      const e = await twoFactorApi.enroll(authFetch);
      setEnroll(e);
    } catch (err) {
      setMsg(`Enroll failed: ${(err as Error).message}`);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await twoFactorApi.verify(authFetch, code.trim());
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `${res.status}`);
      }
      setEnroll(null);
      setCode("");
      setMsg("Two-factor enabled.");
      refresh();
    } catch (err) {
      setMsg(`Verification failed: ${(err as Error).message}`);
    } finally { setBusy(false); }
  };

  const disable = async () => {
    const pwd = prompt("Enter your password to disable 2FA");
    if (!pwd) return;
    setBusy(true); setMsg(null);
    try {
      const res = await twoFactorApi.disable(authFetch, pwd);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `${res.status}`);
      }
      setMsg("Two-factor disabled.");
      refresh();
    } catch (err) {
      setMsg(`Disable failed: ${(err as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
        <ShieldCheck size={12} /> Two-factor authentication
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
        {status?.enabled
          ? `Enabled. ${status.recovery_codes_left} recovery codes remaining.`
          : status?.enrolled
          ? "Enrolled but not yet verified. Enter a code from your authenticator app."
          : "Not enabled. Add an extra factor to protect your account."}
      </div>
      {enroll && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Scan with your authenticator app, then enter the 6-digit code:</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", padding: 8, background: "var(--bg)", borderRadius: 6 }}>
            {enroll.otpauth_url}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Secret (manual entry): <code>{enroll.secret}</code></div>
          <details>
            <summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Recovery codes (store these safely)</summary>
            <ul style={{ fontFamily: "monospace", fontSize: 12, marginTop: 6 }}>
              {enroll.recovery_codes.map(c => <li key={c}>{c}</li>)}
            </ul>
          </details>
          <input
            type="text" inputMode="numeric" placeholder="123 456" maxLength={10}
            value={code} onChange={e => setCode(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "inherit" }}
          />
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {!status?.enabled && !enroll && (
          <button className="btn-primary" disabled={busy} onClick={begin}>Set up 2FA</button>
        )}
        {enroll && (
          <button className="btn-primary" disabled={busy || code.length < 6} onClick={verify}>Verify</button>
        )}
        {status?.enabled && (
          <button className="btn-secondary" disabled={busy} onClick={disable}>Disable</button>
        )}
      </div>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>{msg}</div>}
    </div>
  );
}


// ── Data export + account deletion ───────────────────────────────────────
function DataAccountCard({ authFetch }: { authFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await authFetch(accountApi.exportUrl);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)/i);
      a.download = m ? m[1] : `gamgee-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Export downloaded.");
    } catch (err) {
      setMsg(`Export failed: ${(err as Error).message}`);
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    const pwd = prompt("Type your password (we'll then ask for one more confirmation):");
    if (!pwd) return;
    if (!confirm("This permanently deletes ALL your data — workouts, PRs, chat, photos. There is no undo. Continue?")) return;
    setBusy(true); setMsg(null);
    try {
      const res = await accountApi.remove(authFetch, pwd);
      if (res.status === 204) {
        setMsg("Account deleted. Reloading…");
        setTimeout(() => { localStorage.removeItem("iron_log_token"); window.location.href = "/"; }, 1500);
        return;
      }
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `${res.status}`);
    } catch (err) {
      setMsg(`Delete failed: ${(err as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Your data
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-secondary" disabled={busy} onClick={handleExport}>
          <Download size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Export everything
        </button>
        <button className="btn-secondary" style={{ color: "#ff6b6b", borderColor: "#ff6b6b" }} disabled={busy} onClick={handleDelete}>
          <Trash2 size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Delete account
        </button>
      </div>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>{msg}</div>}
    </div>
  );
}


// ── CSV import (Strong / Hevy / JEFIT) ───────────────────────────────────
function ImportCsvCard({ authFetch }: { authFetch: (u: string, o?: RequestInit) => Promise<Response> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const r = await importApi.csv(authFetch, file);
      setMsg(`Imported ${r.imported_sessions} session(s) (${r.layout} layout).`);
    } catch (err) {
      setMsg(`Import failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Import from another tracker
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
        Drop a CSV export from Strong, Hevy, or JEFIT and we'll fold it in.
      </div>
      <label className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: busy ? "wait" : "pointer" }}>
        <Upload size={14} /> Choose CSV
        <input type="file" accept=".csv,text/csv" disabled={busy} onChange={onChange} style={{ display: "none" }} />
      </label>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>{msg}</div>}
    </div>
  );
}


// ── AMOLED theme toggle ──────────────────────────────────────────────────
function AmoledToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("gamgee_amoled") === "1");

  useEffect(() => {
    if (enabled) {
      document.documentElement.setAttribute("data-theme", "amoled");
      localStorage.setItem("gamgee_amoled", "1");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("gamgee_amoled", "0");
    }
  }, [enabled]);

  return (
    <div className="profile-card" style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Moon size={14} /> AMOLED black
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          True-black backgrounds save battery on OLED screens.
        </div>
      </div>
      <button
        onClick={() => setEnabled(e => !e)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "1px solid var(--border)",
          background: enabled ? "var(--primary)" : "transparent", position: "relative",
          cursor: "pointer", transition: "background 0.15s",
        }}
        aria-pressed={enabled}
      >
        <span style={{
          position: "absolute", top: 2, left: enabled ? 22 : 2, width: 18, height: 18,
          borderRadius: "50%", background: enabled ? "#0c1014" : "var(--muted)",
          transition: "left 0.15s",
        }} />
      </button>
    </div>
  );
}
