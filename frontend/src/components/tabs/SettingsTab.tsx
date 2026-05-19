import { useState, useEffect } from "react";
import { Bell, BellOff, Timer } from "lucide-react";
import { useTxt, type ToneMode } from "../../context/ToneContext";
import { useOnboarding } from "../../context/OnboardingContext";
import {
  pushSupported, fetchPushPublicKey, getExistingSubscription,
  subscribePush, unsubscribePush,
} from "../../push";
import type { RestPrefs, WizardTransitionStyle } from "../../types";
import { DEFAULT_REST_PREFS } from "../../types";
import { readCountsBar, writeCountsBar, type CountsBar } from "../../data/barbell";
import { APP_VERSION } from "../../version";

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
  restPrefs:       RestPrefs;
  onRestPrefsChange: (next: Partial<RestPrefs>) => void;
  wizardTransition:         WizardTransitionStyle;
  onWizardTransitionChange: (next: WizardTransitionStyle) => void;
  reducedMotion:            boolean;
  onReducedMotionChange:    (next: boolean) => void;
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

function WizardTransitionCard({
  value,
  onChange,
}: {
  value: WizardTransitionStyle;
  onChange: (next: WizardTransitionStyle) => void;
}) {
  const t = useTxt();
  const options: Array<{ id: WizardTransitionStyle; label: string }> = [
    { id: "none",       label: "None"       },
    { id: "earthquake", label: "Earthquake" },
  ];
  const descriptions: Record<WizardTransitionStyle, string> = {
    earthquake: t("Page shakes and a shockwave radiates from your tap.",
                  "Whole page shakes. Shockwave rolls out from your tap.",
                  "Page shakes, bestie. Shockwave rolls out from your tap."),
    none:       t("No effect — wizard steps switch instantly.",
                  "No effect. Steps switch instantly.",
                  "No effect, bestie — steps switch instantly."),
  };
  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Wizard transition
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map(({ id, label }) => {
          const active = value === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
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
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.4 }}>
        {descriptions[value]}
      </div>
    </div>
  );
}

function CountsBarCard() {
  const t = useTxt();
  const [value, setValue] = useState<CountsBar | null>(() => readCountsBar());

  const update = (next: CountsBar) => {
    writeCountsBar(next);
    setValue(next);
  };

  const options: Array<{ id: CountsBar; label: string }> = [
    { id: "yes", label: t("Bar counts",   "Bar counts",   "Bar counts")   },
    { id: "no",  label: t("Just plates",  "Just plates",  "Just plates")  },
    { id: "off", label: t("Off",          "Off",          "Off")          },
  ];

  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {t("Bar weight (joke)", "Bar weight (joke)", "Bar weight (joke)")}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map(({ id, label }) => {
          const active = value === id;
          return (
            <button
              key={id}
              onClick={() => update(id)}
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
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.4 }}>
        {value === "yes" && t(
          "Bar is included in the weight you enter. We won't add anything.",
          "Bar's in. We won't touch your numbers.",
          "Bar's in, bestie. We won't touch your numbers.",
        )}
        {value === "no" && t(
          "You enter plates only. Barbell exercise cards show a \"+20 kg bar\" hint.",
          "Plates only, bro. We hint the +20 kg bar on barbell lifts.",
          "Plates only, bestie. We hint the +20 kg bar on barbell lifts.",
        )}
        {value === "off" && t(
          "Joke disabled. No hints anywhere.",
          "Joke's off. No hints anywhere.",
          "Joke's off, bestie. No hints anywhere.",
        )}
        {value === null && t(
          "We haven't asked yet — pick a stance to mirror it on barbell cards, or turn the joke off.",
          "Haven't asked yet — pick a side or turn it off.",
          "Haven't asked yet, bestie — pick a side or turn it off.",
        )}
      </div>
    </div>
  );
}

