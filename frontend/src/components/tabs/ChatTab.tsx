import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageSquarePlus, GraduationCap, Users, ArrowLeft } from "lucide-react";
import type { ChatMessage, Conversation, Buddy, TrainerLink } from "../../types";
import { fmtDate } from "../../utils";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
  activeConvId: number | null;
  setActiveConvId: (id: number | null) => void;
  currentUserId: number | null;
  buddies: Buddy[];
  trainerLinks: TrainerLink[];
}

type ContactKind = "buddy" | "coach" | "trainee";
interface Contact {
  username: string;
  name: string | null;
  primary_color: string | null;
  kind: ContactKind;
}

export default function ChatTab({
  authFetch, conversations, refreshConversations,
  activeConvId, setActiveConvId, currentUserId,
  buddies, trainerLinks,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvQuery, setNewConvQuery] = useState("");
  const [newConvErr, setNewConvErr] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const activeConv = useMemo(
    () => conversations.find(c => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // Build a deduped, sorted list of chat-able contacts: accepted buddies + accepted coaches/trainees.
  const contacts = useMemo<Contact[]>(() => {
    const map = new Map<string, Contact>();
    for (const b of buddies) {
      if (b.status !== "accepted") continue;
      map.set(b.username, {
        username: b.username,
        name: b.name,
        primary_color: b.primary_color,
        kind: "buddy",
      });
    }
    for (const l of trainerLinks) {
      if (l.status !== "accepted") continue;
      // role "trainee" = this user is the trainee; the other side is the coach
      const kind: ContactKind = l.role === "trainee" ? "coach" : "trainee";
      // Coach/trainee labelling wins over buddy if both apply
      map.set(l.other_username, {
        username: l.other_username,
        name: l.other_name,
        primary_color: l.other_primary_color,
        kind,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || a.username).localeCompare(b.name || b.username)
    );
  }, [buddies, trainerLinks]);

  const filteredContacts = useMemo(() => {
    const q = newConvQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      c.username.toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q)
    );
  }, [contacts, newConvQuery]);

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
        authFetch(`/api/chat/conversations/${activeConvId}/read`, { method: "POST" })
          .then(() => refreshConversations()).catch(() => {});
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeConvId, authFetch, refreshConversations]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!activeConvId) return;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
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

  const openConversationWith = async (username: string) => {
    if (!username.trim() || opening) return;
    setOpening(true);
    setNewConvErr(null);
    try {
      const r = await authFetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
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
      setNewConvQuery("");
    } catch {
      setNewConvErr("Network error");
    } finally {
      setOpening(false);
    }
  };

  const showList = activeConvId == null;
  const kindLabel: Record<ContactKind, string> = {
    buddy: "Buddy",
    coach: "Coach",
    trainee: "Trainee",
  };

  return (
    <div className="chat-tab tab-anim">
      <div className="chat-header">
        <h2 className="chat-title">CHAT</h2>
        <button className="btn-sec" onClick={() => setNewConvOpen(v => !v)}>
          <MessageSquarePlus size={14} /> New chat
        </button>
      </div>

      {newConvOpen && (
        <div className="card chat-newconv">
          <div className="chat-newconv-hint">
            Pick a buddy or coach below, or type any username.
          </div>
          <div className="chat-newconv-input-row">
            <input
              autoFocus
              value={newConvQuery}
              onChange={e => setNewConvQuery(e.target.value)}
              placeholder="Search by name or username…"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  // If exactly one filtered result, open them. Else use raw text.
                  if (filteredContacts.length === 1) openConversationWith(filteredContacts[0].username);
                  else openConversationWith(newConvQuery);
                }
                if (e.key === "Escape") setNewConvOpen(false);
              }}
            />
            <button
              className="btn-pri"
              onClick={() => openConversationWith(newConvQuery)}
              disabled={!newConvQuery.trim() || opening}
            >
              Open
            </button>
          </div>
          <div className="chat-suggestions">
            {filteredContacts.length === 0 && (
              <div className="chat-suggestions-empty">
                {contacts.length === 0
                  ? "No buddies or coaches yet. Add buddies from the Buddies tab, or type a username above."
                  : "No matches. Press Enter to open by username anyway."}
              </div>
            )}
            {filteredContacts.map(c => (
              <button
                key={c.username}
                className="chat-suggestion"
                onClick={() => openConversationWith(c.username)}
                disabled={opening}
              >
                <span
                  className="chat-avatar chat-avatar-sm"
                  style={{ background: c.primary_color || "var(--accent)" }}
                >
                  {(c.name || c.username).slice(0, 1).toUpperCase()}
                </span>
                <span className="chat-suggestion-main">
                  <span className="chat-suggestion-name">{c.name || c.username}</span>
                  <span className="chat-suggestion-meta">@{c.username}</span>
                </span>
                <span className={`chat-kind-tag chat-kind-${c.kind}`}>
                  {c.kind === "coach" || c.kind === "trainee"
                    ? <GraduationCap size={11} />
                    : <Users size={11} />}
                  {kindLabel[c.kind]}
                </span>
              </button>
            ))}
          </div>
          {newConvErr && <div className="chat-err">{newConvErr}</div>}
        </div>
      )}

      <div className={`chat-shell ${showList ? "chat-shell-list" : "chat-shell-thread"}`}>
        {showList ? (
          <div className="card chat-list">
            {conversations.length === 0 && (
              <div className="chat-list-empty">
                No chats yet. Tap “New chat” to message a buddy or your coach.
              </div>
            )}
            {conversations.map(c => (
              <button
                key={c.id}
                className="chat-row"
                onClick={() => setActiveConvId(c.id)}
              >
                <span
                  className="chat-avatar"
                  style={{ background: c.other_primary_color || "var(--accent)" }}
                >
                  {(c.other_name || c.other_username || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="chat-row-main">
                  <span className="chat-row-name">
                    <strong>{c.other_name || c.other_username}</strong>
                    {c.kind === "coach" && (
                      <span className="chat-row-icon" title="Coaching channel">
                        <GraduationCap size={12} />
                      </span>
                    )}
                    {c.kind === "dm" && (
                      <span className="chat-row-icon chat-row-icon-muted" title="Peer DM">
                        <Users size={12} />
                      </span>
                    )}
                  </span>
                  <span className="chat-row-preview">
                    {c.last_message_preview || <em>No messages yet</em>}
                  </span>
                </span>
                <span className="chat-row-meta">
                  {c.last_message_at > 0 && (
                    <small className="chat-row-time">
                      {fmtDate(new Date(c.last_message_at).toISOString())}
                    </small>
                  )}
                  {c.unread_count > 0 && (
                    <span className="chat-row-unread">{c.unread_count}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="card chat-thread">
            <div className="chat-thread-header">
              <button className="chat-back-btn" onClick={() => setActiveConvId(null)} aria-label="Back">
                <ArrowLeft size={16} />
              </button>
              <span
                className="chat-avatar chat-avatar-sm"
                style={{ background: activeConv?.other_primary_color || "var(--accent)" }}
              >
                {(activeConv?.other_name || activeConv?.other_username || "?").slice(0, 1).toUpperCase()}
              </span>
              <strong className="chat-thread-name">{activeConv?.other_name || activeConv?.other_username}</strong>
              {activeConv?.kind === "coach" && (
                <span className="chat-row-icon" title="Coaching channel">
                  <GraduationCap size={14} />
                </span>
              )}
            </div>
            <div ref={scrollerRef} className="chat-thread-body">
              {messages.length === 0 && (
                <div className="chat-thread-empty">Say hi.</div>
              )}
              {messages.map(m => {
                const mine = currentUserId != null && m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`chat-msg-row ${mine ? "mine" : "theirs"}`}>
                    <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                      <div className="chat-bubble-body">{m.body}</div>
                      <div className="chat-bubble-time">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              className="chat-composer"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message…"
                disabled={sending}
                className="chat-composer-input"
              />
              <button className="btn-pri chat-send-btn" type="submit" disabled={sending || !input.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
