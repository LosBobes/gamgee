import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";

export type ChatEvent =
  | { type: "message"; data: ChatMessage }
  | { type: "conversation"; data: { conversation_id: number } }
  | { type: "read"; data: { conversation_id: number; user_id: number } }
  | { type: "ping"; data: Record<string, unknown> };

/**
 * Opens a WebSocket to ``/api/chat/ws`` while ``token`` is set and dispatches
 * incoming chat events to ``onEvent``. Reconnects with capped exponential
 * backoff if the socket drops; tears down cleanly on unmount/logout.
 */
export function useChatSocket(token: string | null, onEvent: (e: ChatEvent) => void): void {
  const handlerRef = useRef(onEvent);
  useEffect(() => { handlerRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/chat/ws?token=${encodeURIComponent(token)}`;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(url);
      socket.onopen = () => { attempt = 0; };
      socket.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as ChatEvent;
          if (parsed && typeof parsed.type === "string") handlerRef.current(parsed);
        } catch {
          /* malformed payload — ignore */
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        // Cap backoff at 30s; resets to 0 on a successful open.
        const delay = Math.min(30_000, 500 * 2 ** Math.min(attempt, 6));
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      socket.onerror = () => { /* surfaced via onclose */ };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
    };
  }, [token]);
}