function ReducedMotionCard({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = useTxt();
  return (
    <div className="profile-card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {t("Reduce motion", "Reduce motion", "Reduce motion")}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>
            {t(
              "Disable wizard transitions, back-gesture sweeps, and other decorative animations.",
              "Kill the shake, sweep, and other decorative animations.",
              "Kill the shake, sweep, and other decorative animations, bestie.",
            )}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={value ? "btn-primary" : "auth-toggle"}
          style={{ whiteSpace: "nowrap" }}
        >
          {value ? "On" : "Off"}
        </button>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }} role="group" aria-label="Notification types">
        {NOTIF_ROWS.map(({ key, label, hint }) => {
          const on = prefs?.[key] ?? true;
          const loading = busy === key;
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(key)}
              disabled={prefs === null || loading}
              className={`pref-toggle${on ? " on" : ""}`}
            >
              <span className="pref-radio" aria-hidden="true" />
              <span className="pref-toggle-body">
                <span className="pref-toggle-label">{label}</span>
                <span className="pref-toggle-hint">{hint}</span>
              </span>
              {loading && <span className="pref-toggle-busy">…</span>}
            </button>
          );
        })}
      </div>
      {err && <p className="auth-err" style={{ marginTop: 8, marginBottom: 0 }}>{err}</p>}
    </div>
  );
}

function RestTimerCard({ prefs, onChange }: { prefs: RestPrefs; onChange: (next: Partial<RestPrefs>) => void }) {
  const t = useTxt();
  const [shortVal,  setShortVal]  = useState(String(prefs.short));
  const [mediumVal, setMediumVal] = useState(String(prefs.medium));
  const [longVal,   setLongVal]   = useState(String(prefs.long));
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setShortVal(String(prefs.short)); }, [prefs.short]);
  useEffect(() => { setMediumVal(String(prefs.medium)); }, [prefs.medium]);
  useEffect(() => { setLongVal(String(prefs.long)); }, [prefs.long]);

  const parseSec = (v: string): number | null => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 5 || n > 3600) return null;
    return Math.round(n);
  };

  const commit = (field: keyof RestPrefs, raw: string) => {
    const sec = parseSec(raw);
    if (sec === null) {
      setErr("Rest must be between 5 and 3600 seconds.");
      return;
    }
    if (sec === prefs[field]) return;
    setErr(null);
    onChange({ [field]: sec });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const resetDefaults = () => {
    onChange(DEFAULT_REST_PREFS);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const row = (
    label: string,
    sub: string,
    val: string,
    setVal: (v: string) => void,
    field: keyof RestPrefs,
  ) => (
    <div className="rest-pref-row">
      <div className="rest-pref-label">
        <div className="rest-pref-title">{label}</div>
        <div className="rest-pref-sub">{sub}</div>
      </div>
      <div className="rest-pref-input">
        <input
          type="number" min={5} max={3600} step={5}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => commit(field, val)}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          aria-label={`${label} rest seconds`}
        />
        <span>sec</span>
      </div>
    </div>
  );

  return (
    <div className="profile-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Timer size={14} style={{ color: "var(--primary)" }} />
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {t("Rest timer presets", "Rest timer presets", "Rest timer presets")}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.45 }}>
        {t(
          "Set how long each preset waits before the bar fills. Custom rest is always available on the timer itself.",
          "Pick your default rest windows. You can still punch in a custom rest mid-workout.",
          "Pick your default rest windows, bestie. Custom rest is still one tap away during a workout."
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {row("Light", "Isolation / accessory", shortVal,  setShortVal,  "short")}
        {row("Medium", "Default for most sets", mediumVal, setMediumVal, "medium")}
        {row("Long", "Heavy compounds / max effort", longVal, setLongVal, "long")}
      </div>
      {err && <p className="auth-err" style={{ marginTop: 8, marginBottom: 0 }}>{err}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <button type="button" className="auth-toggle" onClick={resetDefaults}>Reset to defaults</button>
        {saved && <span style={{ color: "var(--green)", fontSize: 11 }}>Saved.</span>}
      </div>
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
  toneMode, onToneChange, restPrefs, onRestPrefsChange,
  wizardTransition, onWizardTransitionChange,
  reducedMotion, onReducedMotionChange,
  authFetch,
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
      <WizardTransitionCard value={wizardTransition} onChange={onWizardTransitionChange} />
      <ReducedMotionCard value={reducedMotion} onChange={onReducedMotionChange} />

      <div className="profile-section">{t("Workout", "Workout")}</div>
      <CountsBarCard />
      <RestTimerCard prefs={restPrefs} onChange={onRestPrefsChange} />

      <div className="profile-section">{t("Notifications", "Notifications")}</div>
      <PushToggleCard authFetch={authFetch} />
      <NotificationTypesCard authFetch={authFetch} />

      <div className="profile-section">{t("Guidance", "Guidance", "Guidance")}</div>
      <OnboardingCard />

      <div className="profile-section">{t("Account", "Account")}</div>
      <ChangePasswordCard token={token} />

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
