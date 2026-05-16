import { useEffect, useState } from "react";
import { Bot, Send } from "lucide-react";
import { coachAiApi } from "../data/extraApi";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  defaultExerciseId?: string;
}

/**
 * Inline panel for asking the AI coach. Hides itself when /api/coach-ai/health
 * reports the feature isn't configured (no ANTHROPIC_API_KEY).
 */
export default function AICoachPanel({ authFetch, defaultExerciseId }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [q,          setQ]          = useState("");
  const [exId,       setExId]       = useState(defaultExerciseId ?? "");
  const [answer,     setAnswer]     = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    coachAiApi.health(authFetch).then(h => {
      if (cancelled) return;
      setConfigured(h.configured);
    }).catch(() => setConfigured(false));
    return () => { cancelled = true; };
  }, [authFetch]);

  if (configured === null) return null;
  if (!configured) {
    return (
      <div className="ai-coach-card">
        <div className="ai-coach-hdr"><Bot size={14} /> AI coach</div>
        <div className="ai-coach-disabled">
          The AI coach isn't enabled on this server. The administrator can
          set <code>ANTHROPIC_API_KEY</code> and install <code>anthropic</code>
          to turn it on.
        </div>
      </div>
    );
  }

  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await coachAiApi.ask(authFetch, q.trim(), exId || undefined);
      setAnswer(r.answer);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-coach-card">
      <div className="ai-coach-hdr"><Bot size={14} /> Ask the coach</div>
      {defaultExerciseId === undefined && (
        <input
          className="ai-coach-input"
          placeholder='Exercise id (e.g. "bench", optional)'
          value={exId}
          onChange={e => setExId(e.target.value)}
        />
      )}
      <textarea
        className="ai-coach-input ai-coach-textarea"
        placeholder="What's your question? Plateau? Form? Programming?"
        rows={3}
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <button
        className="btn-primary"
        disabled={busy || !q.trim()}
        onClick={ask}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Send size={14} /> {busy ? "Thinking…" : "Ask"}
      </button>
      {err && <div className="ai-coach-err">{err}</div>}
      {answer && (
        <div className="ai-coach-answer">
          {answer.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </div>
  );
}
