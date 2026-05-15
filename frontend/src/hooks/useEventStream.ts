import { useEffect, useRef } from "react";

export type ServerEvent =
  | { type: "notification"; data: { kind?: string } }
  | { type: "buddy"; data: Record<string, unknown> }
  | { type: "live"; data: { session_id?: string } }
  | { type: "trainer"; data: Record<string, unknown> };

/**
 * Subscribes to ``/api/events/stream`` via Server-Sent Events while ``token``
 * is set. Each message arrives as a JSON ``ServerEvent``; ``onEvent`` decides
 * what to refresh. EventSource handles automatic reconnection, so we don't
 * need our own retry loop — we just rebuild the stream when the token changes
 * and tear it down on unmount/logout.
 */
export function useEventStream(token: string | null, onEvent: (e: ServerEvent) => void): void {
  const handlerRef = useRef(onEvent);
  useEffect(() => { handlerRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!token) return;
    const url = `/api/events/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as ServerEvent;
        if (parsed && typeof parsed.type === "string") handlerRef.current(parsed);
      } catch {
        /* malformed payload — ignore */
      }
    };
    // EventSource auto-reconnects on transient errors; nothing for us to do.
    es.onerror = () => { /* noop */ };

    return () => es.close();
  }, [token]);
}
