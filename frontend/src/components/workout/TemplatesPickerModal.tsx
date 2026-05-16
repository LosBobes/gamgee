import { useEffect, useState } from "react";
import { X, Trash2, Calendar } from "lucide-react";
import type { WorkoutTemplate } from "../../types";
import { templatesApi } from "../../data/extraApi";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onPick: (tpl: WorkoutTemplate) => void;
}

export default function TemplatesPickerModal({ authFetch, onClose, onPick }: Props) {
  const [items, setItems] = useState<WorkoutTemplate[] | null>(null);
  const [err,   setErr]   = useState<string | null>(null);

  const refresh = () => {
    templatesApi.list(authFetch).then(setItems).catch(e => setErr((e as Error).message));
  };
  useEffect(refresh, [authFetch]);

  const remove = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    await templatesApi.remove(authFetch, id);
    refresh();
  };

  const apply = async (tpl: WorkoutTemplate) => {
    try { await templatesApi.markUsed(authFetch, tpl.id); } catch { /* best-effort */ }
    onPick(tpl);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-hdr">
          <h3>Start from template</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {items === null ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px 4px" }}>
            No templates yet. Save one from the workout-complete screen.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
            {items.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: 10, borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--bg)",
              }}>
                <button
                  onClick={() => apply(t)}
                  style={{
                    flex: 1, textAlign: "left", background: "transparent",
                    border: "none", color: "inherit", cursor: "pointer", padding: 0,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                    {t.exercises.length} exercise{t.exercises.length === 1 ? "" : "s"}
                    {t.focus && <span>· focus: {t.focus}</span>}
                    {t.last_used_at && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Calendar size={10} />
                        {new Date(t.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  className="btn-icon"
                  onClick={() => remove(t.id)}
                  aria-label="Delete template"
                  style={{ color: "#ff6b6b" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {err && <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>{err}</div>}
      </div>
    </div>
  );
}
