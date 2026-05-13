import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageSquarePlus, GraduationCap, Users, ArrowLeft } from "lucide-react";
import type { ChatMessage, Conversation } from "../../types";
import { fmtDate } from "../../utils";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
  activeConvId: number | null;
  setActiveConvId: (id: number | null) => void;
  currentUserId: number | null;
}

export default function ChatTab({
  authFetch, conversations, refreshConversations,
  activeConvId, setActiveConvId, currentUserId,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvName, setNewConvName] = useState("");
  const [newConvErr, setNewConvErr] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const activeConv = useMemo(
    () => conversations.find(c => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // Load thread when activeConv changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await authFetch(`/api/chat/conversations/${activeConvId}/messages?limit=80`);
        if (!r.ok) return;
        const data: ChatMessage[] = await r.json();
        if (!cancelled) setMessages(data);
        // Mark read after loading
        authFetch(`/api/chat/conversations/${activeConvId}/read`, { method: "POST" })
          .then(() => refreshConversations()).catch(() => {});
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeConvId, authFetch, refreshConversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Listen for inbound messages — refetch when the conversation list changes
  // (the parent updates conversations on every chat SSE event).
  useEffect(() => {
    if (!activeConvId) return;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    // Refetch messages whenever last_message_at moves forward beyond the last
    // message we know about.
    const lastKnown = messages[messages.length - 1]?.created_at ?? 0;
    if (conv.last_message_at > lastKnown) {
      authFetch(`/api/chat/conversations/${activeConvId}/messages?limit=80`)
        .then(r => r.ok ? r.json() : [])
        .then((data: ChatMessage[]) => setMessages(data))
        .then(() => authFetch(`/api/chat/conversations/${activeConvId}/read`, { method: "POST" }))
        .then(() => refreshConversations())
        .catch(() => {});
    }
  }, [conversations, activeConvId, messages, authFetch, refreshConversations]);

  const sendMessage = async () => {
    if (!activeConvId || !input.trim() || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    try {
      const r = await authFetch(`/api/chat/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (r.ok) {
        const msg: ChatMessage = await r.json();
        setMessages(prev => [...prev, msg]);
        refreshConversations();
      } else {
        setInput(body);
      }
    } catch {
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  const openConversation = async () => {
    setNewConvErr(null);
    const username = newConvName.trim();
    if (!username) return;
    try {
      const r = await authFetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setNewConvErr(err.detail || "Couldn't open chat with that user");
        return;
      }
      const conv: Conversation = await r.json();
      await refreshConversations();
      setActiveConvId(conv.id);
      setNewConvOpen(false);
      setNewConvName("");
    } catch {
      setNewConvErr("Network error");
    }
  };

  // Layout: split list/thread. On mobile, when activeConvId is set, show only thread.
  const showList = activeConvId == null;

  return (
    <div className="chat-tab tab-anim" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div className="chat-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 1 }}>CHAT</h2>
        <button className="btn-sec" onClick={() => setNewConvOpen(true)}>
          <MessageSquarePlus size={14} /> New chat
        </button>
      </div>

      {newConvOpen && (
        <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Open a chat with a buddy or trainer/trainee by their username.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={newConvName}
              onChange={e => setNewConvName(e.target.value)}
              placeholder="username"
              onKeyDown={e => { if (e.key === "Enter") openConversation(); }}
              style={{ flex: 1 }}
            />
            <button className="btn-pri" onClick={openConversation} disabled={!newConvName.trim()}>Open</button>
            <button className="btn-sec" onClick={() => { setNewConvOpen(false); setNewConvErr(null); }}>Cancel</button>
          </div>
          {newConvErr && <div style={{ color: "var(--red)", fontSize: 12 }}>{newConvErr}</div>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: showList ? "1fr" : "minmax(0, 1fr)", gap: 12, minHeight: 360 }}>
        {showList ? (
          <div className="card" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {conversations.length === 0 && (
              <div style={{ padding: 16, color: "var(--muted)", textAlign: "center" }}>
                No chats yet. Tap “New chat” to message a buddy or your coach.
              </div>
            )}
            {conversations.map(c => (
              <button
                key={c.id}
                className="chat-row"
                onClick={() => setActiveConvId(c.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: "transparent", border: "1px solid var(--ad)", borderRadius: 10,
                  textAlign: "left", cursor: "pointer", color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: c.other_primary_color || "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#000", fontWeight: 700,
                  }}
                >
                  {(c.other_name || c.other_username || "?").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.other_name || c.other_username}
                    </strong>
                    {c.kind === "coach" && (
                      <span title="Coaching channel" style={{ color: "var(--accent)" }}>
                        <GraduationCap size={12} />
                      </span>
                    )}
                    {c.kind === "dm" && (
                      <span title="Peer DM" style={{ color: "var(--muted)" }}>
                        <Users size={12} />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.last_message_preview || <em>No messages yet</em>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {c.last_message_at > 0 && (
                    <small style={{ color: "var(--muted)" }}>{fmtDate(new Date(c.last_message_at).toISOString())}</small>
                  )}
                  {c.unread_count > 0 && (
                    <span className="tab-badge" style={{ background: "var(--accent)", color: "#000" }}>
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 480 }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--ad)", display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn-sec" onClick={() => setActiveConvId(null)} aria-label="Back">
                <ArrowLeft size={14} />
              </button>
              <div
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: activeConv?.other_primary_color || "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#000", fontWeight: 700, fontSize: 12,
                }}
              >
                {(activeConv?.other_name || activeConv?.other_username || "?").slice(0, 1).toUpperCase()}
              </div>
              <strong>{activeConv?.other_name || activeConv?.other_username}</strong>
              {activeConv?.kind === "coach" && (
                <span title="Coaching channel" style={{ color: "var(--accent)" }}>
                  <GraduationCap size={14} />
                </span>
              )}
            </div>
            <div
              ref={scrollerRef}
              style={{ flex: 1, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, minHeight: 320 }}
            >
              {messages.length === 0 && (
                <div style={{ color: "var(--muted)", textAlign: "center", padding: 16 }}>
                  Say hi.
                </div>
              )}
              {messages.map(m => {
                const mine = currentUserId != null && m.sender_id === currentUserId;
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: mine ? "var(--accent)" : "var(--ad)",
                        color: mine ? "#000" : "inherit",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{m.body}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              style={{ borderTop: "1px solid var(--ad)", padding: 10, display: "flex", gap: 8 }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message…"
                style={{ flex: 1 }}
                disabled={sending}
              />
              <button className="btn-pri" type="submit" disabled={sending || !input.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
