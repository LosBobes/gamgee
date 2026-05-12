import { useState } from "react";
import { MessageSquare, Send, Bug, Lightbulb, MessageCircle } from "lucide-react";

type FeedbackKind = "bug" | "feature" | "general";
type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

const KIND_OPTIONS: { key: FeedbackKind; label: string; Icon: typeof Bug }[] = [
  { key: "bug",     label: "Bug",     Icon: Bug          },
  { key: "feature", label: "Feature", Icon: Lightbulb    },
  { key: "general", label: "General", Icon: MessageCircle },
];

const MAX_LEN = 5000;

export default function FeedbackModal({ authFetch, onClose }: {
  authFetch: AuthFetch;
  onClose: () => void;
}) {
  const [kind,    setKind]    = useState<FeedbackKind>("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [err,     setErr]     = useState("");
  const [done,    setDone]    = useState(false);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) { setErr("Please enter a message."); return; }
    setSending(true); setErr("");
    try {
      const r = await authFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: trimmed }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setErr(body.detail ?? "Failed to submit. Please try again.");
        return;
      }
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card fb-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <MessageSquare size={16} /> Send Feedback
        </div>
        {done ? (
          <>
            <p className="fb-thanks">Thanks! Your feedback has been sent to the team.</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-sub">
              Spotted a bug, have a feature idea, or general thoughts? Let us know.
            </div>
            <div className="fb-kind-row">
              {KIND_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`fb-kind-btn${kind === key ? " active" : ""}`}
                  onClick={() => setKind(key)}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <textarea
              className="field-input fb-textarea"
              placeholder="Describe your feedback in as much detail as you'd like…"
              value={message}
              maxLength={MAX_LEN}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              autoFocus
            />
            <div className="fb-charcount">{message.length} / {MAX_LEN}</div>
            {err && <p className="auth-err">{err}</p>}
            <div className="modal-actions">
              <button className="auth-toggle" onClick={onClose} disabled={sending}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={sending || !message.trim()}>
                <Send size={14} /> {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
