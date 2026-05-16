import { useState } from "react";
import { Save, X } from "lucide-react";
import type { WorkoutSession } from "../../types";
import { templatesApi } from "../../data/extraApi";

interface Props {
  session: WorkoutSession;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

/** Tiny button + modal to save the just-finished session as a reusable
 *  template. Renders on WorkoutComplete. */
export default function SaveTemplateButton({ session, authFetch }: Props) {
  const [open,    setOpen]    = useState(false);
  const [name,    setName]    = useState(session.focus ? `${session.focus} workout` : "My workout");
  const [busy,    setBusy]    = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [err,     setErr]     = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const tpl = await templatesApi.create(authFetch, {
        name: name.trim(),
        focus: session.focus ?? null,
        exercises: session.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false })),
        })),
      });
      setSavedAs(tpl.name);
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  if (savedAs) {
    return (
      <button className="btn-secondary" disabled style={{ opacity: 0.7 }}>
        <Save size={14} /> Saved as "{savedAs}"
      </button>
    );
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Save size={14} /> Save as template
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>Save as template</h3>
              <button className="btn-icon" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Template name"
              style={{
                width: "100%", padding: "10px 12px", boxSizing: "border-box",
                background: "var(--bg)", color: "inherit",
                border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, marginBottom: 8,
              }}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              {session.exercises.length} exercise{session.exercises.length === 1 ? "" : "s"} will be saved.
            </div>
            {err && <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={busy || !name.trim()}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
